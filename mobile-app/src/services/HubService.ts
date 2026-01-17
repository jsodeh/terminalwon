// TerminalWON Hub Service for Mobile App
import { getHubUrl, config, debugLog } from '../constants/config';
import { useTerminalStore } from '../store/terminalStore';
import { useActivityStore } from '../store/activityStore';

export interface HubMessage {
  type: string;
  payload: any;
  timestamp: Date;
  messageId: string;
}

class HubService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private messageId = 0;

  constructor() {
    this.connect();
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    debugLog('Connecting to hub...', getHubUrl());

    try {
      this.ws = new WebSocket(getHubUrl());

      this.ws.onopen = () => {
        debugLog('Connected to TerminalWON Hub');
        this.isConnecting = false;
        useTerminalStore.getState().setConnected(true);
        
        // Send authentication
        this.sendMessage('auth', {
          tool: 'mobile-app',
          platform: 'react-native',
          apiKey: config.apiKey
        });

        // Request initial terminal list
        setTimeout(() => {
          this.requestTerminalList();
        }, 1000);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: HubMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          debugLog('Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        debugLog('Disconnected from hub');
        this.isConnecting = false;
        useTerminalStore.getState().setConnected(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        debugLog('WebSocket error:', error);
        this.isConnecting = false;
        useTerminalStore.getState().setConnected(false);
      };

    } catch (error) {
      debugLog('Connection failed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: HubMessage): void {
    debugLog('Received message:', message.type);

    switch (message.type) {
      case 'welcome':
        debugLog('Welcome message received');
        break;

      case 'auth.success':
        debugLog('Authentication successful');
        break;

      case 'message':
        if (message.payload.terminals) {
          this.handleTerminalList(message.payload.terminals);
        }
        break;

      case 'terminal.register':
        this.handleTerminalRegistered(message.payload);
        break;

      case 'terminal.output':
        this.handleTerminalOutput(message.payload);
        break;

      case 'terminal.execute':
        this.handleTerminalCommand(message.payload);
        break;

      default:
        debugLog('Unknown message type:', message.type);
    }
  }

  private handleTerminalList(terminals: any[]): void {
    debugLog('Terminal list received:', terminals.length);
    
    const formattedTerminals = terminals.map(terminal => ({
      id: terminal.id,
      sessionId: terminal.id,
      name: terminal.name || 'Unknown Terminal',
      cwd: terminal.cwd || '/',
      tool: (terminal.tool === 'kiro' || terminal.tool === 'cli') ? 'other' : terminal.tool as 'vscode' | 'cursor' | 'claude-code' | 'other',
      status: terminal.status === 'error' ? 'error' : terminal.status === 'idle' ? 'idle' : 'active' as 'active' | 'idle' | 'waiting-input' | 'error' | 'closed',
      createdAt: new Date(terminal.registeredAt || Date.now()),
      lastActivity: new Date(terminal.lastActivity || Date.now()),
      userId: 'remote-user'
    }));

    useTerminalStore.getState().setTerminals(formattedTerminals);
  }

  private handleTerminalRegistered(payload: any): void {
    debugLog('New terminal registered:', payload.name);
    
    const terminal = {
      id: payload.id,
      sessionId: payload.id,
      name: payload.name || 'New Terminal',
      cwd: payload.cwd || '/',
      tool: (payload.tool === 'kiro' || payload.tool === 'cli') ? 'other' : payload.tool as 'vscode' | 'cursor' | 'claude-code' | 'other',
      status: 'active' as const,
      createdAt: new Date(),
      lastActivity: new Date(),
      userId: 'remote-user'
    };

    useTerminalStore.getState().addTerminal(terminal);
    
    // Add to activity feed
    useActivityStore.getState().addActivity({
      id: `activity-${Date.now()}`,
      type: 'team_activity',
      title: 'New Terminal Connected',
      description: `${terminal.name} from ${terminal.tool}`,
      timestamp: new Date(),
      user: {
        id: 'remote-user',
        name: 'Remote User',
        email: 'user@example.com',
        avatar: 'https://via.placeholder.com/40',
        isOnline: true
      },
      terminal: terminal,
      status: 'success'
    });
  }

  private handleTerminalOutput(payload: any): void {
    debugLog('Terminal output received:', payload.terminalId);
    
    useTerminalStore.getState().addTerminalOutput(payload.terminalId, {
      id: `output-${Date.now()}`,
      terminalId: payload.terminalId,
      content: payload.content || payload.output || '',
      timestamp: new Date(payload.timestamp || Date.now()),
      type: payload.type || 'stdout'
    });
  }

  private handleTerminalCommand(payload: any): void {
    debugLog('Terminal command executed:', payload.command);
    
    useActivityStore.getState().addActivity({
      id: `activity-${Date.now()}`,
      type: 'command',
      title: 'Command Executed',
      description: payload.command,
      timestamp: new Date(),
      user: {
        id: 'remote-user',
        name: 'Remote User',
        email: 'user@example.com',
        avatar: 'https://via.placeholder.com/40',
        isOnline: true
      },
      terminal: {
        id: payload.terminalId,
        sessionId: payload.terminalId,
        name: payload.terminalName || 'Terminal',
        cwd: '/',
        tool: 'other' as const,
        status: 'active' as const,
        createdAt: new Date(),
        lastActivity: new Date(),
        userId: 'remote-user'
      },
      status: 'success'
    });
  }

  private sendMessage(type: string, payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      debugLog('Cannot send message - not connected');
      return;
    }

    const message: HubMessage = {
      type,
      payload,
      timestamp: new Date(),
      messageId: `mobile-${++this.messageId}-${Date.now()}`
    };

    this.ws.send(JSON.stringify(message));
    debugLog('Sent message:', type);
  }

  public requestTerminalList(): void {
    this.sendMessage('terminals.list', {
      messageId: `list-${Date.now()}`
    });
  }

  public executeCommand(terminalId: string, command: string): void {
    this.sendMessage('terminal.execute', {
      terminalId,
      command,
      timestamp: new Date()
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      debugLog('Attempting to reconnect...');
      this.connect();
    }, config.reconnectInterval);
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    useTerminalStore.getState().setConnected(false);
  }

  public get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const hubService = new HubService();
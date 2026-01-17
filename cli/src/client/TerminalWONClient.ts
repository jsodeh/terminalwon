/**
 * TerminalWON Client
 * 
 * WebSocket client for connecting to the TerminalWON hub.
 * Used for listing terminals and executing remote commands.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface Terminal {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'closed';
  tool: string;
  cwd?: string;
  streaming?: boolean;
  projectName?: string;
  lastActivity?: string;
  createdAt?: string;
}

export interface WSMessage {
  type: string;
  payload: any;
  timestamp: Date;
  messageId: string;
}

export class TerminalWONClient extends EventEmitter {
  private ws?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private _isConnected = false;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private messageCounter = 0;

  constructor(
    public readonly hubUrl: string,
    private readonly apiKey: string
  ) {
    super();
  }

  /**
   * Connect to the hub
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.hubUrl);

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this._isConnected = true;
          
          // Authenticate
          this.sendMessage('auth', {
            tool: 'terminalwon-cli',
            platform: process.platform,
            apiKey: this.apiKey
          });
          
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: WSMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            // Ignore parse errors
          }
        });

        this.ws.on('close', () => {
          this._isConnected = false;
          this.emit('disconnected');
        });

        this.ws.on('error', (error) => {
          if (!this._isConnected) {
            clearTimeout(timeout);
            reject(error);
          }
          this.emit('error', error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from hub
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    // Clear pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Disconnected'));
    }
    this.pendingRequests.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this._isConnected = false;
  }

  /**
   * Send message to hub
   */
  sendMessage(type: string, payload: any): string {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to hub');
    }

    const messageId = `cli-${++this.messageCounter}-${Date.now()}`;
    
    const message: WSMessage = {
      type,
      payload: { ...payload, messageId },
      timestamp: new Date(),
      messageId
    };

    this.ws.send(JSON.stringify(message));
    return messageId;
  }

  /**
   * Send message and wait for response
   */
  private async sendAndWait<T>(type: string, payload: any, timeoutMs = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const messageId = this.sendMessage(type, payload);
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error('Request timeout'));
      }, timeoutMs);

      this.pendingRequests.set(messageId, { resolve, reject, timeout });
    });
  }

  /**
   * Get list of terminals
   */
  async getTerminals(): Promise<Terminal[]> {
    const messageId = `list-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('terminals', handler);
        reject(new Error('Request timeout'));
      }, 5000);

      const handler = (terminals: Terminal[]) => {
        clearTimeout(timeout);
        resolve(terminals);
      };

      this.once('terminals', handler);
      this.sendMessage('terminals.list', { messageId });
    });
  }

  /**
   * Execute command on remote terminal
   */
  async executeCommand(terminalId: string, command: string): Promise<void> {
    this.sendMessage('terminal.execute', {
      terminalId,
      command,
      timestamp: new Date()
    });
  }

  /**
   * Send input to remote terminal (without newline)
   */
  async sendInput(terminalId: string, input: string): Promise<void> {
    this.sendMessage('terminal.input', {
      terminalId,
      input,
      timestamp: new Date()
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WSMessage): void {
    this.emit('message', message);

    switch (message.type) {
      case 'message':
        // Response to terminals.list
        if (message.payload?.terminals) {
          this.emit('terminals', message.payload.terminals);
        }
        break;

      case 'terminal.output':
        this.emit('terminalOutput', message.payload);
        break;

      case 'terminal.execute':
        this.emit('executeCommand', message.payload);
        break;

      case 'terminal.input':
        this.emit('terminalInput', message.payload);
        break;

      case 'terminal.closed':
        this.emit('terminalClosed', message.payload);
        break;

      case 'auth.success':
        this.emit('authenticated');
        break;

      case 'welcome':
        // Hub welcome
        break;
    }

    // Check for pending request responses
    const requestId = message.payload?.messageId || message.messageId;
    if (requestId && this.pendingRequests.has(requestId)) {
      const request = this.pendingRequests.get(requestId)!;
      clearTimeout(request.timeout);
      this.pendingRequests.delete(requestId);
      request.resolve(message.payload);
    }
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this._isConnected;
  }
}

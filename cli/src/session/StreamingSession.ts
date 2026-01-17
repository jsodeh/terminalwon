/**
 * Streaming Session
 * 
 * Manages the connection between a PTY session and the TerminalWON hub.
 * Handles bidirectional streaming: local output → hub, hub commands → local.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { PTYSession, PTYSessionInfo } from '../pty/PTYSession';

export interface StreamingSessionOptions {
  hubUrl: string;
  apiKey?: string;
  name?: string;
  cwd?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export interface HubMessage {
  type: string;
  payload: any;
  timestamp: Date;
  messageId: string;
}

export class StreamingSession extends EventEmitter {
  private pty: PTYSession;
  private ws: WebSocket | null = null;
  private _isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageId = 0;
  private options: Required<StreamingSessionOptions>;

  constructor(options: StreamingSessionOptions) {
    super();
    
    this.options = {
      hubUrl: options.hubUrl,
      apiKey: options.apiKey || 'cli-session',
      name: options.name || '',
      cwd: options.cwd || process.cwd(),
      reconnect: options.reconnect !== false,
      reconnectInterval: options.reconnectInterval || 3000
    };

    this.pty = new PTYSession({
      name: this.options.name,
      cwd: this.options.cwd
    });

    this.setupPTYHandlers();
  }

  /**
   * Start the streaming session
   */
  async start(): Promise<PTYSessionInfo> {
    // Connect to hub first
    await this.connectToHub();
    
    // Start PTY session
    await this.pty.start();
    
    // Register terminal with hub
    this.registerWithHub();
    
    return this.pty.info;
  }

  /**
   * Connect to the TerminalWON hub
   */
  private async connectToHub(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.hubUrl);

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this._isConnected = true;
          
          // Authenticate
          this.sendToHub('auth', {
            tool: 'terminalwon-cli',
            platform: process.platform,
            version: '2.0.0',
            apiKey: this.options.apiKey
          });
          
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: HubMessage = JSON.parse(data.toString());
            this.handleHubMessage(message);
          } catch (e) {
            // Ignore parse errors
          }
        });

        this.ws.on('close', () => {
          this._isConnected = false;
          this.emit('disconnected');
          
          if (this.options.reconnect && this.pty.isRunning) {
            this.scheduleReconnect();
          }
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
   * Register terminal with hub
   */
  private registerWithHub(): void {
    const info = this.pty.info;
    
    this.sendToHub('terminal.register', {
      id: info.id,
      name: info.name,
      cwd: info.cwd,
      tool: 'terminalwon-cli',
      status: 'active',
      streaming: true,
      pid: info.pid,
      shell: info.shell,
      cols: info.cols,
      rows: info.rows,
      projectName: info.projectName,
      createdAt: info.createdAt
    });

    // Subscribe to commands for this terminal
    this.sendToHub('terminal.subscribe', {
      terminalId: info.id
    });
  }

  /**
   * Setup PTY event handlers
   */
  private setupPTYHandlers(): void {
    // Stream output to hub
    this.pty.on('output', (data: string) => {
      if (this._isConnected) {
        this.sendToHub('terminal.output', {
          terminalId: this.pty.info.id,
          content: data,
          timestamp: new Date()
        });
      }
    });

    // Handle PTY exit
    this.pty.on('exit', ({ exitCode, signal }) => {
      this.sendToHub('terminal.closed', {
        terminalId: this.pty.info.id,
        exitCode,
        signal
      });
      this.emit('exit', { exitCode, signal });
    });

    // Handle resize
    this.pty.on('resize', ({ cols, rows }) => {
      this.sendToHub('terminal.resize', {
        terminalId: this.pty.info.id,
        cols,
        rows
      });
    });
  }

  /**
   * Handle messages from hub
   */
  private handleHubMessage(message: HubMessage): void {
    switch (message.type) {
      case 'terminal.input':
      case 'terminal.execute':
        // Remote input/command - write to PTY
        if (message.payload.terminalId === this.pty.info.id) {
          const input = message.payload.input || message.payload.command;
          if (input) {
            // Add newline for execute commands
            const data = message.type === 'terminal.execute' ? input + '\n' : input;
            this.pty.write(data);
          }
        }
        break;

      case 'terminal.resize':
        // Remote resize request
        if (message.payload.terminalId === this.pty.info.id) {
          const { cols, rows } = message.payload;
          if (cols && rows) {
            this.pty.resize(cols, rows);
          }
        }
        break;

      case 'terminal.kill':
        // Remote kill request
        if (message.payload.terminalId === this.pty.info.id) {
          this.stop();
        }
        break;

      case 'auth.success':
        this.emit('authenticated');
        break;

      case 'welcome':
        // Hub welcome message
        break;
    }
  }

  /**
   * Send message to hub
   */
  private sendToHub(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: HubMessage = {
        type,
        payload,
        timestamp: new Date(),
        messageId: `cli-${++this.messageId}`
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      if (!this._isConnected && this.pty.isRunning) {
        try {
          await this.connectToHub();
          this.registerWithHub();
          
          // Send buffered output to catch up
          const buffer = this.pty.getBufferedOutput();
          if (buffer) {
            this.sendToHub('terminal.output', {
              terminalId: this.pty.info.id,
              content: buffer,
              timestamp: new Date(),
              isBuffer: true
            });
          }
        } catch {
          this.scheduleReconnect();
        }
      }
    }, this.options.reconnectInterval);
  }

  /**
   * Stop the session
   */
  stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.pty.dispose();
    this._isConnected = false;
  }

  /**
   * Get session info
   */
  get info(): PTYSessionInfo {
    return this.pty.info;
  }

  /**
   * Check if connected to hub
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Check if PTY is running
   */
  get isRunning(): boolean {
    return this.pty.isRunning;
  }
}

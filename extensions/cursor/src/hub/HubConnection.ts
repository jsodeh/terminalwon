import * as vscode from 'vscode';
import WebSocket from 'ws';

export interface WSMessage {
    type: string;
    payload: any;
    timestamp: Date;
    messageId: string;
}

export interface Terminal {
    id: string;
    name: string;
    cwd: string;
    status: 'active' | 'idle' | 'error';
    tool: 'vscode';
    createdAt: Date;
    lastActivity: Date;
}

export class TerminalWONHub {
    private ws?: WebSocket;
    private reconnectTimer?: NodeJS.Timeout;
    private isConnected = false;
    private messageHandlers = new Map<string, (payload: any) => void>();

    constructor(private context: vscode.ExtensionContext) {
        this.setupMessageHandlers();
    }

    async connect(): Promise<void> {
        const config = vscode.workspace.getConfiguration('terminalwon');
        const hubUrl = config.get<string>('hubUrl') || 'wss://hub.terminalwon.com';
        const apiKey = config.get<string>('apiKey');

        if (!apiKey) {
            const inputApiKey = await vscode.window.showInputBox({
                prompt: 'Enter your TerminalWON API Key',
                password: true,
                ignoreFocusOut: true
            });

            if (!inputApiKey) {
                throw new Error('API Key is required');
            }

            await config.update('apiKey', inputApiKey, vscode.ConfigurationTarget.Global);
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(hubUrl, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'User-Agent': 'TerminalWON-VSCode/1.0.0'
                    }
                });

                if (!this.ws) {
                    reject(new Error('Failed to create WebSocket connection'));
                    return;
                }

                this.ws.on('open', () => {
                    console.log('Connected to TerminalWON Hub');
                    this.isConnected = true;
                    this.sendMessage('auth', {
                        tool: 'vscode',
                        version: vscode.version,
                        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
                    });
                    resolve();
                });

                this.ws.on('message', (data: any) => {
                    try {
                        const message: WSMessage = JSON.parse(data.toString());
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Failed to parse message:', error);
                    }
                });

                this.ws.on('close', () => {
                    console.log('Disconnected from TerminalWON Hub');
                    this.isConnected = false;
                    this.scheduleReconnect();
                });

                this.ws.on('error', (error: any) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
        this.isConnected = false;
    }

    sendMessage(type: string, payload: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('Cannot send message: not connected to hub');
            return;
        }

        const message: WSMessage = {
            type,
            payload,
            timestamp: new Date(),
            messageId: this.generateId()
        };

        this.ws.send(JSON.stringify(message));
    }

    onMessage(type: string, handler: (payload: any) => void): void {
        this.messageHandlers.set(type, handler);
    }

    registerTerminal(terminal: vscode.Terminal): void {
        const terminalData: Terminal = {
            id: this.generateId(),
            name: terminal.name,
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            status: 'active',
            tool: 'vscode',
            createdAt: new Date(),
            lastActivity: new Date()
        };

        this.sendMessage('terminal.register', terminalData);
    }

    sendTerminalOutput(terminalId: string, output: string): void {
        this.sendMessage('terminal.output', {
            terminalId,
            content: output,
            timestamp: new Date(),
            type: 'stdout'
        });
    }

    executeCommand(terminalId: string, command: string): void {
        this.sendMessage('terminal.execute', {
            terminalId,
            command,
            timestamp: new Date()
        });
    }

    requestTerminalAccess(terminalId: string): void {
        this.sendMessage('terminal.request_access', {
            terminalId,
            requesterId: this.getUserId()
        });
    }

    private setupMessageHandlers(): void {
        this.onMessage('terminal.execute', (payload) => {
            // Handle remote command execution
            this.handleRemoteCommand(payload);
        });

        this.onMessage('terminal.input', (payload) => {
            // Handle remote input
            this.handleRemoteInput(payload);
        });

        this.onMessage('ai.suggestion', (payload) => {
            // Handle AI suggestions
            this.handleAISuggestion(payload);
        });
    }

    private handleMessage(message: WSMessage): void {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message.payload);
        }
    }

    private handleRemoteCommand(payload: any): void {
        // Find the terminal and execute the command
        const terminal = vscode.window.terminals.find(t => t.name === payload.terminalName);
        if (terminal) {
            terminal.sendText(payload.command);
            terminal.show();
        }
    }

    private handleRemoteInput(payload: any): void {
        // Send input to specific terminal
        const terminal = vscode.window.terminals.find(t => t.name === payload.terminalName);
        if (terminal) {
            terminal.sendText(payload.input, false);
        }
    }

    private handleAISuggestion(payload: any): void {
        // Show AI suggestion as information message with actions
        vscode.window.showInformationMessage(
            `AI Suggestion: ${payload.suggestion}`,
            'Apply',
            'Dismiss'
        ).then(selection => {
            if (selection === 'Apply') {
                this.sendMessage('ai.apply_suggestion', {
                    suggestionId: payload.id,
                    accepted: true
                });
            }
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            if (!this.isConnected) {
                console.log('Attempting to reconnect to TerminalWON Hub...');
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, 5000);
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    private getUserId(): string {
        // Get or generate a unique user ID for this VSCode instance
        let userId = this.context.globalState.get<string>('terminalwon.userId');
        if (!userId) {
            userId = this.generateId();
            this.context.globalState.update('terminalwon.userId', userId);
        }
        return userId;
    }

    get connected(): boolean {
        return this.isConnected;
    }
}
import * as vscode from 'vscode';
import { TerminalWONHub } from '../hub/HubConnection';

interface TerminalSession {
    terminal: vscode.Terminal;
    terminalId: string;
}

export class KiroTerminalMonitor {
    private monitoredTerminals = new Map<vscode.Terminal, TerminalSession>();

    constructor(private hub: TerminalWONHub) {
        // Listen for commands from hub
        this.hub.onMessage('terminal.execute', this.handleRemoteCommand.bind(this));
        this.hub.onMessage('terminal.input', this.handleRemoteInput.bind(this));
    }

    start(): void {
        console.log('Starting Kiro terminal monitoring...');
        
        // Register all existing terminals
        vscode.window.terminals.forEach(terminal => {
            this.onTerminalOpened(terminal);
        });
        
        // Monitor terminal events
        vscode.window.onDidOpenTerminal(this.onTerminalOpened.bind(this));
        vscode.window.onDidCloseTerminal(this.onTerminalClosed.bind(this));
    }

    stop(): void {
        console.log('Stopping Kiro terminal monitoring...');
        this.monitoredTerminals.clear();
    }

    onTerminalOpened(terminal: vscode.Terminal): void {
        console.log(`Kiro terminal opened: ${terminal.name}`);
        const terminalId = this.generateId();
        
        const session: TerminalSession = {
            terminal,
            terminalId
        };
        
        this.monitoredTerminals.set(terminal, session);
        
        // Automatically register terminal with hub
        const terminalInfo = {
            id: terminalId,
            name: terminal.name,
            processId: terminal.processId || 0,
            creationOptions: terminal.creationOptions,
            cwd: this.getTerminalCwd(terminal),
            streaming: false // Regular VSCode terminals don't have live streaming
        };
        
        this.hub.registerTerminal(terminalInfo);
        console.log(`Registered terminal ${terminal.name} with ID: ${terminalId}`);
    }

    onTerminalClosed(terminal: vscode.Terminal): void {
        console.log(`Kiro terminal closed: ${terminal.name}`);
        const session = this.monitoredTerminals.get(terminal);
        if (session) {
            this.monitoredTerminals.delete(terminal);
            
            // Notify hub that terminal closed
            this.hub.sendMessage('terminal.closed', {
                terminalId: session.terminalId
            });
        }
    }

    private handleRemoteCommand(payload: any): void {
        console.log(`Received remote command:`, payload);
        const { terminalId, command } = payload;
        
        // Find the terminal
        for (const [terminal, session] of this.monitoredTerminals.entries()) {
            if (session.terminalId === terminalId) {
                console.log(`Executing command in ${terminal.name}: ${command}`);
                
                // Send command to terminal
                terminal.sendText(command, true);
                
                // Notify hub that command was sent
                this.hub.sendMessage('terminal.command_sent', {
                    terminalId,
                    command,
                    timestamp: new Date()
                });
                
                return;
            }
        }
        
        console.warn(`Terminal not found: ${terminalId}`);
    }

    private handleRemoteInput(payload: any): void {
        console.log(`Received remote input:`, payload);
        const { terminalId, input } = payload;
        
        // Find the terminal
        for (const [terminal, session] of this.monitoredTerminals.entries()) {
            if (session.terminalId === terminalId) {
                console.log(`Sending input to ${terminal.name}: ${input}`);
                
                // Send input to terminal (without newline)
                terminal.sendText(input, false);
                
                return;
            }
        }
        
        console.warn(`Terminal not found: ${terminalId}`);
    }

    async shareTerminal(terminal: vscode.Terminal): Promise<void> {
        console.log(`Sharing Kiro terminal: ${terminal.name}`);
        
        let session = this.monitoredTerminals.get(terminal);
        if (!session) {
            // Terminal not yet monitored, add it
            this.onTerminalOpened(terminal);
            session = this.monitoredTerminals.get(terminal);
        }

        if (session) {
            const terminalInfo = {
                id: session.terminalId,
                name: terminal.name,
                processId: terminal.processId || 0,
                creationOptions: terminal.creationOptions,
                cwd: this.getTerminalCwd(terminal),
                streaming: false
            };

            this.hub.registerTerminal(terminalInfo);
        }
    }

    private getTerminalCwd(terminal: vscode.Terminal): string {
        const creationOptions = terminal.creationOptions as any;
        if (creationOptions?.cwd) {
            if (typeof creationOptions.cwd === 'string') {
                return creationOptions.cwd;
            } else if (creationOptions.cwd.fsPath) {
                return creationOptions.cwd.fsPath;
            }
        }
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    private generateId(): string {
        return `kiro-terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public method to get terminal by ID
    getTerminalById(terminalId: string): vscode.Terminal | undefined {
        for (const [terminal, session] of this.monitoredTerminals.entries()) {
            if (session.terminalId === terminalId) {
                return terminal;
            }
        }
        return undefined;
    }

    // Public method to get all monitored terminals
    getAllTerminals(): Array<{ terminal: vscode.Terminal; terminalId: string }> {
        const result: Array<{ terminal: vscode.Terminal; terminalId: string }> = [];
        for (const [terminal, session] of this.monitoredTerminals.entries()) {
            result.push({ terminal, terminalId: session.terminalId });
        }
        return result;
    }
}

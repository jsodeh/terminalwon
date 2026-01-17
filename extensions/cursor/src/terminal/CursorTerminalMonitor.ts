import * as vscode from 'vscode';
import { TerminalWONHub } from '../hub/HubConnection';

interface MonitoredTerminal {
    terminal: vscode.Terminal;
    id: string;
    isShared: boolean;
    outputBuffer: string[];
    lastActivity: Date;
}

export class CursorTerminalMonitor {
    private monitoredTerminals = new Map<vscode.Terminal, MonitoredTerminal>();
    private outputBuffer = new Map<string, string[]>();

    constructor(private hub: TerminalWONHub) {}

    start(): void {
        console.log('Starting terminal monitoring...');
        
        // Monitor existing terminals
        vscode.window.terminals.forEach(terminal => {
            this.monitorTerminal(terminal);
        });
    }

    stop(): void {
        console.log('Stopping terminal monitoring...');
        
        // Clean up all monitored terminals
        this.monitoredTerminals.forEach(monitored => {
            if (monitored.isShared) {
                this.hub.sendMessage('terminal.closed', {
                    terminalId: monitored.id
                });
            }
        });
        this.monitoredTerminals.clear();
        this.outputBuffer.clear();
    }

    onTerminalOpened(terminal: vscode.Terminal): void {
        console.log(`Terminal opened: ${terminal.name}`);
        this.monitorTerminal(terminal);
    }

    onTerminalClosed(terminal: vscode.Terminal): void {
        console.log(`Terminal closed: ${terminal.name}`);
        
        const monitored = this.monitoredTerminals.get(terminal);
        if (monitored) {
            if (monitored.isShared) {
                this.hub.sendMessage('terminal.closed', {
                    terminalId: monitored.id
                });
            }
            
            this.monitoredTerminals.delete(terminal);
            this.outputBuffer.delete(monitored.id);
        }
    }

    async shareTerminal(terminal: vscode.Terminal): Promise<void> {
        const monitored = this.monitoredTerminals.get(terminal);
        if (!monitored) {
            throw new Error('Terminal not found');
        }

        if (monitored.isShared) {
            vscode.window.showWarningMessage('Terminal is already being shared');
            return;
        }

        // Register terminal with hub
        this.hub.registerTerminal(terminal);
        monitored.isShared = true;

        // Send existing output buffer
        const buffer = this.outputBuffer.get(monitored.id) || [];
        if (buffer.length > 0) {
            this.hub.sendTerminalOutput(monitored.id, buffer.join(''));
        }

        vscode.window.showInformationMessage(`Terminal "${terminal.name}" is now shared`);
    }

    private monitorTerminal(terminal: vscode.Terminal): void {
        if (this.monitoredTerminals.has(terminal)) {
            return;
        }

        const terminalId = this.generateId();
        const monitored: MonitoredTerminal = {
            terminal,
            id: terminalId,
            isShared: false,
            outputBuffer: [],
            lastActivity: new Date()
        };

        this.monitoredTerminals.set(terminal, monitored);
        this.outputBuffer.set(terminalId, []);

        // Use VSCode's shell integration API for output capture (when available)
        this.setupShellIntegration(terminal, terminalId);

        // Auto-share if configured
        const config = vscode.workspace.getConfiguration('terminalwon');
        if (config.get('shareByDefault')) {
            setTimeout(() => this.shareTerminal(terminal), 1000);
        }
    }

    private setupShellIntegration(terminal: vscode.Terminal, terminalId: string): void {
        // Use VSCode's shell integration API if available
        // This is a more reliable method than node-pty for VSCode extensions
        
        // For now, we'll simulate terminal activity
        // In a real implementation, you would use:
        // - VSCode's shell integration API
        // - Terminal process monitoring
        // - Or other VSCode-specific methods
        
        const simulateActivity = () => {
            if (this.monitoredTerminals.has(terminal)) {
                const monitored = Array.from(this.monitoredTerminals.values())
                    .find(m => m.id === terminalId);
                
                if (monitored?.isShared && this.hub.connected) {
                    // Send periodic status updates
                    this.hub.sendMessage('terminal.heartbeat', {
                        terminalId,
                        name: terminal.name,
                        timestamp: new Date()
                    });
                }
                
                // Schedule next update
                setTimeout(simulateActivity, 5000);
            }
        };
        
        // Start activity simulation
        setTimeout(simulateActivity, 1000);
    }

    private handleTerminalOutput(terminalId: string, output: string): void {
        // Buffer the output
        const buffer = this.outputBuffer.get(terminalId) || [];
        buffer.push(output);
        
        // Keep only last 1000 lines to prevent memory issues
        if (buffer.length > 1000) {
            buffer.splice(0, buffer.length - 1000);
        }
        
        this.outputBuffer.set(terminalId, buffer);

        // Send to hub if terminal is shared
        const monitored = Array.from(this.monitoredTerminals.values())
            .find(m => m.id === terminalId);
        
        if (monitored?.isShared && this.hub.connected) {
            this.hub.sendTerminalOutput(terminalId, output);
        }
    }

    // Simulate terminal command execution for demo purposes
    simulateTerminalCommand(terminalId: string, command: string): void {
        const monitored = Array.from(this.monitoredTerminals.values())
            .find(m => m.id === terminalId);
        
        if (monitored?.isShared && this.hub.connected) {
            // Send command execution event
            this.hub.sendMessage('terminal.command', {
                terminalId,
                command,
                timestamp: new Date(),
                status: 'executed'
            });
            
            // Simulate command output
            setTimeout(() => {
                this.hub.sendTerminalOutput(terminalId, `$ ${command}\nCommand executed successfully\n`);
            }, 500);
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    getMonitoredTerminals(): MonitoredTerminal[] {
        return Array.from(this.monitoredTerminals.values());
    }

    getSharedTerminals(): MonitoredTerminal[] {
        return this.getMonitoredTerminals().filter(t => t.isShared);
    }

    // Cursor-specific AI methods
    async analyzeTerminalWithAI(terminal: vscode.Terminal): Promise<void> {
        const monitored = this.monitoredTerminals.get(terminal);
        if (!monitored) {
            throw new Error('Terminal not found');
        }

        // Get recent output for AI analysis
        const buffer = this.outputBuffer.get(monitored.id) || [];
        const recentOutput = buffer.slice(-50).join(''); // Last 50 lines

        this.hub.sendMessage('ai.analyze', {
            terminalId: monitored.id,
            output: recentOutput,
            context: 'cursor-ide',
            timestamp: new Date()
        });
    }

    requestAISuggestion(type: string): void {
        this.hub.sendMessage('ai.request_suggestion', {
            type,
            context: 'cursor-ide',
            timestamp: new Date()
        });
    }

    enhanceAIContext(chatText: string): void {
        // Send terminal context to enhance AI chat
        const sharedTerminals = this.getSharedTerminals();
        const context = sharedTerminals.map(t => ({
            name: t.terminal.name,
            recentOutput: (this.outputBuffer.get(t.id) || []).slice(-10).join('')
        }));

        this.hub.sendMessage('ai.enhance_context', {
            chatText,
            terminalContext: context,
            timestamp: new Date()
        });
    }
}
import * as vscode from 'vscode';
import * as os from 'os';
import { TerminalWONHub } from '../hub/HubConnection';

interface RemoteTerminal {
    id: string;
    name: string;
    vscodeTerminal: vscode.Terminal;
    outputBuffer: string[];
}

export class PTYTerminalManager {
    private terminals = new Map<string, RemoteTerminal>();

    constructor(private hub: TerminalWONHub) {
        // Listen for remote commands
        this.hub.onMessage('terminal.execute', this.handleRemoteCommand.bind(this));
        this.hub.onMessage('terminal.input', this.handleRemoteInput.bind(this));
    }

    createRemoteTerminal(name?: string): string {
        const terminalId = this.generateId();
        const terminalName = name || `TerminalWON Remote ${this.terminals.size + 1}`;

        console.log(`Creating remote terminal: ${terminalName}`);

        // Create standard VSCode terminal
        const vscodeTerminal = vscode.window.createTerminal({
            name: terminalName,
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir(),
            env: { TERM_PROGRAM: 'TerminalWON' }
        });

        const terminal: RemoteTerminal = {
            id: terminalId,
            name: terminalName,
            vscodeTerminal,
            outputBuffer: []
        };

        this.terminals.set(terminalId, terminal);

        // Register with hub
        this.hub.registerTerminal({
            id: terminalId,
            name: terminalName,
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir(),
            status: 'active',
            tool: 'kiro',
            createdAt: new Date(),
            lastActivity: new Date(),
            streaming: false // Standard terminals don't have live streaming
        });

        // Show terminal
        vscodeTerminal.show();

        // Send welcome message
        vscodeTerminal.sendText('echo "🚀 TerminalWON Remote Terminal"');
        vscodeTerminal.sendText('echo "📡 Commands from mobile will execute here"');
        vscodeTerminal.sendText('echo "---"');

        vscode.window.showInformationMessage(`Remote terminal "${terminalName}" created!`);

        console.log(`Remote terminal created: ${terminalName} (ID: ${terminalId})`);
        return terminalId;
    }

    closeTerminal(terminalId: string): void {
        const terminal = this.terminals.get(terminalId);
        if (terminal) {
            console.log(`Closing terminal: ${terminal.name}`);
            terminal.vscodeTerminal.dispose();
            this.terminals.delete(terminalId);
            
            this.hub.sendMessage('terminal.closed', { terminalId });
        }
    }

    private handleRemoteCommand(payload: any): void {
        const { terminalId, command } = payload;
        console.log(`Remote command for terminal ${terminalId}: ${command}`);

        const terminal = this.terminals.get(terminalId);
        if (terminal) {
            // Execute command in terminal
            terminal.vscodeTerminal.sendText(command, true);
            
            // Notify hub
            this.hub.sendMessage('terminal.command_executed', {
                terminalId,
                command,
                timestamp: new Date()
            });
            
            vscode.window.showInformationMessage(`Command executed: ${command}`);
        } else {
            console.warn(`Terminal not found: ${terminalId}`);
        }
    }

    private handleRemoteInput(payload: any): void {
        const { terminalId, input } = payload;
        console.log(`Remote input for terminal ${terminalId}: ${input}`);

        const terminal = this.terminals.get(terminalId);
        if (terminal) {
            // Send input without newline (for Y/N prompts etc)
            terminal.vscodeTerminal.sendText(input, false);
        } else {
            console.warn(`Terminal not found: ${terminalId}`);
        }
    }

    getTerminal(terminalId: string): RemoteTerminal | undefined {
        return this.terminals.get(terminalId);
    }

    getAllTerminals(): RemoteTerminal[] {
        return Array.from(this.terminals.values());
    }

    private generateId(): string {
        return `remote-terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    dispose(): void {
        console.log('Disposing terminal manager');
        for (const terminal of this.terminals.values()) {
            terminal.vscodeTerminal.dispose();
        }
        this.terminals.clear();
    }
}

import * as vscode from 'vscode';
import { TerminalWONHub } from '../hub/HubConnection';

export class TerminalProvider implements vscode.TreeDataProvider<TerminalItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TerminalItem | undefined | null | void> = new vscode.EventEmitter<TerminalItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TerminalItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private terminals: TerminalItem[] = [];

    constructor(private hub: TerminalWONHub) {
        // Listen for terminal updates from hub
        this.hub.onMessage('terminals.list', (payload) => {
            this.updateTerminals(payload.terminals);
        });

        // Request initial terminal list
        this.requestTerminalList();
    }

    refresh(): void {
        this.requestTerminalList();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TerminalItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TerminalItem): Thenable<TerminalItem[]> {
        if (!element) {
            return Promise.resolve(this.terminals);
        }
        return Promise.resolve([]);
    }

    private requestTerminalList(): void {
        if (this.hub.connected) {
            this.hub.sendMessage('terminals.request_list', {});
        }
    }

    private updateTerminals(terminals: any[]): void {
        this.terminals = terminals.map(terminal => new TerminalItem(
            terminal.name,
            terminal.id,
            terminal.status,
            terminal.tool,
            terminal.lastActivity
        ));
        this._onDidChangeTreeData.fire();
    }
}

export class TerminalItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly terminalId: string,
        public readonly status: string,
        public readonly tool: string,
        public readonly lastActivity: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `${this.label} (${this.tool}) - ${this.status}`;
        this.description = this.getStatusDescription();
        this.iconPath = this.getStatusIcon();
        
        this.command = {
            command: 'terminalwon.openTerminal',
            title: 'Open Terminal',
            arguments: [this.terminalId]
        };

        this.contextValue = 'terminal';
    }

    private getStatusDescription(): string {
        const time = new Date(this.lastActivity).toLocaleTimeString();
        return `${this.status} • ${time}`;
    }

    private getStatusIcon(): vscode.ThemeIcon {
        switch (this.status) {
            case 'active':
                return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('terminal.ansiGreen'));
            case 'idle':
                return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('terminal.ansiYellow'));
            case 'error':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('terminal.ansiRed'));
            default:
                return new vscode.ThemeIcon('terminal');
        }
    }
}
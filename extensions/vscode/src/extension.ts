import * as vscode from 'vscode';
import { TerminalWONHub } from './hub/HubConnection';
import { TerminalMonitor } from './terminal/TerminalMonitor';
import { ActivityProvider } from './providers/ActivityProvider';
import { TerminalProvider } from './providers/TerminalProvider';

let hub: TerminalWONHub;
let terminalMonitor: TerminalMonitor;

export function activate(context: vscode.ExtensionContext) {
    console.log('TerminalWON extension is now active!');

    // Initialize hub connection
    hub = new TerminalWONHub(context);
    terminalMonitor = new TerminalMonitor(hub);

    // Register providers
    const terminalProvider = new TerminalProvider(hub);
    const activityProvider = new ActivityProvider(hub);

    // Register tree data providers
    vscode.window.registerTreeDataProvider('terminalwon.terminals', terminalProvider);
    vscode.window.registerTreeDataProvider('terminalwon.activity', activityProvider);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('terminalwon.connect', async () => {
            try {
                await hub.connect();
                vscode.window.showInformationMessage('Connected to TerminalWON Hub');
                vscode.commands.executeCommand('setContext', 'terminalwon.connected', true);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to connect: ${error}`);
            }
        }),

        vscode.commands.registerCommand('terminalwon.disconnect', () => {
            hub.disconnect();
            vscode.window.showInformationMessage('Disconnected from TerminalWON Hub');
            vscode.commands.executeCommand('setContext', 'terminalwon.connected', false);
        }),

        vscode.commands.registerCommand('terminalwon.shareTerminal', async () => {
            const activeTerminal = vscode.window.activeTerminal;
            if (!activeTerminal) {
                vscode.window.showWarningMessage('No active terminal to share');
                return;
            }

            try {
                await terminalMonitor.shareTerminal(activeTerminal);
                vscode.window.showInformationMessage(`Terminal "${activeTerminal.name}" is now being shared`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to share terminal: ${error}`);
            }
        }),

        vscode.commands.registerCommand('terminalwon.openDashboard', () => {
            const panel = vscode.window.createWebviewPanel(
                'terminalwonDashboard',
                'TerminalWON Dashboard',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = getDashboardHtml();
        }),

        // Terminal provider commands
        vscode.commands.registerCommand('terminalwon.refreshTerminals', () => {
            terminalProvider.refresh();
        }),

        vscode.commands.registerCommand('terminalwon.openTerminal', (terminalId: string) => {
            hub.requestTerminalAccess(terminalId);
        }),

        // Activity provider commands
        vscode.commands.registerCommand('terminalwon.refreshActivity', () => {
            activityProvider.refresh();
        })
    ];

    // Add all commands to subscriptions
    commands.forEach(command => context.subscriptions.push(command));

    // Start terminal monitoring
    terminalMonitor.start();

    // Auto-connect if enabled
    const config = vscode.workspace.getConfiguration('terminalwon');
    if (config.get('autoConnect')) {
        vscode.commands.executeCommand('terminalwon.connect');
    }

    // Listen for terminal events
    context.subscriptions.push(
        vscode.window.onDidOpenTerminal(terminal => {
            terminalMonitor.onTerminalOpened(terminal);
        }),
        vscode.window.onDidCloseTerminal(terminal => {
            terminalMonitor.onTerminalClosed(terminal);
        })
    );
}

export function deactivate() {
    if (hub) {
        hub.disconnect();
    }
    if (terminalMonitor) {
        terminalMonitor.stop();
    }
}

function getDashboardHtml(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TerminalWON Dashboard</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                margin: 0;
                padding: 20px;
            }
            .header {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
            }
            .logo {
                width: 32px;
                height: 32px;
                background-color: var(--vscode-button-background);
                border-radius: 4px;
                margin-right: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            .stat-card {
                background-color: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                border-radius: 6px;
                padding: 16px;
            }
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 4px;
            }
            .stat-label {
                font-size: 12px;
                opacity: 0.8;
            }
            .terminals-list {
                background-color: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                border-radius: 6px;
                padding: 16px;
            }
            .terminal-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-input-border);
            }
            .terminal-item:last-child {
                border-bottom: none;
            }
            .terminal-status {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-right: 8px;
            }
            .status-active { background-color: #22c55e; }
            .status-idle { background-color: #6b7280; }
            .status-error { background-color: #ef4444; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">📟</div>
            <h1>TerminalWON Dashboard</h1>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value" id="activeTerminals">0</div>
                <div class="stat-label">Active Terminals</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="totalCommands">0</div>
                <div class="stat-label">Commands Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="teamMembers">0</div>
                <div class="stat-label">Team Members</div>
            </div>
        </div>

        <div class="terminals-list">
            <h3>Active Terminals</h3>
            <div id="terminalsList">
                <div class="terminal-item">
                    <div style="display: flex; align-items: center;">
                        <div class="terminal-status status-active"></div>
                        <span>Backend Server</span>
                    </div>
                    <span style="font-size: 12px; opacity: 0.7;">2m ago</span>
                </div>
                <div class="terminal-item">
                    <div style="display: flex; align-items: center;">
                        <div class="terminal-status status-idle"></div>
                        <span>Frontend Build</span>
                    </div>
                    <span style="font-size: 12px; opacity: 0.7;">15m ago</span>
                </div>
            </div>
        </div>

        <script>
            // This would connect to the extension's message passing system
            // to get real-time data from the hub
        </script>
    </body>
    </html>
    `;
}
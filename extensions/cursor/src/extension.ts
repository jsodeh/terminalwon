import * as vscode from 'vscode';
import { TerminalWONHub } from './hub/HubConnection';
import { CursorTerminalMonitor } from './terminal/CursorTerminalMonitor';
import { AIInsightsProvider } from './providers/AIInsightsProvider';
import { TerminalProvider } from './providers/TerminalProvider';
import { ActivityProvider } from './providers/ActivityProvider';

let hub: TerminalWONHub;
let terminalMonitor: CursorTerminalMonitor;

export function activate(context: vscode.ExtensionContext) {
    console.log('TerminalWON for Cursor is now active!');

    // Initialize hub connection with Cursor-specific features
    hub = new TerminalWONHub(context);
    terminalMonitor = new CursorTerminalMonitor(hub);

    // Register providers
    const terminalProvider = new TerminalProvider(hub);
    const aiInsightsProvider = new AIInsightsProvider(hub);
    const activityProvider = new ActivityProvider(hub);

    // Register tree data providers
    vscode.window.registerTreeDataProvider('terminalwon.terminals', terminalProvider);
    vscode.window.registerTreeDataProvider('terminalwon.aiInsights', aiInsightsProvider);
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

        // Cursor-specific AI commands
        vscode.commands.registerCommand('terminalwon.aiAnalyze', async () => {
            const activeTerminal = vscode.window.activeTerminal;
            if (!activeTerminal) {
                vscode.window.showWarningMessage('No active terminal to analyze');
                return;
            }

            try {
                await terminalMonitor.analyzeTerminalWithAI(activeTerminal);
                vscode.window.showInformationMessage('AI analysis requested');
            } catch (error) {
                vscode.window.showErrorMessage(`AI analysis failed: ${error}`);
            }
        }),

        vscode.commands.registerCommand('terminalwon.aiSuggest', async () => {
            const selection = await vscode.window.showQuickPick([
                'Fix last error',
                'Optimize performance',
                'Explain output',
                'Suggest next steps',
                'Debug issue'
            ], {
                placeHolder: 'What would you like AI help with?'
            });

            if (selection) {
                terminalMonitor.requestAISuggestion(selection);
            }
        }),

        // Provider refresh commands
        vscode.commands.registerCommand('terminalwon.refreshTerminals', () => {
            terminalProvider.refresh();
        }),

        vscode.commands.registerCommand('terminalwon.refreshAIInsights', () => {
            aiInsightsProvider.refresh();
        }),

        vscode.commands.registerCommand('terminalwon.refreshActivity', () => {
            activityProvider.refresh();
        })
    ];

    // Add all commands to subscriptions
    commands.forEach(command => context.subscriptions.push(command));

    // Start terminal monitoring with AI integration
    terminalMonitor.start();

    // Auto-connect if enabled
    const config = vscode.workspace.getConfiguration('terminalwon');
    if (config.get('autoConnect', true)) {
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

    // Set up AI integration with Cursor's chat
    setupCursorAIIntegration(context);
}

export function deactivate() {
    if (hub) {
        hub.disconnect();
    }
    if (terminalMonitor) {
        terminalMonitor.stop();
    }
}

function setupCursorAIIntegration(context: vscode.ExtensionContext) {
    // Integration with Cursor's AI chat system
    // This would hook into Cursor's existing AI infrastructure
    
    // Listen for AI chat messages that mention terminals
    const aiChatWatcher = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'cursor-chat') {
            // Parse AI chat for terminal-related queries
            const text = event.document.getText();
            if (text.includes('terminal') || text.includes('command')) {
                // Enhance AI context with terminal information
                terminalMonitor.enhanceAIContext(text);
            }
        }
    });

    context.subscriptions.push(aiChatWatcher);
}
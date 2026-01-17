// TerminalWON Extension for Kiro IDE (VSCode-compatible)
import * as vscode from 'vscode';
import { KiroAPI } from './kiro/KiroAPI';
import { TerminalWONHub } from './hub/HubConnection';
import { KiroTerminalMonitor } from './terminal/KiroTerminalMonitor';
import { PTYTerminalManager } from './terminal/PTYTerminalManager';

let kiroAPI: KiroAPI;
let hub: TerminalWONHub;
let terminalMonitor: KiroTerminalMonitor;
let ptyManager: PTYTerminalManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('TerminalWON for Kiro is now active!');

    // Initialize components
    kiroAPI = new KiroAPI();
    hub = new TerminalWONHub(context);
    terminalMonitor = new KiroTerminalMonitor(hub);
    ptyManager = new PTYTerminalManager(hub);

    // Register commands
    registerCommands(context);

    // Start monitoring
    terminalMonitor.start();

    // Set up Kiro integration
    setupKiroIntegration();

    // Auto-connect to hub
    hub.connect().then(() => {
        vscode.window.showInformationMessage('TerminalWON connected to hub!');
    }).catch((error) => {
        console.error('Failed to connect to hub:', error);
    });
}

export function deactivate() {
    if (hub) {
        hub.disconnect();
    }
    if (terminalMonitor) {
        terminalMonitor.stop();
    }
    if (ptyManager) {
        ptyManager.dispose();
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    // Connect to Hub command
    const connectCommand = vscode.commands.registerCommand('terminalwon.connect', async () => {
        try {
            await hub.connect();
            vscode.window.showInformationMessage('Connected to TerminalWON Hub');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error}`);
        }
    });

    // Disconnect from Hub command
    const disconnectCommand = vscode.commands.registerCommand('terminalwon.disconnect', () => {
        hub.disconnect();
        vscode.window.showInformationMessage('Disconnected from TerminalWON Hub');
    });

    // Share Terminal command
    const shareTerminalCommand = vscode.commands.registerCommand('terminalwon.shareTerminal', async () => {
        const activeTerminal = vscode.window.activeTerminal;
        if (activeTerminal) {
            await terminalMonitor.shareTerminal(activeTerminal);
            vscode.window.showInformationMessage('Terminal is now being shared');
        } else {
            vscode.window.showWarningMessage('No active terminal to share');
        }
    });

    // Create Remote Terminal command (NEW!)
    const createRemoteTerminalCommand = vscode.commands.registerCommand('terminalwon.createRemoteTerminal', async () => {
        try {
            // Check if hub is connected
            if (!hub.connected) {
                const connect = await vscode.window.showWarningMessage(
                    'Not connected to TerminalWON Hub. Connect now?',
                    'Connect',
                    'Cancel'
                );
                
                if (connect === 'Connect') {
                    await hub.connect();
                } else {
                    return;
                }
            }
            
            const name = await vscode.window.showInputBox({
                prompt: 'Enter terminal name (optional)',
                placeHolder: 'TerminalWON Remote'
            });
            
            // User cancelled
            if (name === undefined) {
                return;
            }
            
            const terminalId = ptyManager.createRemoteTerminal(name || undefined);
            vscode.window.showInformationMessage(`Remote terminal created! Output is being streamed to mobile.`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create remote terminal: ${error}`);
            console.error('Error creating remote terminal:', error);
        }
    });

    // Kiro Integration command
    const kiroIntegrationCommand = vscode.commands.registerCommand('terminalwon.kiroIntegration', () => {
        setupKiroIntegration();
        vscode.window.showInformationMessage('Kiro integration enabled');
    });

    context.subscriptions.push(
        connectCommand, 
        disconnectCommand, 
        shareTerminalCommand, 
        createRemoteTerminalCommand,
        kiroIntegrationCommand
    );
}

function setupKiroIntegration() {
    // Register with Kiro's tool system
    kiroAPI.registerWithKiroToolSystem();
    
    // Enable file system monitoring
    kiroAPI.enableFileSystemMonitoring();
    
    // Integrate with Kiro panels
    kiroAPI.integrateWithKiroPanels();

    console.log('Kiro integration setup complete');
}
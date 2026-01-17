import * as vscode from 'vscode';
import { TerminalWONHub } from '../hub/HubConnection';

export interface AIInsight {
    id: string;
    type: 'error' | 'suggestion' | 'optimization' | 'explanation';
    title: string;
    description: string;
    terminalId?: string;
    confidence: number;
    timestamp: Date;
}

export class AIInsightsProvider implements vscode.TreeDataProvider<AIInsight> {
    private _onDidChangeTreeData: vscode.EventEmitter<AIInsight | undefined | null | void> = new vscode.EventEmitter<AIInsight | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AIInsight | undefined | null | void> = this._onDidChangeTreeData.event;

    private insights: AIInsight[] = [];

    constructor(private hub: TerminalWONHub) {
        this.setupMessageHandlers();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AIInsight): vscode.TreeItem {
        const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
        
        item.description = element.description;
        item.tooltip = `${element.type} - Confidence: ${Math.round(element.confidence * 100)}%`;
        
        // Set icon based on type
        switch (element.type) {
            case 'error':
                item.iconPath = new vscode.ThemeIcon('error');
                break;
            case 'suggestion':
                item.iconPath = new vscode.ThemeIcon('lightbulb');
                break;
            case 'optimization':
                item.iconPath = new vscode.ThemeIcon('rocket');
                break;
            case 'explanation':
                item.iconPath = new vscode.ThemeIcon('info');
                break;
        }

        // Add context menu
        item.contextValue = 'aiInsight';
        
        return item;
    }

    getChildren(element?: AIInsight): Thenable<AIInsight[]> {
        if (!element) {
            // Return root items (sorted by timestamp, newest first)
            return Promise.resolve(
                this.insights
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .slice(0, 20) // Show only last 20 insights
            );
        }
        return Promise.resolve([]);
    }

    private setupMessageHandlers(): void {
        this.hub.onMessage('ai.insight', (payload) => {
            this.addInsight(payload);
        });

        this.hub.onMessage('ai.analysis_complete', (payload) => {
            this.addInsight({
                id: this.generateId(),
                type: 'explanation',
                title: 'Analysis Complete',
                description: payload.summary || 'Terminal analysis finished',
                terminalId: payload.terminalId,
                confidence: payload.confidence || 0.8,
                timestamp: new Date()
            });
        });
    }

    private addInsight(insight: AIInsight): void {
        this.insights.unshift(insight);
        
        // Keep only last 100 insights to prevent memory issues
        if (this.insights.length > 100) {
            this.insights = this.insights.slice(0, 100);
        }
        
        this.refresh();
        
        // Show notification for high-confidence insights
        if (insight.confidence > 0.8) {
            vscode.window.showInformationMessage(
                `AI Insight: ${insight.title}`,
                'View Details'
            ).then(selection => {
                if (selection === 'View Details') {
                    vscode.window.showInformationMessage(insight.description);
                }
            });
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Public methods for manual insight creation
    addErrorInsight(error: string, terminalId?: string): void {
        this.addInsight({
            id: this.generateId(),
            type: 'error',
            title: 'Error Detected',
            description: error,
            terminalId,
            confidence: 0.9,
            timestamp: new Date()
        });
    }

    addSuggestion(suggestion: string, terminalId?: string): void {
        this.addInsight({
            id: this.generateId(),
            type: 'suggestion',
            title: 'AI Suggestion',
            description: suggestion,
            terminalId,
            confidence: 0.7,
            timestamp: new Date()
        });
    }

    clearInsights(): void {
        this.insights = [];
        this.refresh();
    }
}
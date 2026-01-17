import * as vscode from 'vscode';
import { TerminalWONHub } from '../hub/HubConnection';

export class ActivityProvider implements vscode.TreeDataProvider<ActivityItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ActivityItem | undefined | null | void> = new vscode.EventEmitter<ActivityItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ActivityItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private activities: ActivityItem[] = [];

    constructor(private hub: TerminalWONHub) {
        // Listen for activity updates from hub
        this.hub.onMessage('activity.update', (payload) => {
            this.addActivity(payload);
        });

        this.hub.onMessage('activity.list', (payload) => {
            this.updateActivities(payload.activities);
        });

        // Request initial activity list
        this.requestActivityList();
    }

    refresh(): void {
        this.requestActivityList();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ActivityItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ActivityItem): Thenable<ActivityItem[]> {
        if (!element) {
            return Promise.resolve(this.activities);
        }
        return Promise.resolve([]);
    }

    private requestActivityList(): void {
        if (this.hub.connected) {
            this.hub.sendMessage('activity.request_list', { limit: 20 });
        }
    }

    private addActivity(activity: any): void {
        const activityItem = new ActivityItem(
            activity.type,
            activity.description,
            activity.user,
            activity.timestamp,
            activity.terminal
        );

        this.activities.unshift(activityItem);
        
        // Keep only last 50 activities
        if (this.activities.length > 50) {
            this.activities = this.activities.slice(0, 50);
        }

        this._onDidChangeTreeData.fire();
    }

    private updateActivities(activities: any[]): void {
        this.activities = activities.map(activity => new ActivityItem(
            activity.type,
            activity.description,
            activity.user,
            activity.timestamp,
            activity.terminal
        ));
        this._onDidChangeTreeData.fire();
    }
}

export class ActivityItem extends vscode.TreeItem {
    constructor(
        public readonly type: string,
        public readonly description: string,
        public readonly user: string,
        public readonly timestamp: string,
        public readonly terminal?: string
    ) {
        super(description, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `${this.user}: ${this.description}`;
        this.description = this.getTimeDescription();
        this.iconPath = this.getTypeIcon();
        this.contextValue = 'activity';
    }

    private getTimeDescription(): string {
        const now = new Date();
        const activityTime = new Date(this.timestamp);
        const diffMs = now.getTime() - activityTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) {
            return 'now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else {
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                return `${diffDays}d ago`;
            }
        }
    }

    private getTypeIcon(): vscode.ThemeIcon {
        switch (this.type) {
            case 'command':
                return new vscode.ThemeIcon('terminal', new vscode.ThemeColor('terminal.ansiBlue'));
            case 'error':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('terminal.ansiRed'));
            case 'ai_message':
                return new vscode.ThemeIcon('sparkle', new vscode.ThemeColor('terminal.ansiMagenta'));
            case 'team_activity':
                return new vscode.ThemeIcon('person', new vscode.ThemeColor('terminal.ansiCyan'));
            default:
                return new vscode.ThemeIcon('info');
        }
    }
}
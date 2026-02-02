/**
 * IDEAgent - Central AI agent per IDE
 * 
 * Provides cross-project context by:
 * - Monitoring all chat sessions from a specific IDE
 * - Correlating terminal errors with related chat discussions
 * - Proactively surfacing relevant insights
 * 
 * Supports multiple AI providers via AIProviderManager.
 */

// Default system prompts
const CORRELATION_SYSTEM_PROMPT = `You are an IDE assistant that correlates terminal errors with recent chat context.
Given a terminal error and recent chat discussion, provide a brief insight if they are related.
Respond in JSON format:
{
  "isRelated": boolean,
  "insight": "Brief explanation of the correlation" | null,
  "suggestion": "What the user should do" | null
}
Only respond with valid JSON.`;

const CROSS_PROJECT_SYSTEM_PROMPT = `You are an IDE assistant looking for relevant context across projects.
If the user's current question is related to discussions in other projects, provide a brief insight.
Respond in JSON:
{
  "hasRelevantContext": boolean,
  "relevantProject": "project name" | null,
  "insight": "Brief insight" | null
}
Only respond with valid JSON.`;

class IDEAgent {
    constructor(options = {}) {
        this.ideType = options.ideType; // 'kiro', 'cursor', 'antigravity'
        this.chatHistoryManager = options.chatHistoryManager;

        // Use AIProviderManager instead of ClaudeClient
        this.aiProviderManager = options.aiProviderManager;
        this.configManager = options.configManager;

        // Get agent-specific config
        const agentConfig = this.configManager?.getAgentConfig('ide') || {};
        this.enabled = agentConfig.enabled !== false && !!this.aiProviderManager;
        this.provider = agentConfig.provider;
        this.model = agentConfig.model;
        this.systemPrompt = agentConfig.systemPrompt; // Custom prompt override

        // Context window for cross-project correlation
        this.contextWindow = [];
        this.maxContextItems = 20;

        // Active project tracking
        this.activeProjects = new Map(); // projectPath -> { lastActivity, sessionIds }

        // Timeline event callback
        this.onInsight = options.onInsight || (() => { });

        // Analysis state
        this.lastAnalysisTime = 0;
        this.analysisInterval = 30000; // Min 30s between proactive analyses

        if (this.enabled) {
            console.log(`[IDEAgent] ✅ IDE agent created for ${this.ideType} (provider: ${this.provider})`);
        } else {
            console.log(`[IDEAgent] ⚠️ Agent disabled for ${this.ideType} (no provider configured)`);
        }
    }

    /**
     * Initialize the agent with existing sessions
     * @param {Array} sessions - Chat sessions from this IDE
     */
    initialize(sessions) {
        if (!sessions) return;

        for (const session of sessions) {
            if (session.sourceIDE === this.ideType) {
                this.trackSession(session);
            }
        }

        console.log(`[IDEAgent] Initialized with ${this.activeProjects.size} projects from ${this.ideType}`);
    }

    /**
     * Track a chat session
     * @param {Object} session - Chat session
     */
    trackSession(session) {
        const projectPath = session.workspacePath || session.workspaceName || 'unknown';

        if (!this.activeProjects.has(projectPath)) {
            this.activeProjects.set(projectPath, {
                lastActivity: new Date(),
                sessionIds: new Set()
            });
        }

        const project = this.activeProjects.get(projectPath);
        project.sessionIds.add(session.id);
        project.lastActivity = new Date(session.lastActivity || session.dateCreated);
    }

    /**
     * Handle a new message from any session in this IDE
     * @param {string} sessionId - Session ID
     * @param {Object} message - New message
     * @param {Object} sessionContext - Session metadata
     */
    async handleNewMessage(sessionId, message, sessionContext = {}) {
        if (!this.enabled) return;

        // Add to context window
        this.contextWindow.push({
            sessionId,
            projectPath: sessionContext.workspacePath || 'unknown',
            role: message.role,
            contentPreview: (message.content || '').slice(0, 200),
            timestamp: new Date()
        });

        // Trim context window
        if (this.contextWindow.length > this.maxContextItems) {
            this.contextWindow.shift();
        }

        // Update project activity
        const projectPath = sessionContext.workspacePath || 'unknown';
        if (this.activeProjects.has(projectPath)) {
            this.activeProjects.get(projectPath).lastActivity = new Date();
        }

        // Check if this message mentions errors or issues that we can correlate
        if (message.role === 'user' && this.containsErrorKeywords(message.content)) {
            await this.checkForCrossProjectRelevance(message, sessionContext);
        }
    }

    /**
     * Handle a terminal error to correlate with chat context
     * @param {Object} errorEvent - Error event from TerminalAgent
     * @param {string} projectPath - Project path of the terminal
     */
    async correlateTerminalError(errorEvent, projectPath) {
        if (!this.enabled) return null;

        // Find related chat sessions for this project
        const relatedSessions = this.getSessionsForProject(projectPath);

        if (relatedSessions.length === 0) {
            return null;
        }

        // Build context from recent chat messages
        const chatContext = this.contextWindow
            .filter(ctx => ctx.projectPath === projectPath)
            .map(ctx => `[${ctx.role}]: ${ctx.contentPreview}`)
            .join('\n');

        if (!chatContext) {
            return null;
        }

        try {
            // Use AIProviderManager for correlation analysis
            const response = await this.aiProviderManager.chat(
                [{
                    role: 'user',
                    content: `Terminal Error:
Type: ${errorEvent.data?.errorType || 'unknown'}
Summary: ${errorEvent.data?.summary || 'Unknown error'}

Recent Chat Context (${this.ideType}):
${chatContext.slice(-2000)}

Is this error related to anything discussed in the chat?`
                }],
                {
                    system: this.systemPrompt || CORRELATION_SYSTEM_PROMPT,
                    provider: this.provider,
                    model: this.model
                }
            );

            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);

                if (result.isRelated && result.insight) {
                    this.emitInsight({
                        type: 'correlation',
                        projectPath,
                        relatedSessions,
                        insight: result.insight,
                        suggestion: result.suggestion,
                        terminalError: errorEvent.data?.summary
                    });

                    return result;
                }
            }
        } catch (error) {
            console.error(`[IDEAgent] Correlation error:`, error.message);
        }

        return null;
    }

    /**
     * Check for cross-project relevance when user discusses an issue
     * @param {Object} message - User message
     * @param {Object} sessionContext - Session context
     */
    async checkForCrossProjectRelevance(message, sessionContext) {
        if (!this.enabled) return;

        // Rate limit
        const now = Date.now();
        if (now - this.lastAnalysisTime < this.analysisInterval) {
            return;
        }

        // Check if other projects have discussed similar issues
        const currentProject = sessionContext.workspacePath || 'unknown';
        const otherContexts = this.contextWindow
            .filter(ctx => ctx.projectPath !== currentProject)
            .slice(-10);

        if (otherContexts.length < 2) {
            return; // Not enough cross-project context
        }

        try {
            this.lastAnalysisTime = now;

            // Use AIProviderManager for cross-project analysis
            const response = await this.aiProviderManager.chat(
                [{
                    role: 'user',
                    content: `Current question in ${currentProject}:
${message.content.slice(0, 500)}

Recent discussions in other projects:
${otherContexts.map(c => `[${c.projectPath}] ${c.contentPreview}`).join('\n')}

Is there relevant context from another project?`
                }],
                {
                    system: CROSS_PROJECT_SYSTEM_PROMPT,
                    provider: this.provider,
                    model: this.model
                }
            );

            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);

                if (result.hasRelevantContext && result.insight) {
                    this.emitInsight({
                        type: 'cross_project',
                        currentProject,
                        relevantProject: result.relevantProject,
                        insight: result.insight
                    });
                }
            }
        } catch (error) {
            console.error(`[IDEAgent] Cross-project check error:`, error.message);
        }
    }

    /**
     * Check if content contains error-related keywords
     * @param {string} content - Message content
     * @returns {boolean}
     */
    containsErrorKeywords(content) {
        if (!content) return false;

        const keywords = [
            'error', 'fail', 'broken', 'bug', 'issue', 'crash',
            'doesn\'t work', 'not working', 'help', 'problem',
            'exception', 'undefined', 'null'
        ];

        const lowerContent = content.toLowerCase();
        return keywords.some(kw => lowerContent.includes(kw));
    }

    /**
     * Get all session IDs for a project
     * @param {string} projectPath - Project path
     * @returns {string[]}
     */
    getSessionsForProject(projectPath) {
        const project = this.activeProjects.get(projectPath);
        return project ? Array.from(project.sessionIds) : [];
    }

    /**
     * Get summary of IDE agent context
     * @returns {Object}
     */
    getSummary() {
        return {
            ideType: this.ideType,
            enabled: this.enabled,
            activeProjects: this.activeProjects.size,
            contextWindowSize: this.contextWindow.length,
            projects: Array.from(this.activeProjects.entries()).map(([path, data]) => ({
                path,
                lastActivity: data.lastActivity,
                sessionCount: data.sessionIds.size
            }))
        };
    }

    /**
     * Emit an insight event
     * @param {Object} data - Insight data
     */
    emitInsight(data) {
        const insight = {
            id: `insight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ideType: this.ideType,
            timestamp: new Date(),
            ...data
        };

        console.log(`[IDEAgent] 💡 Insight: ${data.type} for ${this.ideType}`);

        this.onInsight(insight);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.contextWindow = [];
        this.activeProjects.clear();
        console.log(`[IDEAgent] 🗑️ Agent destroyed for ${this.ideType}`);
    }
}

module.exports = { IDEAgent };

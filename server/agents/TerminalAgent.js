/**
 * TerminalAgent - AI assistant for individual terminals
 * 
 * Monitors terminal output, detects errors, and provides
 * intelligent suggestions via timeline events.
 * 
 * Supports multiple AI providers via AIProviderManager.
 */

// Error patterns that trigger immediate analysis
const ERROR_PATTERNS = [
    /error[:\s]/i,
    /ERR!/i,
    /failed/i,
    /ENOENT/i,
    /EACCES/i,
    /permission denied/i,
    /command not found/i,
    /Cannot find module/i,
    /SyntaxError/i,
    /TypeError/i,
    /ReferenceError/i,
    /npm ERR/i,
    /fatal:/i,
    /FATAL/i,
    /panic/i,
    /segmentation fault/i,
    /core dumped/i,
    /exception/i,
    /traceback/i,
    /ModuleNotFoundError/i,
    /ImportError/i
];

// Patterns to ignore (common non-error output)
const IGNORE_PATTERNS = [
    /\d+ passing/i,        // Test results
    /warning:/i,           // Warnings (not errors)
    /deprecated/i,         // Deprecation notices
    /npm WARN/i            // npm warnings
];

// Default system prompt for terminal error analysis
const DEFAULT_SYSTEM_PROMPT = `You are a terminal error analyzer. Analyze the terminal output and identify errors.
Respond in JSON format:
{
  "hasError": boolean,
  "errorType": "string or null",
  "errorSummary": "brief summary or null",
  "explanation": "detailed explanation or null",
  "confidence": 0.0-1.0,
  "suggestedCommands": ["array of fix commands"] or null
}
Only respond with valid JSON.`;

class TerminalAgent {
    constructor(options = {}) {
        this.terminalId = options.terminalId;
        this.terminalInfo = options.terminalInfo || {};

        // Use AIProviderManager instead of ClaudeClient
        this.aiProviderManager = options.aiProviderManager;
        this.configManager = options.configManager;

        // Get agent-specific config
        const agentConfig = this.configManager?.getAgentConfig('terminal') || {};
        this.enabled = agentConfig.enabled !== false && !!this.aiProviderManager;
        this.provider = agentConfig.provider;
        this.model = agentConfig.model;
        this.systemPrompt = agentConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT;

        // Output buffer for analysis
        this.outputBuffer = '';
        this.bufferMaxSize = 8000; // Max characters to buffer

        // Debounce analysis to avoid too many API calls
        this.analysisDebounceMs = options.analysisDebounceMs || 2000;
        this.analysisTimer = null;
        this.lastAnalysisTime = 0;
        this.minAnalysisInterval = 5000; // Minimum 5s between analyses

        // Recent commands for context
        this.recentCommands = [];
        this.maxRecentCommands = 10;

        // Timeline event callback
        this.onTimelineEvent = options.onTimelineEvent || (() => { });

        // Analysis state
        this.pendingAnalysis = false;
        this.lastError = null;

        if (this.enabled) {
            console.log(`[TerminalAgent] ✅ Agent created for terminal ${this.terminalId} (provider: ${this.provider})`);
        } else {
            console.log(`[TerminalAgent] ⚠️ Agent disabled for terminal ${this.terminalId} (no provider configured)`);
        }
    }

    /**
     * Process new terminal output
     * @param {string} content - New output content
     */
    processOutput(content) {
        if (!this.enabled) return;

        // Add to buffer
        this.outputBuffer += content;

        // Trim buffer if too large
        if (this.outputBuffer.length > this.bufferMaxSize) {
            this.outputBuffer = this.outputBuffer.slice(-this.bufferMaxSize);
        }

        // Detect potential commands (lines starting with $ or >)
        const commandMatch = content.match(/^[\$\>]\s*(.+)$/m);
        if (commandMatch) {
            this.addRecentCommand(commandMatch[1].trim());
        }

        // Check for error patterns
        const hasErrorPattern = ERROR_PATTERNS.some(pattern => pattern.test(content));
        const shouldIgnore = IGNORE_PATTERNS.some(pattern => pattern.test(content));

        if (hasErrorPattern && !shouldIgnore) {
            this.scheduleAnalysis();
        }
    }

    /**
     * Add a command to recent history
     * @param {string} command - The command that was executed
     */
    addRecentCommand(command) {
        this.recentCommands.push({
            command,
            timestamp: new Date()
        });

        // Keep only recent commands
        if (this.recentCommands.length > this.maxRecentCommands) {
            this.recentCommands.shift();
        }
    }

    /**
     * Schedule an analysis (debounced)
     */
    scheduleAnalysis() {
        // Clear existing timer
        if (this.analysisTimer) {
            clearTimeout(this.analysisTimer);
        }

        // Check minimum interval
        const timeSinceLastAnalysis = Date.now() - this.lastAnalysisTime;
        if (timeSinceLastAnalysis < this.minAnalysisInterval) {
            return;
        }

        // Schedule new analysis
        this.analysisTimer = setTimeout(() => {
            this.runAnalysis();
        }, this.analysisDebounceMs);
    }

    /**
     * Run error analysis on buffered output
     */
    async runAnalysis() {
        if (this.pendingAnalysis || !this.enabled || !this.aiProviderManager) return;

        this.pendingAnalysis = true;
        this.lastAnalysisTime = Date.now();

        try {
            const context = {
                cwd: this.terminalInfo.cwd,
                shell: this.terminalInfo.shell,
                tool: this.terminalInfo.tool,
                recentCommands: this.recentCommands.map(c => c.command)
            };

            console.log(`[TerminalAgent] 🔍 Analyzing terminal ${this.terminalId}...`);

            // Build prompt for analysis
            const userPrompt = `Terminal Context:
- Working Directory: ${context.cwd || 'unknown'}
- Shell: ${context.shell || 'unknown'}
- Tool: ${context.tool || 'unknown'}
- Recent Commands: ${context.recentCommands.join(', ') || 'none'}

Terminal Output (last ${this.outputBuffer.length} chars):
${this.outputBuffer.slice(-4000)}

Analyze this output for errors.`;

            // Use AIProviderManager for analysis
            const response = await this.aiProviderManager.chat(
                [{ role: 'user', content: userPrompt }],
                {
                    system: this.systemPrompt,
                    provider: this.provider,
                    model: this.model
                }
            );

            // Parse JSON response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('[TerminalAgent] Could not parse JSON response');
                return;
            }

            const analysis = JSON.parse(jsonMatch[0]);

            if (analysis.hasError && analysis.confidence > 0.6) {
                // Emit error detected event
                this.emitTimelineEvent('error_detected', {
                    errorType: analysis.errorType,
                    summary: analysis.errorSummary,
                    explanation: analysis.explanation,
                    confidence: analysis.confidence
                });

                // If we have suggested commands, emit suggestions
                if (analysis.suggestedCommands && analysis.suggestedCommands.length > 0) {
                    this.emitTimelineEvent('command_suggested', {
                        commands: analysis.suggestedCommands,
                        context: analysis.errorSummary
                    });
                }

                // Store last error for context
                this.lastError = analysis;
            }

        } catch (error) {
            console.error(`[TerminalAgent] Analysis error:`, error.message);
        } finally {
            this.pendingAnalysis = false;
        }
    }

    /**
     * Emit a timeline event
     * @param {string} type - Event type
     * @param {Object} data - Event data
     */
    emitTimelineEvent(type, data) {
        const event = {
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type,
            terminalId: this.terminalId,
            timestamp: new Date(),
            data
        };

        console.log(`[TerminalAgent] 📢 Timeline event: ${type} for ${this.terminalId}`);

        this.onTimelineEvent(event);
    }

    /**
     * User requests explanation of current error
     * @returns {Promise<string>} Explanation text
     */
    async requestExplanation() {
        if (!this.lastError) {
            return "No recent errors to explain.";
        }

        return this.lastError.explanation || "Unable to generate explanation.";
    }

    /**
     * User wants to apply a suggested command
     * @param {string} command - The command to apply
     * @returns {Object} Command execution request
     */
    applySuggestion(command) {
        this.emitTimelineEvent('action_taken', {
            action: 'apply_command',
            command
        });

        return {
            action: 'execute',
            terminalId: this.terminalId,
            command
        };
    }

    /**
     * Clear the output buffer
     */
    clearBuffer() {
        this.outputBuffer = '';
        this.lastError = null;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.analysisTimer) {
            clearTimeout(this.analysisTimer);
        }
        console.log(`[TerminalAgent] 🗑️ Agent destroyed for terminal ${this.terminalId}`);
    }
}

module.exports = { TerminalAgent, ERROR_PATTERNS, IGNORE_PATTERNS };

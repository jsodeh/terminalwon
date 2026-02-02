/**
 * ClaudeClient - Anthropic API wrapper for TerminalWON agents
 * 
 * Provides a simple interface for Claude interactions with:
 * - Terminal error analysis
 * - Command suggestions
 * - Context-aware assistance
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

class ClaudeClient {
    constructor(options = {}) {
        this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
        this.model = options.model || process.env.TERMINALWON_AGENT_MODEL || 'claude-sonnet-4-20250514';
        this.maxTokens = options.maxTokens || 1024;

        if (!this.apiKey) {
            console.warn('[ClaudeClient] ⚠️ No ANTHROPIC_API_KEY found - agents will be disabled');
        }
    }

    /**
     * Check if the client is configured and ready
     */
    isReady() {
        return !!this.apiKey;
    }

    /**
     * Send a message to Claude and get a response
     * @param {Object} options - Request options
     * @param {string} options.system - System prompt
     * @param {Array} options.messages - Conversation messages
     * @returns {Promise<string>} Claude's response text
     */
    async chat(options) {
        if (!this.isReady()) {
            throw new Error('ClaudeClient not configured - missing API key');
        }

        const { system, messages } = options;

        try {
            const response = await fetch(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: this.maxTokens,
                    system: system,
                    messages: messages
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Anthropic API error: ${response.status} - ${error}`);
            }

            const data = await response.json();

            // Extract text from response
            if (data.content && data.content[0] && data.content[0].type === 'text') {
                return data.content[0].text;
            }

            return '';
        } catch (error) {
            console.error('[ClaudeClient] API error:', error.message);
            throw error;
        }
    }

    /**
     * Analyze terminal output for errors and issues
     * @param {string} terminalOutput - The terminal output to analyze
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} Analysis result with errors and suggestions
     */
    async analyzeTerminalOutput(terminalOutput, context = {}) {
        const system = `You are a terminal assistant helping developers understand and fix errors.
Analyze terminal output and provide helpful insights.

Respond in JSON format with this structure:
{
  "hasError": boolean,
  "errorType": "compilation" | "runtime" | "permission" | "network" | "dependency" | "syntax" | "other" | null,
  "errorSummary": "Brief one-line description of the error" | null,
  "explanation": "Detailed explanation of what went wrong",
  "suggestedCommands": ["command1", "command2"],
  "confidence": 0.0-1.0
}

Only respond with valid JSON, no additional text.`;

        const userMessage = `Terminal output:
\`\`\`
${terminalOutput.slice(-4000)}
\`\`\`

${context.cwd ? `Working directory: ${context.cwd}` : ''}
${context.shell ? `Shell: ${context.shell}` : ''}
${context.tool ? `Tool: ${context.tool}` : ''}`;

        try {
            const response = await this.chat({
                system,
                messages: [{ role: 'user', content: userMessage }]
            });

            // Parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return { hasError: false, confidence: 0 };
        } catch (error) {
            console.error('[ClaudeClient] Analysis error:', error.message);
            return { hasError: false, confidence: 0, error: error.message };
        }
    }

    /**
     * Generate a helpful explanation for a specific error
     * @param {string} errorMessage - The error message
     * @param {string} context - Additional context
     * @returns {Promise<string>} Human-friendly explanation
     */
    async explainError(errorMessage, context = '') {
        const system = `You are a helpful terminal assistant. Explain errors in simple, clear language.
Keep explanations concise (2-3 sentences max). Focus on what went wrong and how to fix it.`;

        const response = await this.chat({
            system,
            messages: [{
                role: 'user',
                content: `Explain this error:\n${errorMessage}\n\n${context ? `Context: ${context}` : ''}`
            }]
        });

        return response;
    }

    /**
     * Suggest commands to fix an issue
     * @param {string} issue - Description of the issue
     * @param {Object} context - Terminal context
     * @returns {Promise<Array<string>>} List of suggested commands
     */
    async suggestFix(issue, context = {}) {
        const system = `You are a terminal assistant. Suggest commands to fix issues.
Respond with a JSON array of command strings, ordered by likelihood to help.
Example: ["npm install", "npm cache clean --force"]
Only respond with the JSON array, no additional text.`;

        const userMessage = `Issue: ${issue}
${context.cwd ? `Directory: ${context.cwd}` : ''}
${context.shell ? `Shell: ${context.shell}` : ''}
${context.recentCommands ? `Recent commands: ${context.recentCommands.join(', ')}` : ''}`;

        try {
            const response = await this.chat({
                system,
                messages: [{ role: 'user', content: userMessage }]
            });

            const arrayMatch = response.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }

            return [];
        } catch (error) {
            console.error('[ClaudeClient] Suggest fix error:', error.message);
            return [];
        }
    }
}

module.exports = { ClaudeClient };

/**
 * AI Provider Manager
 * 
 * Manages multiple AI providers with unified interface.
 * Supports: Anthropic, OpenAI, xAI (Grok), Google Gemini, Manus, Ollama
 */

const PROVIDERS = {
    anthropic: {
        name: 'Anthropic',
        models: [
            { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'premium' },
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'standard' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', tier: 'fast' }
        ],
        baseUrl: 'https://api.anthropic.com',
        headers: (apiKey) => ({
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        }),
        formatRequest: (messages, model, options) => ({
            model,
            max_tokens: options.maxTokens || 4096,
            system: options.system || '',
            messages: messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
        }),
        parseResponse: (response) => response.content?.[0]?.text || ''
    },

    openai: {
        name: 'OpenAI',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', tier: 'premium' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', tier: 'standard' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'fast' },
            { id: 'o1-preview', name: 'o1 Preview', tier: 'reasoning' },
            { id: 'o1-mini', name: 'o1 Mini', tier: 'reasoning' }
        ],
        baseUrl: 'https://api.openai.com/v1',
        headers: (apiKey) => ({
            'Authorization': `Bearer ${apiKey}`,
            'content-type': 'application/json'
        }),
        formatRequest: (messages, model, options) => ({
            model,
            max_tokens: options.maxTokens || 4096,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                ...messages
            ]
        }),
        parseResponse: (response) => response.choices?.[0]?.message?.content || ''
    },

    xai: {
        name: 'xAI (Grok)',
        models: [
            { id: 'grok-2', name: 'Grok 2', tier: 'premium' },
            { id: 'grok-beta', name: 'Grok Beta', tier: 'standard' }
        ],
        baseUrl: 'https://api.x.ai/v1',
        headers: (apiKey) => ({
            'Authorization': `Bearer ${apiKey}`,
            'content-type': 'application/json'
        }),
        formatRequest: (messages, model, options) => ({
            model,
            max_tokens: options.maxTokens || 4096,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                ...messages
            ]
        }),
        parseResponse: (response) => response.choices?.[0]?.message?.content || ''
    },

    google: {
        name: 'Google Gemini',
        models: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tier: 'fast' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'premium' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tier: 'fast' }
        ],
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        headers: (apiKey) => ({
            'content-type': 'application/json'
        }),
        formatRequest: (messages, model, options) => ({
            contents: messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            })),
            systemInstruction: options.system ? { parts: [{ text: options.system }] } : undefined,
            generationConfig: {
                maxOutputTokens: options.maxTokens || 4096
            }
        }),
        getEndpoint: (model, apiKey) => `/models/${model}:generateContent?key=${apiKey}`,
        parseResponse: (response) => response.candidates?.[0]?.content?.parts?.[0]?.text || ''
    },

    manus: {
        name: 'Manus AI',
        models: [
            { id: 'manus-1', name: 'Manus 1', tier: 'standard' }
        ],
        baseUrl: 'https://api.manus.ai/v1',
        headers: (apiKey) => ({
            'Authorization': `Bearer ${apiKey}`,
            'content-type': 'application/json'
        }),
        formatRequest: (messages, model, options) => ({
            model,
            max_tokens: options.maxTokens || 4096,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                ...messages
            ]
        }),
        parseResponse: (response) => response.choices?.[0]?.message?.content || ''
    },

    ollama: {
        name: 'Ollama (Local)',
        models: [
            { id: 'llama3.2', name: 'Llama 3.2', tier: 'local' },
            { id: 'mistral', name: 'Mistral', tier: 'local' },
            { id: 'codellama', name: 'Code Llama', tier: 'local' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder', tier: 'local' },
            { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', tier: 'local' }
        ],
        baseUrl: 'http://localhost:11434',
        headers: () => ({
            'content-type': 'application/json'
        }),
        formatRequest: (messages, model, options) => ({
            model,
            messages: [
                ...(options.system ? [{ role: 'system', content: options.system }] : []),
                ...messages
            ],
            stream: false
        }),
        parseResponse: (response) => response.message?.content || ''
    }
};

class AIProviderManager {
    constructor(configManager) {
        this.configManager = configManager;
        this.providers = PROVIDERS;
    }

    /**
     * Get all available providers with their status
     */
    getProviders() {
        const config = this.configManager?.getConfig() || {};
        const providerConfigs = config.providers || {};

        return Object.entries(this.providers).map(([id, provider]) => ({
            id,
            name: provider.name,
            models: provider.models,
            enabled: providerConfigs[id]?.enabled || false,
            hasKey: !!(providerConfigs[id]?.apiKey)
        }));
    }

    /**
     * Get a specific provider's configuration
     */
    getProvider(providerId) {
        return this.providers[providerId] || null;
    }

    /**
     * Test connection to a provider
     */
    async testConnection(providerId, apiKey) {
        const provider = this.providers[providerId];
        if (!provider) {
            return { success: false, error: 'Unknown provider' };
        }

        try {
            let url = provider.baseUrl;
            let body;

            // Use a minimal test request
            if (providerId === 'anthropic') {
                url += '/v1/messages';
                body = provider.formatRequest(
                    [{ role: 'user', content: 'Hi' }],
                    provider.models[0].id,
                    { maxTokens: 10 }
                );
            } else if (providerId === 'google') {
                const model = provider.models[0].id;
                url += provider.getEndpoint(model, apiKey);
                body = provider.formatRequest(
                    [{ role: 'user', content: 'Hi' }],
                    model,
                    { maxTokens: 10 }
                );
            } else if (providerId === 'ollama') {
                url += '/api/tags';
                // Just check if Ollama is running
                const response = await fetch(url);
                return { success: response.ok, models: (await response.json()).models };
            } else {
                url += '/chat/completions';
                body = provider.formatRequest(
                    [{ role: 'user', content: 'Hi' }],
                    provider.models[0].id,
                    { maxTokens: 10 }
                );
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: provider.headers(apiKey),
                body: JSON.stringify(body)
            });

            if (response.ok) {
                return { success: true };
            } else {
                const error = await response.json();
                return { success: false, error: error.error?.message || 'API error' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Send a chat message using the configured provider
     */
    async chat(messages, options = {}) {
        const config = this.configManager?.getConfig() || {};
        const providerId = options.provider || config.defaultProvider || 'anthropic';
        const modelId = options.model || config.defaultModel || this.providers[providerId]?.models[0]?.id;

        const provider = this.providers[providerId];
        if (!provider) {
            throw new Error(`Unknown provider: ${providerId}`);
        }

        const apiKey = config.providers?.[providerId]?.apiKey;
        if (!apiKey && providerId !== 'ollama') {
            throw new Error(`No API key configured for ${provider.name}`);
        }

        let url = provider.baseUrl;
        if (providerId === 'anthropic') {
            url += '/v1/messages';
        } else if (providerId === 'google') {
            url += provider.getEndpoint(modelId, apiKey);
        } else if (providerId === 'ollama') {
            url += '/api/chat';
        } else {
            url += '/chat/completions';
        }

        const body = provider.formatRequest(messages, modelId, options);

        const response = await fetch(url, {
            method: 'POST',
            headers: provider.headers(apiKey),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return {
            content: provider.parseResponse(data),
            provider: providerId,
            model: modelId
        };
    }
}

module.exports = { AIProviderManager, PROVIDERS };

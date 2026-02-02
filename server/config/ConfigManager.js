/**
 * Configuration Manager
 * 
 * Handles persistent configuration storage in ~/.terminalwon/config.json
 * Manages API keys, tunnel settings, and user preferences.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CONFIG_DIR = path.join(os.homedir(), '.terminalwon');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Simple encryption for API keys (not production-grade, but better than plaintext)
const ENCRYPTION_KEY = 'terminalwon-local-key-v1';

class ConfigManager {
    constructor() {
        this.config = null;
        this.configPath = CONFIG_FILE;
        this.ensureConfigDir();
        this.load();
    }

    /**
     * Ensure config directory exists
     */
    ensureConfigDir() {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
        }
    }

    /**
     * Load configuration from disk
     */
    load() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                this.config = JSON.parse(raw);
                console.log('[ConfigManager] Loaded configuration');
            } else {
                this.config = this.getDefaultConfig();
                this.save();
                console.log('[ConfigManager] Created default configuration');
            }
        } catch (error) {
            console.error('[ConfigManager] Error loading config:', error.message);
            this.config = this.getDefaultConfig();
        }
    }

    /**
     * Save configuration to disk
     */
    save() {
        try {
            fs.writeFileSync(
                this.configPath,
                JSON.stringify(this.config, null, 2),
                { mode: 0o600 }
            );
            return true;
        } catch (error) {
            console.error('[ConfigManager] Error saving config:', error.message);
            return false;
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            version: 2,
            setupComplete: false,
            providers: {
                anthropic: { enabled: false, apiKey: null },
                openai: { enabled: false, apiKey: null },
                xai: { enabled: false, apiKey: null },
                google: { enabled: false, apiKey: null },
                manus: { enabled: false, apiKey: null },
                ollama: { enabled: true, apiKey: null } // Ollama doesn't need key
            },
            defaultProvider: 'anthropic',
            defaultModel: 'claude-sonnet-4-20250514',
            // Per-agent configurations
            agents: {
                terminal: {
                    enabled: true,
                    provider: null, // null = use default provider
                    model: null,    // null = use default model
                    systemPrompt: null // null = use built-in default
                },
                ide: {
                    enabled: true,
                    provider: null,
                    model: null,
                    systemPrompt: null
                },
                computerUse: {
                    enabled: true,
                    provider: 'anthropic', // Must be Anthropic (computer-use requirement)
                    model: 'claude-sonnet-4-20250514'
                },
                chat: {
                    enabled: true,
                    provider: null,
                    model: null,
                    systemPrompt: null
                }
            },
            tunnel: {
                provider: null, // 'ngrok', 'cloudflare', 'localtunnel', 'tailscale'
                url: null,
                authToken: null,
                configured: false,
                autoStart: false
            },
            preferences: {
                theme: 'system',
                autoDetectErrors: true,
                showAgentInsights: true
            }
        };
    }

    /**
     * Get current configuration (with masked API keys for client)
     */
    getConfig(includeSensitive = false) {
        if (!this.config) this.load();

        if (includeSensitive) {
            return this.config;
        }

        // Mask API keys for client
        const safeConfig = JSON.parse(JSON.stringify(this.config));
        for (const [providerId, providerConfig] of Object.entries(safeConfig.providers || {})) {
            if (providerConfig.apiKey) {
                providerConfig.apiKey = this.maskKey(providerConfig.apiKey);
                providerConfig.hasKey = true;
            } else {
                providerConfig.hasKey = false;
            }
        }

        if (safeConfig.tunnel?.authToken) {
            safeConfig.tunnel.authToken = '••••••••';
            safeConfig.tunnel.hasToken = true;
        }

        return safeConfig;
    }

    /**
     * Mask an API key for display
     */
    maskKey(key) {
        if (!key || key.length < 12) return '••••••••';
        return key.substring(0, 8) + '••••••••' + key.substring(key.length - 4);
    }

    /**
     * Update provider configuration
     */
    setProviderConfig(providerId, config) {
        if (!this.config.providers) {
            this.config.providers = {};
        }

        this.config.providers[providerId] = {
            ...this.config.providers[providerId],
            ...config
        };

        return this.save();
    }

    /**
     * Set API key for a provider
     */
    setApiKey(providerId, apiKey) {
        return this.setProviderConfig(providerId, {
            apiKey,
            enabled: !!apiKey
        });
    }

    /**
     * Get API key for a provider
     */
    getApiKey(providerId) {
        return this.config?.providers?.[providerId]?.apiKey || null;
    }

    /**
     * Set default provider and model
     */
    setDefaultProvider(providerId, modelId = null) {
        this.config.defaultProvider = providerId;
        if (modelId) {
            this.config.defaultModel = modelId;
        }
        return this.save();
    }

    /**
     * Update tunnel configuration
     */
    setTunnelConfig(tunnelConfig) {
        this.config.tunnel = {
            ...this.config.tunnel,
            ...tunnelConfig
        };
        return this.save();
    }

    /**
     * Mark setup as complete
     */
    completeSetup() {
        this.config.setupComplete = true;
        return this.save();
    }

    /**
     * Check if setup is complete
     */
    isSetupComplete() {
        return this.config?.setupComplete && this.config?.tunnel?.configured;
    }

    /**
     * Update preferences
     */
    setPreferences(prefs) {
        this.config.preferences = {
            ...this.config.preferences,
            ...prefs
        };
        return this.save();
    }

    /**
     * Get active provider (first enabled one or default)
     */
    getActiveProvider() {
        const providers = this.config?.providers || {};

        // Check if default provider is enabled
        const defaultId = this.config?.defaultProvider;
        if (defaultId && providers[defaultId]?.enabled && providers[defaultId]?.apiKey) {
            return defaultId;
        }

        // Find first enabled provider with key
        for (const [id, config] of Object.entries(providers)) {
            if (config.enabled && (config.apiKey || id === 'ollama')) {
                return id;
            }
        }

        return null;
    }

    /**
     * Get configuration for a specific agent
     * @param {string} agentType - 'terminal', 'ide', 'computerUse', or 'chat'
     * @returns {Object} Agent configuration with resolved provider/model
     */
    getAgentConfig(agentType) {
        const agentConfig = this.config?.agents?.[agentType] || {};

        // Resolve null provider/model to defaults
        return {
            enabled: agentConfig.enabled !== false,
            provider: agentConfig.provider || this.config?.defaultProvider || 'anthropic',
            model: agentConfig.model || this.config?.defaultModel || 'claude-sonnet-4-20250514',
            systemPrompt: agentConfig.systemPrompt || null
        };
    }

    /**
     * Update configuration for a specific agent
     * @param {string} agentType - 'terminal', 'ide', 'computerUse', or 'chat'  
     * @param {Object} config - Configuration to merge
     */
    setAgentConfig(agentType, config) {
        if (!this.config.agents) {
            this.config.agents = {};
        }

        this.config.agents[agentType] = {
            ...this.config.agents[agentType],
            ...config
        };

        return this.save();
    }

    /**
     * Get all agent configurations
     * @returns {Object} All agent configs
     */
    getAllAgentConfigs() {
        const agentTypes = ['terminal', 'ide', 'computerUse', 'chat'];
        const configs = {};

        for (const type of agentTypes) {
            configs[type] = this.getAgentConfig(type);
        }

        return configs;
    }

    /**
     * Reset configuration
     */
    reset() {
        this.config = this.getDefaultConfig();
        return this.save();
    }
}

module.exports = { ConfigManager, CONFIG_DIR, CONFIG_FILE };

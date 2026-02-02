/**
 * TunnelManager - Subprocess control for tunnel tools
 * 
 * Manages ngrok, cloudflared, localtunnel, and other tunnel tools.
 * Supports auto-detection, start/stop, and URL parsing.
 */

const { spawn, execSync } = require('child_process');
const EventEmitter = require('events');

// Tunnel tool configurations
const TUNNEL_TOOLS = {
    ngrok: {
        name: 'ngrok',
        displayName: 'ngrok',
        command: 'ngrok',
        args: (port) => ['http', port.toString()],
        urlPattern: /https?:\/\/[a-zA-Z0-9-]+\.ngrok(-free)?\.app/,
        installCmd: 'brew install ngrok/ngrok/ngrok',
        website: 'https://ngrok.com'
    },
    cloudflare: {
        name: 'cloudflare',
        displayName: 'Cloudflare Tunnel',
        command: 'cloudflared',
        args: (port) => ['tunnel', '--url', `http://localhost:${port}`],
        urlPattern: /https?:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/,
        installCmd: 'brew install cloudflared',
        website: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-apps'
    },
    localtunnel: {
        name: 'localtunnel',
        displayName: 'localtunnel',
        command: 'lt',
        args: (port) => ['--port', port.toString()],
        urlPattern: /https?:\/\/[a-zA-Z0-9-]+\.loca\.lt/,
        installCmd: 'npm install -g localtunnel',
        website: 'https://localtunnel.me'
    },
    bore: {
        name: 'bore',
        displayName: 'bore.pub',
        command: 'bore',
        args: (port) => ['local', port.toString(), '--to', 'bore.pub'],
        urlPattern: /bore\.pub:\d+/,
        installCmd: 'brew install ekzhang/bore/bore',
        website: 'https://github.com/ekzhang/bore'
    }
};

class TunnelManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.port = options.port || 3001;
        this.process = null;
        this.provider = null;
        this.url = null;
        this.status = 'stopped'; // 'stopped', 'starting', 'running', 'error'
        this.lastError = null;
        this.outputBuffer = '';

        console.log('[TunnelManager] Initialized');
    }

    /**
     * Detect which tunnel tools are installed
     * @returns {Object} Map of tool name to installed status
     */
    detectInstalledTools() {
        const results = {};

        for (const [id, tool] of Object.entries(TUNNEL_TOOLS)) {
            try {
                execSync(`which ${tool.command}`, { stdio: 'ignore' });
                results[id] = {
                    installed: true,
                    ...tool
                };
            } catch {
                results[id] = {
                    installed: false,
                    ...tool
                };
            }
        }

        console.log('[TunnelManager] Detected tools:',
            Object.entries(results)
                .filter(([_, v]) => v.installed)
                .map(([k]) => k)
                .join(', ') || 'none'
        );

        return results;
    }

    /**
     * Start a tunnel using the specified provider
     * @param {string} provider - Tunnel provider ID
     * @returns {Promise<{success: boolean, url?: string, error?: string}>}
     */
    async startTunnel(provider) {
        if (this.process) {
            return { success: false, error: 'Tunnel already running' };
        }

        const tool = TUNNEL_TOOLS[provider];
        if (!tool) {
            return { success: false, error: `Unknown provider: ${provider}` };
        }

        // Check if tool is installed
        const tools = this.detectInstalledTools();
        if (!tools[provider]?.installed) {
            return {
                success: false,
                error: `${tool.displayName} not installed. Run: ${tool.installCmd}`
            };
        }

        this.provider = provider;
        this.status = 'starting';
        this.url = null;
        this.lastError = null;
        this.outputBuffer = '';

        return new Promise((resolve) => {
            try {
                const args = tool.args(this.port);
                console.log(`[TunnelManager] Starting: ${tool.command} ${args.join(' ')}`);

                this.process = spawn(tool.command, args, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false
                });

                // Set a timeout for URL detection
                const timeout = setTimeout(() => {
                    if (!this.url) {
                        console.log('[TunnelManager] URL detection timeout');
                        // Still might be running, just URL not detected yet
                        if (this.status === 'starting') {
                            this.status = 'running';
                            resolve({
                                success: true,
                                message: 'Tunnel started but URL not auto-detected. Check terminal output.'
                            });
                        }
                    }
                }, 15000);

                this.process.stdout.on('data', (data) => {
                    const output = data.toString();
                    this.outputBuffer += output;
                    console.log(`[TunnelManager] stdout: ${output.trim()}`);

                    // Try to extract URL
                    const urlMatch = output.match(tool.urlPattern) ||
                        this.outputBuffer.match(tool.urlPattern);
                    if (urlMatch && !this.url) {
                        this.url = urlMatch[0];
                        if (!this.url.startsWith('http')) {
                            this.url = `https://${this.url}`;
                        }
                        this.status = 'running';
                        clearTimeout(timeout);
                        console.log(`[TunnelManager] URL detected: ${this.url}`);
                        this.emit('url', this.url);
                        resolve({ success: true, url: this.url });
                    }
                });

                this.process.stderr.on('data', (data) => {
                    const output = data.toString();
                    this.outputBuffer += output;
                    console.log(`[TunnelManager] stderr: ${output.trim()}`);

                    // Some tools output URL to stderr
                    const urlMatch = output.match(tool.urlPattern);
                    if (urlMatch && !this.url) {
                        this.url = urlMatch[0];
                        if (!this.url.startsWith('http')) {
                            this.url = `https://${this.url}`;
                        }
                        this.status = 'running';
                        clearTimeout(timeout);
                        console.log(`[TunnelManager] URL detected (stderr): ${this.url}`);
                        this.emit('url', this.url);
                        resolve({ success: true, url: this.url });
                    }
                });

                this.process.on('error', (error) => {
                    console.error(`[TunnelManager] Process error: ${error.message}`);
                    this.status = 'error';
                    this.lastError = error.message;
                    clearTimeout(timeout);
                    this.process = null;
                    this.emit('error', error);
                    resolve({ success: false, error: error.message });
                });

                this.process.on('exit', (code, signal) => {
                    console.log(`[TunnelManager] Process exited: code=${code}, signal=${signal}`);
                    this.status = 'stopped';
                    this.process = null;
                    clearTimeout(timeout);
                    this.emit('stopped', { code, signal });

                    if (this.status === 'starting') {
                        resolve({
                            success: false,
                            error: `Tunnel exited unexpectedly with code ${code}`
                        });
                    }
                });

            } catch (error) {
                console.error(`[TunnelManager] Start error: ${error.message}`);
                this.status = 'error';
                this.lastError = error.message;
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * Stop the running tunnel
     * @returns {{success: boolean}}
     */
    stopTunnel() {
        if (!this.process) {
            return { success: true, message: 'No tunnel running' };
        }

        try {
            console.log('[TunnelManager] Stopping tunnel...');
            this.process.kill('SIGTERM');

            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (this.process) {
                    this.process.kill('SIGKILL');
                }
            }, 5000);

            return { success: true };
        } catch (error) {
            console.error(`[TunnelManager] Stop error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current tunnel status
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            status: this.status,
            provider: this.provider,
            url: this.url,
            isRunning: this.process !== null,
            lastError: this.lastError,
            port: this.port
        };
    }

    /**
     * Restart tunnel with same provider
     * @returns {Promise<Object>}
     */
    async restartTunnel() {
        const currentProvider = this.provider;
        if (!currentProvider) {
            return { success: false, error: 'No previous provider to restart' };
        }

        this.stopTunnel();

        // Wait for process to fully stop
        await new Promise(resolve => setTimeout(resolve, 2000));

        return this.startTunnel(currentProvider);
    }

    /**
     * Cleanup on shutdown
     */
    destroy() {
        this.stopTunnel();
        this.removeAllListeners();
        console.log('[TunnelManager] Destroyed');
    }
}

module.exports = { TunnelManager, TUNNEL_TOOLS };

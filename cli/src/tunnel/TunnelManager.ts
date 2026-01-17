/**
 * Tunnel Manager
 * 
 * Provides easy remote access by wrapping tunneling services like ngrok.
 * Allows open source users to access TerminalWON from anywhere.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface TunnelOptions {
  port: number;
  service?: 'ngrok' | 'localtunnel';
  authToken?: string;
  subdomain?: string;
}

export interface TunnelInfo {
  url: string;
  service: string;
  port: number;
}

export class TunnelManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private _url: string | null = null;
  private _isRunning = false;

  constructor(private options: TunnelOptions) {
    super();
  }

  /**
   * Start the tunnel
   */
  async start(): Promise<TunnelInfo> {
    const service = this.options.service || 'ngrok';

    if (service === 'ngrok') {
      return this.startNgrok();
    } else if (service === 'localtunnel') {
      return this.startLocaltunnel();
    } else {
      throw new Error(`Unknown tunnel service: ${service}`);
    }
  }

  /**
   * Start ngrok tunnel
   */
  private async startNgrok(): Promise<TunnelInfo> {
    return new Promise((resolve, reject) => {
      // Check if ngrok is installed
      const checkProcess = spawn('ngrok', ['version'], { shell: true });
      
      checkProcess.on('error', () => {
        reject(new Error(
          'ngrok is not installed. Install it from https://ngrok.com/download\n' +
          'Or use: brew install ngrok (macOS) / choco install ngrok (Windows)'
        ));
      });

      checkProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('ngrok is not installed or not in PATH'));
          return;
        }

        // Start ngrok
        const args = ['http', String(this.options.port)];
        
        if (this.options.authToken) {
          // Set auth token first
          const authProcess = spawn('ngrok', ['config', 'add-authtoken', this.options.authToken], { shell: true });
          authProcess.on('close', () => {
            this.launchNgrok(args, resolve, reject);
          });
        } else {
          this.launchNgrok(args, resolve, reject);
        }
      });
    });
  }

  private launchNgrok(args: string[], resolve: Function, reject: Function): void {
    this.process = spawn('ngrok', args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this._isRunning = true;

    // ngrok outputs JSON to stdout when using --log=stdout
    // But by default we need to query the API
    setTimeout(async () => {
      try {
        const url = await this.getNgrokUrl();
        this._url = url;
        resolve({
          url,
          service: 'ngrok',
          port: this.options.port
        });
      } catch (e) {
        reject(new Error('Failed to get ngrok URL. Make sure ngrok is running correctly.'));
      }
    }, 2000);

    this.process.on('error', (error) => {
      this._isRunning = false;
      this.emit('error', error);
    });

    this.process.on('close', (code) => {
      this._isRunning = false;
      this.emit('close', code);
    });
  }

  /**
   * Get ngrok URL from local API
   */
  private async getNgrokUrl(): Promise<string> {
    // ngrok exposes a local API at port 4040
    const response = await fetch('http://localhost:4040/api/tunnels');
    const data = await response.json() as { tunnels: Array<{ public_url: string; proto: string }> };
    
    // Find HTTPS tunnel
    const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
    if (httpsTunnel) {
      return httpsTunnel.public_url;
    }
    
    // Fall back to any tunnel
    if (data.tunnels.length > 0) {
      return data.tunnels[0].public_url;
    }
    
    throw new Error('No tunnels found');
  }

  /**
   * Start localtunnel
   */
  private async startLocaltunnel(): Promise<TunnelInfo> {
    return new Promise((resolve, reject) => {
      const args = ['--port', String(this.options.port)];
      
      if (this.options.subdomain) {
        args.push('--subdomain', this.options.subdomain);
      }

      this.process = spawn('npx', ['localtunnel', ...args], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this._isRunning = true;

      let output = '';

      this.process.stdout?.on('data', (data) => {
        output += data.toString();
        
        // localtunnel outputs: "your url is: https://xxx.loca.lt"
        const match = output.match(/your url is: (https?:\/\/[^\s]+)/i);
        if (match) {
          this._url = match[1];
          resolve({
            url: match[1],
            service: 'localtunnel',
            port: this.options.port
          });
        }
      });

      this.process.stderr?.on('data', (data) => {
        const error = data.toString();
        if (error.includes('error')) {
          reject(new Error(error));
        }
      });

      this.process.on('error', (error) => {
        this._isRunning = false;
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this._url) {
          reject(new Error('Timeout waiting for tunnel URL'));
        }
      }, 30000);
    });
  }

  /**
   * Stop the tunnel
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this._isRunning = false;
    this._url = null;
  }

  /**
   * Get tunnel URL
   */
  get url(): string | null {
    return this._url;
  }

  /**
   * Check if tunnel is running
   */
  get isRunning(): boolean {
    return this._isRunning;
  }
}

/**
 * Check if a tunneling service is available
 */
export async function checkTunnelService(service: 'ngrok' | 'localtunnel'): Promise<boolean> {
  return new Promise((resolve) => {
    const command = service === 'ngrok' ? 'ngrok' : 'npx';
    const args = service === 'ngrok' ? ['version'] : ['localtunnel', '--version'];
    
    const process = spawn(command, args, { shell: true, stdio: 'ignore' });
    
    process.on('error', () => resolve(false));
    process.on('close', (code) => resolve(code === 0));
  });
}

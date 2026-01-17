/**
 * PTY Session Manager
 * 
 * Creates a wrapped shell session with full PTY streaming.
 * This is the core of CLI-first TerminalWON - it wraps your shell
 * and streams ALL I/O to the hub while displaying locally.
 */

import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';

// Dynamic import for node-pty (may not be available)
let pty: any = null;

export interface PTYSessionOptions {
  name?: string;
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
}

export interface PTYSessionInfo {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  pid: number;
  cols: number;
  rows: number;
  projectName: string;
  createdAt: Date;
}

export class PTYSession extends EventEmitter {
  private ptyProcess: any = null;
  private _info: PTYSessionInfo;
  private outputBuffer: string[] = [];
  private maxBufferLines = 1000;
  private _isRunning = false;

  constructor(private options: PTYSessionOptions = {}) {
    super();
    
    const cwd = options.cwd || process.cwd();
    const shell = options.shell || this.getDefaultShell();
    
    this._info = {
      id: this.generateId(),
      name: options.name || this.detectProjectName(cwd),
      cwd,
      shell,
      pid: 0,
      cols: options.cols || process.stdout.columns || 120,
      rows: options.rows || process.stdout.rows || 30,
      projectName: this.detectProjectName(cwd),
      createdAt: new Date()
    };
  }

  /**
   * Initialize node-pty (lazy load)
   */
  private async initPty(): Promise<boolean> {
    if (pty) return true;
    
    try {
      pty = require('node-pty');
      return true;
    } catch (e) {
      console.error('node-pty not available:', (e as Error).message);
      return false;
    }
  }

  /**
   * Start the PTY session
   */
  async start(): Promise<void> {
    const hasPty = await this.initPty();
    
    if (!hasPty) {
      throw new Error('node-pty is required for PTY sessions. Run: npm install node-pty');
    }

    try {
      this.ptyProcess = pty.spawn(this._info.shell, [], {
        name: 'xterm-256color',
        cols: this._info.cols,
        rows: this._info.rows,
        cwd: this._info.cwd,
        env: {
          ...process.env,
          ...this.options.env,
          TERM: 'xterm-256color',
          TERM_PROGRAM: 'TerminalWON',
          TERMINALWON_SESSION: this._info.id,
          TERMINALWON_PROJECT: this._info.projectName
        }
      });

      this._info.pid = this.ptyProcess.pid;
      this._isRunning = true;

      // Handle PTY output
      this.ptyProcess.onData((data: string) => {
        // Buffer output
        this.bufferOutput(data);
        
        // Emit for streaming to hub
        this.emit('output', data);
        
        // Write to local stdout (so user sees it in their terminal)
        process.stdout.write(data);
      });

      // Handle PTY exit
      this.ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        this._isRunning = false;
        this.emit('exit', { exitCode, signal });
      });

      // Handle local stdin and forward to PTY
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.on('data', (data: Buffer) => {
        if (this.ptyProcess && this._isRunning) {
          this.ptyProcess.write(data.toString());
        }
      });

      // Handle terminal resize
      process.stdout.on('resize', () => {
        this.resize(process.stdout.columns, process.stdout.rows);
      });

      this.emit('started', this._info);

    } catch (error) {
      this._isRunning = false;
      throw error;
    }
  }

  /**
   * Write data to the PTY (from remote)
   */
  write(data: string): void {
    if (this.ptyProcess && this._isRunning) {
      this.ptyProcess.write(data);
    }
  }

  /**
   * Resize the PTY
   */
  resize(cols: number, rows: number): void {
    if (this.ptyProcess && this._isRunning) {
      this._info.cols = cols;
      this._info.rows = rows;
      this.ptyProcess.resize(cols, rows);
      this.emit('resize', { cols, rows });
    }
  }

  /**
   * Kill the PTY session
   */
  kill(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this._isRunning = false;
    }
  }

  /**
   * Get session info
   */
  get info(): PTYSessionInfo {
    return { ...this._info };
  }

  /**
   * Check if session is running
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get buffered output (for late joiners)
   */
  getBufferedOutput(): string {
    return this.outputBuffer.join('');
  }

  /**
   * Buffer output for history
   */
  private bufferOutput(data: string): void {
    // Split by lines and add to buffer
    const lines = data.split('\n');
    this.outputBuffer.push(...lines);
    
    // Trim buffer if too large
    if (this.outputBuffer.length > this.maxBufferLines) {
      this.outputBuffer = this.outputBuffer.slice(-this.maxBufferLines);
    }
  }

  /**
   * Get default shell for the platform
   */
  private getDefaultShell(): string {
    if (os.platform() === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/zsh';
  }

  /**
   * Detect project name from directory
   */
  private detectProjectName(cwd: string): string {
    // Try to get name from package.json
    try {
      const packageJsonPath = path.join(cwd, 'package.json');
      const packageJson = require(packageJsonPath);
      if (packageJson.name) {
        return packageJson.name;
      }
    } catch {
      // No package.json or can't read it
    }

    // Fall back to directory name
    return path.basename(cwd);
  }

  /**
   * Generate unique session ID
   */
  private generateId(): string {
    return `cli-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Cleanup on exit
   */
  dispose(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    this.kill();
    this.removeAllListeners();
  }
}

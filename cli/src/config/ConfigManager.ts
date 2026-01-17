/**
 * Configuration Manager
 * 
 * Manages CLI configuration stored in ~/.terminalwon/config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Config {
  hubUrl?: string;
  apiKey?: string;
  defaultName?: string;
  autoReconnect?: boolean;
}

const DEFAULT_CONFIG: Config = {
  hubUrl: 'ws://localhost:3002',
  autoReconnect: true
};

// Also check for old config with wrong port
const LEGACY_PORT_FIX = true;

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private config: Config;

  constructor() {
    this.configDir = path.join(os.homedir(), '.terminalwon');
    this.configPath = path.join(this.configDir, 'config.json');
    this.config = this.load();
  }

  /**
   * Load configuration from file
   */
  private load(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        
        // Fix legacy wrong port
        if (loaded.hubUrl === 'ws://localhost:3001') {
          loaded.hubUrl = 'ws://localhost:3002';
          this.config = loaded;
          this.save();
        }
        
        return loaded;
      }
    } catch (error) {
      // Ignore errors, use defaults
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save configuration to file
   */
  private save(): void {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      // Ignore save errors
    }
  }

  /**
   * Get a configuration value
   */
  get(key: keyof Config): string | boolean | undefined {
    return this.config[key];
  }

  /**
   * Set a configuration value
   */
  set(key: string, value: string | boolean): void {
    (this.config as any)[key] = value;
    this.save();
  }

  /**
   * Get all configuration
   */
  getAll(): Config {
    return { ...this.config };
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }

  /**
   * Delete a configuration value
   */
  delete(key: keyof Config): void {
    delete this.config[key];
    this.save();
  }
}

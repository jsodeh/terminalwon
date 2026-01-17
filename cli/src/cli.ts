#!/usr/bin/env node

/**
 * TerminalWON CLI
 * 
 * CLI-first terminal streaming tool. Run `terminalwon start` in any terminal
 * (IDE or standalone) to get full bidirectional streaming to your phone.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import { StreamingSession } from './session/StreamingSession';
import { TerminalWONClient } from './client/TerminalWONClient';
import { ConfigManager } from './config/ConfigManager';
import { TunnelManager, checkTunnelService } from './tunnel/TunnelManager';

const program = new Command();
const config = new ConfigManager();

// Active session (for cleanup)
let activeSession: StreamingSession | null = null;
let activeTunnel: TunnelManager | null = null;

program
  .name('terminalwon')
  .description('TerminalWON CLI - Stream any terminal to your phone')
  .version('2.0.0');

// ============================================
// START COMMAND - The main feature!
// ============================================
program
  .command('start')
  .description('Start a streaming terminal session (full PTY streaming)')
  .option('-n, --name <name>', 'Terminal name (defaults to project/folder name)')
  .option('-u, --url <url>', 'Hub WebSocket URL', 'ws://localhost:3002')
  .option('-k, --key <key>', 'API Key')
  .option('--no-reconnect', 'Disable auto-reconnect')
  .action(async (options) => {
    // Get hub URL
    const hubUrl = options.url || config.get('hubUrl') || 'ws://localhost:3002';
    const apiKey = options.key || config.get('apiKey') || 'cli-session';

    // Show startup banner
    console.log(boxen(
      chalk.bold.yellow('TerminalWON') + chalk.gray(' v2.0.0\n\n') +
      chalk.white('Starting streaming terminal session...\n') +
      chalk.gray('Hub: ') + chalk.cyan(hubUrl),
      { padding: 1, borderColor: 'yellow', borderStyle: 'round' }
    ));

    const spinner = ora('Connecting to hub...').start();

    try {
      // Create streaming session
      activeSession = new StreamingSession({
        hubUrl,
        apiKey,
        name: options.name,
        cwd: process.cwd(),
        reconnect: options.reconnect !== false
      });

      // Setup event handlers
      activeSession.on('connected', () => {
        spinner.succeed('Connected to TerminalWON Hub');
      });

      activeSession.on('disconnected', () => {
        console.log(chalk.yellow('\n⚠ Disconnected from hub (will reconnect...)'));
      });

      activeSession.on('error', (error) => {
        console.error(chalk.red(`\n✗ Hub error: ${error.message}`));
      });

      activeSession.on('exit', ({ exitCode }) => {
        console.log(chalk.gray(`\nSession ended (exit code: ${exitCode})`));
        process.exit(exitCode);
      });

      // Start the session
      const info = await activeSession.start();

      // Show success message (will be overwritten by shell prompt)
      console.log(boxen(
        chalk.green('✓ Streaming active!\n\n') +
        chalk.gray('Terminal: ') + chalk.white(info.name) + '\n' +
        chalk.gray('ID: ') + chalk.cyan(info.id) + '\n' +
        chalk.gray('Project: ') + chalk.white(info.projectName) + '\n' +
        chalk.gray('Shell: ') + chalk.white(info.shell) + '\n\n' +
        chalk.yellow('📱 Open your phone to control this terminal\n') +
        chalk.gray('Press Ctrl+D to exit'),
        { padding: 1, borderColor: 'green', borderStyle: 'round' }
      ));

      // The PTY session now takes over - user interacts with their shell
      // All I/O is streamed to the hub automatically

    } catch (error: any) {
      spinner.fail(`Failed to start: ${error.message}`);
      
      if (error.message.includes('node-pty')) {
        console.log(chalk.yellow('\nnode-pty is required for streaming. Install it:'));
        console.log(chalk.cyan('  npm install node-pty'));
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log(chalk.yellow('\nCannot connect to hub. Make sure it\'s running:'));
        console.log(chalk.cyan('  node hub-server.js'));
      }
      
      process.exit(1);
    }
  });

// ============================================
// CONNECT COMMAND - Legacy, for listing/exec
// ============================================
program
  .command('connect')
  .description('Connect to hub (for listing/executing on other terminals)')
  .option('-u, --url <url>', 'Hub WebSocket URL')
  .option('-k, --key <key>', 'API Key')
  .action(async (options) => {
    const spinner = ora('Connecting to TerminalWON Hub...').start();
    
    try {
      let hubUrl = options.url || config.get('hubUrl') || 'ws://localhost:3002';
      let apiKey = options.key || config.get('apiKey') || 'cli-session';

      const client = new TerminalWONClient(hubUrl, apiKey);
      await client.connect();
      
      spinner.succeed('Connected to TerminalWON Hub');
      
      console.log(boxen(
        chalk.green('✓ Connected!\n\n') +
        chalk.gray('Use ') + chalk.cyan('terminalwon list') + chalk.gray(' to see terminals\n') +
        chalk.gray('Use ') + chalk.cyan('terminalwon start') + chalk.gray(' for full streaming'),
        { padding: 1, borderColor: 'green' }
      ));

      // Keep connection alive for subsequent commands
      (global as any).terminalwonClient = client;

    } catch (error: any) {
      spinner.fail(`Connection failed: ${error.message}`);
      process.exit(1);
    }
  });

// ============================================
// LIST COMMAND
// ============================================
program
  .command('list')
  .description('List all active terminals')
  .option('-u, --url <url>', 'Hub WebSocket URL')
  .action(async (options) => {
    const hubUrl = options.url || config.get('hubUrl') || 'ws://localhost:3002';
    const spinner = ora('Fetching terminals...').start();
    
    try {
      const client = new TerminalWONClient(hubUrl, 'cli-list');
      await client.connect();
      
      const terminals = await client.getTerminals();
      spinner.stop();
      
      if (terminals.length === 0) {
        console.log(boxen(
          chalk.yellow('No active terminals\n\n') +
          chalk.gray('Start one with: ') + chalk.cyan('terminalwon start'),
          { padding: 1, borderColor: 'yellow' }
        ));
        client.disconnect();
        return;
      }

      console.log(chalk.bold('\n📟 Active Terminals:\n'));
      
      terminals.forEach((terminal: any, index: number) => {
        const statusIcon = terminal.status === 'active' ? '🟢' : '🟡';
        const streamIcon = terminal.streaming ? '📡' : '📋';
        
        console.log(
          `${statusIcon} ${chalk.bold(terminal.name || 'Unnamed')} ` +
          chalk.gray(`(${terminal.tool})`) + ' ' +
          streamIcon
        );
        console.log(
          chalk.gray('   ID: ') + chalk.cyan(terminal.id)
        );
        console.log(
          chalk.gray('   Path: ') + chalk.white(terminal.cwd || 'N/A')
        );
        if (terminal.projectName) {
          console.log(
            chalk.gray('   Project: ') + chalk.white(terminal.projectName)
          );
        }
        console.log();
      });

      console.log(chalk.gray(`Total: ${terminals.length} terminal(s)`));
      console.log(chalk.gray('📡 = streaming, 📋 = metadata only\n'));
      
      client.disconnect();
      
    } catch (error: any) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// ============================================
// EXEC COMMAND
// ============================================
program
  .command('exec <terminalId> <command...>')
  .description('Execute command on a remote terminal')
  .option('-u, --url <url>', 'Hub WebSocket URL')
  .action(async (terminalId: string, commandParts: string[], options) => {
    const hubUrl = options.url || config.get('hubUrl') || 'ws://localhost:3002';
    const command = commandParts.join(' ');
    
    const spinner = ora(`Sending command to ${terminalId}...`).start();
    
    try {
      const client = new TerminalWONClient(hubUrl, 'cli-exec');
      await client.connect();
      
      await client.executeCommand(terminalId, command);
      
      spinner.succeed(`Command sent: ${command}`);
      console.log(chalk.gray('Check the terminal or your phone for output'));
      
      client.disconnect();
      
    } catch (error: any) {
      spinner.fail(`Failed: ${error.message}`);
      process.exit(1);
    }
  });

// ============================================
// CONFIG COMMAND
// ============================================
program
  .command('config')
  .description('Manage configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--get <key>', 'Get configuration value')
  .option('--list', 'List all configuration')
  .option('--reset', 'Reset to defaults')
  .action((options) => {
    if (options.set) {
      const [key, ...valueParts] = options.set.split('=');
      const value = valueParts.join('=');
      config.set(key, value);
      console.log(chalk.green(`✓ Set ${key} = ${value}`));
    } else if (options.get) {
      const value = config.get(options.get);
      console.log(value || chalk.gray('(not set)'));
    } else if (options.reset) {
      config.reset();
      console.log(chalk.green('✓ Configuration reset to defaults'));
    } else if (options.list) {
      const allConfig = config.getAll();
      console.log(chalk.bold('\nConfiguration:\n'));
      console.log(chalk.gray('  hubUrl: ') + chalk.white(allConfig.hubUrl || 'ws://localhost:3002'));
      console.log(chalk.gray('  apiKey: ') + chalk.white(allConfig.apiKey ? '****' : '(not set)'));
      console.log();
    } else {
      console.log(chalk.yellow('Use --set, --get, --list, or --reset'));
    }
  });

// ============================================
// STATUS COMMAND
// ============================================
program
  .command('status')
  .description('Check hub connection status')
  .option('-u, --url <url>', 'Hub WebSocket URL')
  .action(async (options) => {
    const hubUrl = options.url || config.get('hubUrl') || 'ws://localhost:3002';
    const httpUrl = hubUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    const spinner = ora('Checking hub status...').start();
    
    try {
      const response = await fetch(`${httpUrl}/health`);
      const data = await response.json() as { clients?: number; terminals?: number; ptyAvailable?: boolean };
      
      spinner.stop();
      
      console.log(boxen(
        chalk.green('● Hub Online\n\n') +
        chalk.gray('URL: ') + chalk.white(hubUrl) + '\n' +
        chalk.gray('Clients: ') + chalk.white(String(data.clients || 0)) + '\n' +
        chalk.gray('Terminals: ') + chalk.white(String(data.terminals || 0)) + '\n' +
        chalk.gray('PTY Support: ') + (data.ptyAvailable ? chalk.green('Yes') : chalk.yellow('Fallback')),
        { padding: 1, borderColor: 'green', title: 'TerminalWON Hub' }
      ));
      
    } catch (error: any) {
      spinner.stop();
      
      console.log(boxen(
        chalk.red('● Hub Offline\n\n') +
        chalk.gray('URL: ') + chalk.white(hubUrl) + '\n\n' +
        chalk.yellow('Start the hub with:\n') +
        chalk.cyan('  ./start-terminalwon.sh'),
        { padding: 1, borderColor: 'red', title: 'TerminalWON Hub' }
      ));
    }
  });

// ============================================
// TUNNEL COMMAND - Remote access
// ============================================
program
  .command('tunnel')
  .description('Create a tunnel for remote access (requires ngrok)')
  .option('-p, --port <port>', 'Port to tunnel', '3002')
  .option('-s, --service <service>', 'Tunnel service (ngrok, localtunnel)', 'ngrok')
  .option('-t, --token <token>', 'Auth token for ngrok')
  .action(async (options) => {
    console.log(boxen(
      chalk.bold.yellow('TerminalWON Tunnel\n\n') +
      chalk.white('Creating secure tunnel for remote access...'),
      { padding: 1, borderColor: 'yellow', borderStyle: 'round' }
    ));

    // Check if service is available
    const spinner = ora(`Checking ${options.service}...`).start();
    
    const isAvailable = await checkTunnelService(options.service);
    
    if (!isAvailable) {
      spinner.fail(`${options.service} is not installed`);
      
      if (options.service === 'ngrok') {
        console.log(chalk.yellow('\nInstall ngrok:'));
        console.log(chalk.cyan('  macOS: brew install ngrok'));
        console.log(chalk.cyan('  Windows: choco install ngrok'));
        console.log(chalk.cyan('  Or download from: https://ngrok.com/download'));
      } else {
        console.log(chalk.yellow('\nlocaltunnel will be installed automatically via npx'));
      }
      return;
    }

    spinner.text = 'Starting tunnel...';

    try {
      activeTunnel = new TunnelManager({
        port: parseInt(options.port),
        service: options.service,
        authToken: options.token
      });

      const info = await activeTunnel.start();
      
      spinner.succeed('Tunnel created!');

      console.log(boxen(
        chalk.green('✓ Tunnel Active\n\n') +
        chalk.gray('Public URL: ') + chalk.cyan(info.url) + '\n' +
        chalk.gray('Local Port: ') + chalk.white(String(info.port)) + '\n' +
        chalk.gray('Service: ') + chalk.white(info.service) + '\n\n' +
        chalk.yellow('📱 Access from anywhere:\n') +
        chalk.white(`   PWA: ${info.url.replace(':3002', ':8080')}\n`) +
        chalk.white(`   Hub: ${info.url}\n\n`) +
        chalk.gray('Configure CLI to use tunnel:\n') +
        chalk.cyan(`   terminalwon config --set hubUrl=${info.url.replace('https://', 'wss://')}`),
        { padding: 1, borderColor: 'green', borderStyle: 'round' }
      ));

      console.log(chalk.gray('\nPress Ctrl+C to stop tunnel'));

      // Keep process alive
      process.stdin.resume();

    } catch (error: any) {
      spinner.fail(`Failed to create tunnel: ${error.message}`);
    }
  });

// ============================================
// HELP ADDITIONS
// ============================================
program.on('--help', () => {
  console.log('');
  console.log(boxen(
    chalk.bold('Quick Start:\n\n') +
    chalk.gray('1. Start the hub:\n') +
    chalk.cyan('   ./start-terminalwon.sh\n\n') +
    chalk.gray('2. In any terminal (IDE or standalone):\n') +
    chalk.cyan('   terminalwon start\n\n') +
    chalk.gray('3. Open ') + chalk.cyan('http://localhost:8080') + chalk.gray(' on your phone\n\n') +
    chalk.bold('Remote Access:\n') +
    chalk.cyan('   terminalwon tunnel') + chalk.gray(' - Create public URL with ngrok\n\n') +
    chalk.yellow('That\'s it! Full streaming from your phone.'),
    { padding: 1, borderColor: 'cyan', borderStyle: 'round' }
  ));
});

// ============================================
// CLEANUP HANDLERS
// ============================================
process.on('SIGINT', () => {
  if (activeSession) {
    activeSession.stop();
  }
  if (activeTunnel) {
    activeTunnel.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (activeSession) {
    activeSession.stop();
  }
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red(`\nUnexpected error: ${error.message}`));
  if (activeSession) {
    activeSession.stop();
  }
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  console.log(boxen(
    chalk.bold.yellow('TerminalWON CLI') + chalk.gray(' v2.0.0\n\n') +
    chalk.white('Stream any terminal to your phone.\n\n') +
    chalk.bold('Usage:\n') +
    chalk.cyan('  terminalwon start') + chalk.gray('  - Start streaming session\n') +
    chalk.cyan('  terminalwon list') + chalk.gray('   - List active terminals\n') +
    chalk.cyan('  terminalwon status') + chalk.gray(' - Check hub status\n') +
    chalk.cyan('  terminalwon --help') + chalk.gray(' - Show all commands'),
    { padding: 1, borderColor: 'yellow', borderStyle: 'round' }
  ));
}

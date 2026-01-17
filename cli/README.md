<div align="center">

# TerminalWON CLI

### The Primary Interface for Terminal Streaming

[![npm](https://img.shields.io/badge/npm-terminalwon-CB3837?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/terminalwon)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)

[**Installation**](#-installation) · [**Commands**](#-commands) · [**Configuration**](#-configuration) · [**Tunneling**](#-remote-access-tunneling)

</div>

---

## 📖 Overview

The TerminalWON CLI is the **primary interface** for streaming terminals to your phone. Unlike IDE extensions (which are limited by VSCode's API), the CLI runs inside your terminal and has full access to stdin/stdout, enabling true bidirectional streaming.

### Why CLI-First?

| Feature | CLI (`terminalwon start`) | IDE Extension |
|:---:|:---:|:---:|
| **Output streaming** | ✅ Full real-time | ❌ Not possible |
| **Remote commands** | ✅ Full control | ❌ Not possible |
| **Ctrl+C support** | ✅ Works perfectly | ❌ Not possible |
| **Works in any IDE** | ✅ Universal | ❌ Per-IDE install |
| **Setup complexity** | Simple | Complex |

---

## 📦 Installation

### Prerequisites

| Requirement | Version | Check |
|:---:|:---:|:---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

### Install from Source

```bash
# Clone repository (if not already done)
git clone https://github.com/jsodeh/terminalwon.git
cd terminalwon

# Install and build CLI
cd cli
npm install
npm run build

# Link globally (makes `terminalwon` available everywhere)
npm link

# Verify installation
terminalwon --version
# Output: 2.0.0
```

### Install from npm (Coming Soon)

```bash
npm install -g terminalwon
```

---

## 🎯 Commands

### `terminalwon start` — Start Streaming Session

**The main feature.** Starts a PTY session that streams to the hub.

```bash
# Basic usage
terminalwon start

# With custom name
terminalwon start -n "Claude AI"
terminalwon start --name "Backend Server"

# Connect to different hub
terminalwon start -u ws://192.168.1.100:3002
terminalwon start --url wss://my-server.com

# With API key (for authenticated hubs)
terminalwon start -k your-api-key
terminalwon start --key your-api-key

# Disable auto-reconnect
terminalwon start --no-reconnect
```

**Output:**
```
╭──────────────────────────────────────────╮
│ TerminalWON v2.0.0                       │
│                                          │
│ Starting streaming terminal session...   │
│ Hub: ws://localhost:3002                 │
╰──────────────────────────────────────────╯

✔ Connected to TerminalWON Hub

╭──────────────────────────────────────────╮
│ ✓ Streaming active!                      │
│                                          │
│ Terminal: my-project                     │
│ ID: pty-1705312345-abc123def             │
│ Project: my-project                      │
│ Shell: /bin/zsh                          │
│                                          │
│ 📱 Open your phone to control this       │
│ Press Ctrl+D to exit                     │
╰──────────────────────────────────────────╯

# Your shell is now active - use normally
$ ls -la
$ npm run dev
$ claude  # AI tools work perfectly!
```

**Options:**

| Option | Short | Description | Default |
|:---|:---:|:---|:---:|
| `--name` | `-n` | Terminal display name | Folder name |
| `--url` | `-u` | Hub WebSocket URL | `ws://localhost:3002` |
| `--key` | `-k` | API key for authentication | `cli-session` |
| `--no-reconnect` | — | Disable auto-reconnect | Enabled |

---

### `terminalwon list` — List Active Terminals

Shows all terminals connected to the hub.

```bash
terminalwon list

# Connect to different hub
terminalwon list -u ws://192.168.1.100:3002
```

**Output:**
```
📟 Active Terminals:

🟢 Claude AI (hub-pty) 📡
   ID: pty-1705312345-abc123def
   Path: /Users/dev/my-project

🟢 Dev Server (cli) 📡
   ID: pty-1705312400-xyz789ghi
   Path: /Users/dev/backend

🟡 VSCode Terminal (vscode) 📋
   ID: ext-vscode-term-1
   Path: /Users/dev/frontend

Total: 3 terminal(s)
📡 = streaming, 📋 = metadata only
```

**Legend:**
- 🟢 Active terminal
- 🟡 Idle terminal
- 📡 Full streaming (CLI/PTY)
- 📋 Metadata only (IDE extension)

---

### `terminalwon status` — Check Hub Status

Verifies connection to the hub server.

```bash
terminalwon status

# Check different hub
terminalwon status -u ws://192.168.1.100:3002
```

**Output (Online):**
```
╭──────────────────────────────────────────╮
│ TerminalWON Hub                          │
├──────────────────────────────────────────┤
│ ● Hub Online                             │
│                                          │
│ URL: ws://localhost:3002                 │
│ Clients: 3                               │
│ Terminals: 2                             │
│ PTY Support: Yes                         │
╰──────────────────────────────────────────╯
```

**Output (Offline):**
```
╭──────────────────────────────────────────╮
│ TerminalWON Hub                          │
├──────────────────────────────────────────┤
│ ● Hub Offline                            │
│                                          │
│ URL: ws://localhost:3002                 │
│                                          │
│ Start the hub with:                      │
│   ./start-terminalwon.sh                 │
╰──────────────────────────────────────────╯
```

---

### `terminalwon tunnel` — Create Remote Access Tunnel

Creates a public URL for accessing TerminalWON from anywhere.

```bash
# Default: ngrok on port 3002
terminalwon tunnel

# Specify port
terminalwon tunnel -p 3002
terminalwon tunnel --port 3002

# Use localtunnel instead
terminalwon tunnel -s localtunnel
terminalwon tunnel --service localtunnel

# With ngrok auth token
terminalwon tunnel -t your-ngrok-token
terminalwon tunnel --token your-ngrok-token
```

**Output:**
```
╭──────────────────────────────────────────╮
│ TerminalWON Tunnel                       │
│                                          │
│ Creating secure tunnel for remote access │
╰──────────────────────────────────────────╯

✔ Checking ngrok...
✔ Starting tunnel...
✔ Tunnel created!

╭──────────────────────────────────────────╮
│ ✓ Tunnel Active                          │
│                                          │
│ Public URL: https://abc123.ngrok.io      │
│ Local Port: 3002                         │
│ Service: ngrok                           │
│                                          │
│ 📱 Access from anywhere:                 │
│    PWA: https://abc123.ngrok.io:8080     │
│    Hub: https://abc123.ngrok.io          │
│                                          │
│ Configure CLI to use tunnel:             │
│    terminalwon config --set hubUrl=wss://abc123.ngrok.io
╰──────────────────────────────────────────╯

Press Ctrl+C to stop tunnel
```

**Options:**

| Option | Short | Description | Default |
|:---|:---:|:---|:---:|
| `--port` | `-p` | Port to tunnel | `3002` |
| `--service` | `-s` | Tunnel service | `ngrok` |
| `--token` | `-t` | ngrok auth token | — |

**Supported Services:**

| Service | Pros | Cons |
|:---:|:---|:---|
| **ngrok** | Fast, reliable, custom domains | Free tier has limits |
| **localtunnel** | No account needed | Less reliable |

---

### `terminalwon config` — Manage Configuration

View and modify CLI configuration.

```bash
# List all configuration
terminalwon config --list

# Get specific value
terminalwon config --get hubUrl

# Set value
terminalwon config --set hubUrl=ws://192.168.1.100:3002
terminalwon config --set apiKey=my-secret-key

# Reset to defaults
terminalwon config --reset
```

**Output (`--list`):**
```
Configuration:

  hubUrl: ws://localhost:3002
  apiKey: ****
```

**Configuration File Location:**
```
~/.terminalwon/config.json
```

**Available Settings:**

| Key | Description | Default |
|:---|:---|:---:|
| `hubUrl` | WebSocket URL of hub server | `ws://localhost:3002` |
| `apiKey` | API key for authentication | — |

---

### `terminalwon exec` — Execute Remote Command

Send a command to a specific terminal.

```bash
terminalwon exec <terminalId> <command>

# Examples
terminalwon exec pty-123456 "ls -la"
terminalwon exec pty-123456 "npm run build"
terminalwon exec pty-123456 "git status"

# With different hub
terminalwon exec pty-123456 "pwd" -u ws://192.168.1.100:3002
```

**Output:**
```
✔ Sending command to pty-123456...
✔ Command sent: ls -la
Check the terminal or your phone for output
```

---

### `terminalwon connect` — Connect to Hub (Legacy)

Establishes connection without starting a PTY session. Useful for listing/executing on other terminals.

```bash
terminalwon connect

# With options
terminalwon connect -u ws://192.168.1.100:3002 -k api-key
```

---

## ⚙️ Configuration

### Config File

Configuration is stored in `~/.terminalwon/config.json`:

```json
{
  "hubUrl": "ws://localhost:3002",
  "apiKey": "your-api-key"
}
```

### Environment Variables

You can also use environment variables:

```bash
export TERMINALWON_HUB_URL=ws://localhost:3002
export TERMINALWON_API_KEY=your-api-key

terminalwon start
```

### Priority Order

1. Command-line flags (`--url`, `--key`)
2. Environment variables
3. Config file (`~/.terminalwon/config.json`)
4. Defaults

---

## 🌐 Remote Access (Tunneling)

### ngrok Setup

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Windows
   choco install ngrok
   
   # Linux
   snap install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Create account & get auth token:**
   - Sign up at https://ngrok.com
   - Copy auth token from dashboard

3. **Configure ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

4. **Start tunnel:**
   ```bash
   terminalwon tunnel
   ```

### Cloudflare Tunnel (Alternative)

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create terminalwon

# Run tunnel
cloudflared tunnel --url http://localhost:3002 run terminalwon
```

### localtunnel (No Account)

```bash
# No installation needed - uses npx
terminalwon tunnel -s localtunnel

# Or manually
npx localtunnel --port 3002
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  cli.ts                    Entry point, command definitions     │
│    │                                                            │
│    ├── PTYSession          node-pty wrapper for shell access    │
│    │   └── spawn()         Creates pseudo-terminal              │
│    │   └── write()         Sends input to shell                 │
│    │   └── onData()        Receives output from shell           │
│    │                                                            │
│    ├── StreamingSession    Hub connection + PTY coordination    │
│    │   └── connect()       WebSocket to hub                     │
│    │   └── start()         Registers terminal, starts PTY       │
│    │   └── stream()        Bidirectional I/O forwarding         │
│    │                                                            │
│    ├── TunnelManager       ngrok/localtunnel integration        │
│    │   └── startNgrok()    Spawns ngrok process                 │
│    │   └── getNgrokUrl()   Queries ngrok API for public URL     │
│    │                                                            │
│    └── ConfigManager       Configuration persistence            │
│        └── get/set()       Read/write config.json               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Source Files

| File | Description |
|:---|:---|
| `src/cli.ts` | Main entry point, Commander.js command definitions |
| `src/pty/PTYSession.ts` | node-pty wrapper for PTY management |
| `src/session/StreamingSession.ts` | Hub connection and streaming coordination |
| `src/client/TerminalWONClient.ts` | WebSocket client for hub communication |
| `src/tunnel/TunnelManager.ts` | ngrok/localtunnel integration |
| `src/config/ConfigManager.ts` | Configuration file management |

---

## 🔧 Development

### Build from Source

```bash
cd cli

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link for local testing
npm link

# Watch mode (rebuild on changes)
npm run watch
```

### Project Structure

```
cli/
├── src/
│   ├── cli.ts                 # Main entry point
│   ├── pty/
│   │   └── PTYSession.ts      # PTY management
│   ├── session/
│   │   └── StreamingSession.ts # Hub streaming
│   ├── client/
│   │   └── TerminalWONClient.ts # WebSocket client
│   ├── tunnel/
│   │   └── TunnelManager.ts   # Tunnel services
│   └── config/
│       └── ConfigManager.ts   # Configuration
├── dist/                      # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Dependencies

| Package | Purpose |
|:---|:---|
| `commander` | CLI framework |
| `node-pty` | Pseudo-terminal support |
| `ws` | WebSocket client |
| `chalk` | Terminal colors |
| `ora` | Spinners |
| `boxen` | Boxes for output |
| `inquirer` | Interactive prompts |

---

## ❓ Troubleshooting

<details>
<summary><b>node-pty installation fails</b></summary>

node-pty requires native compilation. Install build tools:

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential

# Windows
npm install --global windows-build-tools
```

Then reinstall:
```bash
cd cli
rm -rf node_modules
npm install
```

</details>

<details>
<summary><b>Command not found: terminalwon</b></summary>

The CLI isn't linked globally. Run:

```bash
cd cli
npm link
```

Or use directly:
```bash
node cli/dist/cli.js start
```

</details>

<details>
<summary><b>Cannot connect to hub</b></summary>

1. Check hub is running:
   ```bash
   terminalwon status
   ```

2. Start hub if needed:
   ```bash
   ./start-terminalwon.sh
   ```

3. Check firewall allows port 3002

</details>

<details>
<summary><b>Tunnel fails to start</b></summary>

**ngrok:**
- Verify installation: `ngrok version`
- Check auth token: `ngrok config check`
- Try manual: `ngrok http 3002`

**localtunnel:**
- Try directly: `npx localtunnel --port 3002`

</details>

---

## 📄 License

MIT License — see [LICENSE](../LICENSE) file.

---

<div align="center">

**Part of the [TerminalWON](https://github.com/jsodeh/terminalwon) project**

[⭐ Star](https://github.com/jsodeh/terminalwon) · [🐛 Issues](https://github.com/jsodeh/terminalwon/issues) · [💬 Discord](https://discord.gg/UM9CY5A6q)

</div>

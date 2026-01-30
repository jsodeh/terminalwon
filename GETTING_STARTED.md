<div align="center">

# Getting Started with TerminalWON

### Complete Setup Guide

</div>

---

## 📖 Table of Contents

1. [What is TerminalWON?](#-what-is-terminalwon)
2. [Prerequisites](#-prerequisites)
3. [Installation](#-installation)
4. [Starting the Servers](#-starting-the-servers)
5. [Using the CLI](#-using-the-cli)
6. [Accessing from Your Phone](#-accessing-from-your-phone)
7. [Remote Access Setup](#-remote-access-setup)
8. [Use Cases](#-use-cases)
9. [Configuration](#-configuration)
10. [Troubleshooting](#-troubleshooting)

---

## 🎯 What is TerminalWON?

TerminalWON streams your terminal to your phone with **full bidirectional control**. Run `terminalwon start` in any terminal and get:

- **Real-time output** — See every character as it appears
- **Command input** — Type and send commands from your phone
- **Interactive control** — Y/N buttons, Ctrl+C, quick commands
- **AI tool support** — Perfect for Claude Code, Gemini CLI

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Computer                              │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  Terminal 1     │    │  Terminal 2     │                    │
│  │  terminalwon    │    │  terminalwon    │                    │
│  │  start          │    │  start          │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      │                                          │
│                      ▼                                          │
│           ┌──────────────────┐                                  │
│           │   Hub Server     │ ← Port 3002 (WebSocket)          │
│           │   hub-server.js  │                                  │
│           └────────┬─────────┘                                  │
│                    │                                            │
│           ┌────────┴─────────┐                                  │
│           │   PWA Server     │ ← Port 8080 (HTTP)               │
│           │   mobile-server  │                                  │
│           └──────────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Same Network / Tunnel
                              ▼
                    ┌──────────────────┐
                    │   📱 Your Phone  │
                    │   PWA Dashboard  │
                    └──────────────────┘
```

---

## 📋 Prerequisites

### Required Software

| Software | Version | Check Command | Installation |
|:---:|:---:|:---|:---|
| **Node.js** | 18.x - 20.x | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | `npm --version` | Included with Node.js |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com/) |

> ⚠️ **Critical**: Node.js v24 is NOT compatible with `node-pty` (required for terminal streaming). Use Node.js v18 or v20 LTS.

### Optional (for Remote Access)

| Software | Purpose | Installation |
|:---:|:---|:---|
| **ngrok** | Public tunnel | `brew install ngrok` or [ngrok.com](https://ngrok.com/download) |
| **cloudflared** | Cloudflare tunnel | `brew install cloudflare/cloudflare/cloudflared` |

### System Requirements

- **OS**: macOS, Linux, or Windows (with WSL recommended)
- **RAM**: 512MB minimum
- **Disk**: 100MB for installation

---

## 📦 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/jsodeh/terminalwon.git
cd terminalwon
```

### Step 1.5: Verify Node.js Version

```bash
# Run the version checker
./check-node-version.sh
```

This will verify you're using a compatible Node.js version (18.x - 20.x). If you're on v24, it will provide instructions to downgrade.

### Step 2: Install CLI Tool

```bash
# Navigate to CLI directory
cd cli

# Install dependencies (includes node-pty compilation)
npm install

# Build TypeScript
npm run build

# Link globally (makes 'terminalwon' command available)
npm link

# Return to root
cd ..
```

**Verify CLI installation:**
```bash
terminalwon --version
# Output: 2.0.0
```

### Step 3: Install Server Dependencies

```bash
cd server
npm install
cd ..
```

> **Note:** Server installation may take a few minutes due to native module compilation (node-pty, better-sqlite3).

### Step 4: Verify Installation

```bash
# Check CLI
terminalwon --help

# Check server files exist
ls server/hub-server.js
ls server/mobile-server.js
```

---

## 🚀 Starting the Servers

### Option A: Quick Start Script (Recommended)

```bash
./start-terminalwon.sh
```

**Output:**
```
🚀 Starting TerminalWON...

📦 Installing server dependencies...
🔌 Starting Hub Server (port 3002)...
🌐 Starting PWA Server (port 8080)...

✅ TerminalWON is running!

📱 Open on your phone: http://192.168.1.100:8080
💻 Open on computer:   http://localhost:8080

🔧 To start streaming in any terminal:
   terminalwon start

Press Ctrl+C to stop all servers
```

### Option B: Manual Start

**Terminal 1 — Hub Server:**
```bash
node server/hub-server.js
```

**Terminal 2 — PWA Server:**
```bash
node server/mobile-server.js
```

### Option C: Using npm Scripts

```bash
# From repository root
npm run server   # Start hub server only
npm run pwa      # Start PWA server only
```

### Verify Servers are Running

```bash
# Check hub health
curl http://localhost:3002/health
# Output: {"status":"ok","clients":0,"terminals":0,"ptyAvailable":true}

# Check PWA
curl http://localhost:8080
# Output: HTML content
```

---

## 💻 Using the CLI

### Start a Streaming Session

In **any terminal** (IDE or standalone):

```bash
terminalwon start
```

**What happens:**
1. CLI connects to hub server via WebSocket
2. Creates a PTY (pseudo-terminal) session
3. Registers terminal with hub
4. Starts bidirectional streaming
5. Your shell is now active and streaming

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

$ _
```

### Named Sessions

```bash
# Give your terminal a descriptive name
terminalwon start -n "Claude AI"
terminalwon start -n "Dev Server"
terminalwon start -n "Backend API"
```

### Other Commands

```bash
# List all active terminals
terminalwon list

# Check hub status
terminalwon status

# View configuration
terminalwon config --list

# Get help
terminalwon --help
```

---

## 📱 Accessing from Your Phone

### Step 1: Find Your Computer's IP Address

**macOS:**
```bash
ipconfig getifaddr en0
# Output: 192.168.1.100
```

**Linux:**
```bash
hostname -I | awk '{print $1}'
# Output: 192.168.1.100
```

**Windows:**
```bash
ipconfig | findstr IPv4
# Output: IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

### Step 2: Connect from Phone

1. **Ensure same network** — Phone and computer must be on same WiFi
2. **Open browser** — Safari, Chrome, or any modern browser
3. **Navigate to** — `http://YOUR_IP:8080` (e.g., `http://192.168.1.100:8080`)

### Step 3: Add to Home Screen (Optional but Recommended)

**iOS (Safari):**
1. Tap Share button (square with arrow)
2. Scroll down, tap "Add to Home Screen"
3. Name it "TerminalWON"
4. Tap "Add"

**Android (Chrome):**
1. Tap menu (three dots)
2. Tap "Add to Home screen"
3. Name it "TerminalWON"
4. Tap "Add"

### PWA Features

| Feature | Description |
|:---:|:---|
| **Dashboard** | See all active terminals |
| **Terminal Detail** | Full output view with command input |
| **Quick Commands** | `ls`, `pwd`, `git status` buttons |
| **Y/N Buttons** | For Claude Code approval prompts |
| **Ctrl+C** | Interrupt running processes |
| **AI Chat** | View Kiro/Cursor/Antigravity conversations |

---

## 🌐 Remote Access Setup

By default, TerminalWON only works on your local network. For remote access, use one of these options:

### Option 1: ngrok (Easiest)

**Install ngrok:**
```bash
# macOS
brew install ngrok

# Windows
choco install ngrok

# Linux
snap install ngrok

# Or download from https://ngrok.com/download
```

**Setup (one-time):**
```bash
# Create free account at ngrok.com
# Copy auth token from dashboard

ngrok config add-authtoken YOUR_AUTH_TOKEN
```

**Start tunnel:**
```bash
terminalwon tunnel
```

**Output:**
```
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
╰──────────────────────────────────────────╯
```

**Configure CLI for tunnel:**
```bash
terminalwon config --set hubUrl=wss://abc123.ngrok.io
```

### Option 2: Cloudflare Tunnel (Free & Secure)

**Install cloudflared:**
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
# See https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
```

**Setup:**
```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create terminalwon

# Start tunnel
cloudflared tunnel --url http://localhost:3002 run terminalwon
```

### Option 3: localtunnel (No Account)

```bash
# No installation needed
npx localtunnel --port 3002

# Output: your url is: https://xyz.loca.lt
```

### Option 4: Self-Host on Server

See [Self-Hosting Guide](#self-hosting) in main README.

---

## 🎮 Use Cases

### Running Claude Code

```bash
# Start streaming session
terminalwon start -n "Claude"

# Launch Claude
claude

# On your phone:
# - See Claude's responses in real-time
# - Tap Y to approve file changes
# - Tap N to reject
# - Type follow-up prompts
# - Tap Ctrl+C to interrupt
```

### Running Gemini CLI

```bash
terminalwon start -n "Gemini"
gemini
```

### Multi-Project Setup

**Terminal 1 — Frontend:**
```bash
cd ~/projects/frontend
terminalwon start -n "Frontend"
npm run dev
```

**Terminal 2 — Backend:**
```bash
cd ~/projects/backend
terminalwon start -n "Backend"
npm run server
```

**Terminal 3 — AI Assistant:**
```bash
terminalwon start -n "Claude"
claude
```

All three appear on your phone dashboard!

### Long-Running Commands

```bash
terminalwon start -n "Build"
npm run build  # Watch progress from your phone
```

### SSH Sessions

```bash
terminalwon start -n "Server"
ssh user@server.com
# Control remote server from your phone!
```

---

## ⚙️ Configuration

### CLI Configuration

**View all settings:**
```bash
terminalwon config --list
```

**Set hub URL:**
```bash
terminalwon config --set hubUrl=ws://192.168.1.100:3002
```

**Set API key:**
```bash
terminalwon config --set apiKey=your-secret-key
```

**Reset to defaults:**
```bash
terminalwon config --reset
```

**Config file location:**
```
~/.terminalwon/config.json
```

### Server Configuration

**Environment variables:**
```bash
# Hub server port
export PORT=3002

# PWA server port (in mobile-server.js)
export PORT=8080
```

### Ports Used

| Port | Service | Protocol |
|:---:|:---|:---:|
| 3002 | Hub Server | WebSocket |
| 8080 | PWA Server | HTTP |
| 4040 | ngrok API | HTTP (local) |

---

## 🔧 Troubleshooting

### "posix_spawnp failed" or PTY errors

**This is a Node.js v24 compatibility issue.** Node.js v24 has breaking changes that prevent `node-pty` from working.

**Solution: Downgrade to Node.js v18 or v20 LTS**

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal or source nvm
source ~/.zshrc  # or ~/.bashrc for bash users

# Install Node.js 20 LTS (recommended)
nvm install 20
nvm use 20
nvm alias default 20

# Verify version
node --version  # Should show v20.x.x

# Rebuild everything
cd /path/to/terminalwon
rm -rf node_modules cli/node_modules server/node_modules
rm -rf package-lock.json cli/package-lock.json server/package-lock.json
npm install
cd cli && npm install && npm run build && npm link
cd ../server && npm install

# Test
terminalwon start
```

### "Cannot connect to hub"

**Check hub is running:**
```bash
terminalwon status
```

**Start hub if needed:**
```bash
./start-terminalwon.sh
```

**Check port is available:**
```bash
lsof -i :3002
```

### "Phone can't connect"

1. **Same network?** — Phone and computer must be on same WiFi
2. **Correct IP?** — Use computer's IP, not `localhost`
3. **Firewall?** — Allow ports 3002 and 8080
4. **Hub running?** — Check `terminalwon status`

**Test from phone browser:**
```
http://YOUR_IP:3002/health
```

Should return: `{"status":"ok",...}`

### "node-pty installation failed"

Install build tools:

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential python3

# Windows
npm install --global windows-build-tools
```

Then reinstall:
```bash
cd cli
rm -rf node_modules
npm install
```

### "Command not found: terminalwon"

Link the CLI globally:
```bash
cd cli
npm link
```

Or use directly:
```bash
node cli/dist/cli.js start
```

### "Port already in use"

Find and kill the process:
```bash
# Find process
lsof -i :3002

# Kill it
kill -9 <PID>
```

### "Tunnel fails to start"

**ngrok:**
```bash
# Verify installation
ngrok version

# Check auth token
ngrok config check

# Try manual tunnel
ngrok http 3002
```

**localtunnel:**
```bash
# Try directly
npx localtunnel --port 3002
```

---

## 📚 Next Steps

1. **Read the [CLI Reference](cli/README.md)** — Full command documentation
2. **Explore [Remote Access](#-remote-access-setup)** — Access from anywhere
3. **Check [Use Cases](#-use-cases)** — Real-world examples
4. **Join [Discord](https://discord.gg/UM9CY5A6q)** — Get help, share ideas
5. **Follow on [Twitter](https://twitter.com/thatjosephodeh)** — Updates and announcements

---

## 🆘 Getting Help

- **GitHub Issues** — [Report bugs](https://github.com/jsodeh/terminalwon/issues)
- **Discussions** — [Ask questions](https://github.com/jsodeh/terminalwon/discussions)
- **Discord** — [Join community](https://discord.gg/UM9CY5A6q)
- **Twitter** — [@thatjosephodeh](https://twitter.com/thatjosephodeh)

---

<div align="center">

**Happy streaming! 📱⚡**

</div>

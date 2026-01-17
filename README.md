<div align="center">

<img src="docs/assets/logo.png" alt="TerminalWON Logo" width="150" style="border-radius: 15px;">

# TerminalWON

### Stream Any Terminal to Your Phone

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-010101?style=flat-square&logo=socket.io&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

<p align="center">
  <a href="https://github.com/jsodeh/terminalwon/discussions"><img src="https://img.shields.io/badge/GitHub-Discussions-181717?style=for-the-badge&logo=github&logoColor=white" alt="Discussions"></a>
  &nbsp;&nbsp;
  <a href="https://discord.gg/UM9CY5A6q"><img src="https://img.shields.io/badge/Discord-Join_Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
  &nbsp;&nbsp;
  <a href="https://twitter.com/thatjosephodeh"><img src="https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter"></a>
</p>

[**Quick Start**](#-quick-start) · [**Features**](#-key-features) · [**CLI Reference**](cli/README.md) · [**Self-Hosting**](#-self-hosting) · [**Roadmap**](#-roadmap)

</div>

<div align="center">

📱 **Mobile Terminal Control** &nbsp;•&nbsp; ⚡ **Full PTY Streaming**<br>
🤖 **AI Chat History** &nbsp;•&nbsp; 🌐 **Remote Access via Tunnels**

</div>

---

> **[v2.0.0]** CLI-first release with full PTY streaming! 🎉

> **[Coming Soon]** Project-based matching, team workspaces, and cloud hosting

---

## What is TerminalWON?

TerminalWON lets you **stream any terminal to your phone** with full bidirectional control. Run Claude Code, Gemini CLI, or any command-line tool and interact with it remotely — approve changes, send commands, interrupt processes, all from your mobile device.

```
┌─────────────────────────────────────────────────────────────────┐
│  Your IDE (Cursor, Kiro, VSCode, or any terminal)               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  $ terminalwon start                                      │  │
│  │  ✓ Streaming active!                                      │  │
│  │  $ claude                                                 │  │
│  │  Claude: I'll help you with that code...                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Full PTY Streaming (stdin/stdout)
                              ▼
                    ┌──────────────────┐
                    │   Hub Server     │ ← WebSocket (port 3002)
                    │   (Your Machine) │
                    └──────────────────┘
                              │
                              │ Real-time sync
                              ▼
                    ┌──────────────────┐
                    │   📱 Your Phone  │ ← PWA (port 8080)
                    │   • See output   │
                    │   • Send commands│
                    │   • Tap Y/N      │
                    │   • Ctrl+C       │
                    └──────────────────┘
```

---

## ✨ Key Features

### 📱 Full Terminal Streaming
• **Real-time PTY I/O** — See every character as it appears, send input instantly<br>
• **Interactive Control** — Y/N buttons for Claude Code, Ctrl+C to interrupt, custom commands<br>
• **Works Anywhere** — Any terminal in any IDE (Cursor, Kiro, VSCode, Antigravity) or standalone

### 🤖 AI Chat History Integration
• **Multi-IDE Support** — Read conversations from Kiro, Cursor, and Antigravity<br>
• **Real-time Updates** — New messages appear instantly via WebSocket<br>
• **Searchable Sessions** — Filter by IDE, search by content, browse history

### 🌐 Remote Access Options
• **Local Network** — Access from any device on the same WiFi<br>
• **ngrok Tunnels** — One command for public HTTPS URL<br>
• **Cloudflare Tunnels** — Free, secure tunneling alternative<br>
• **Self-Hosted** — Docker deployment on any server

### 🔧 Developer-Friendly
• **CLI-First Design** — Simple `terminalwon start` in any terminal<br>
• **Zero Config** — Works out of the box with sensible defaults<br>
• **Open Source** — MIT licensed, fully customizable

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Check Command |
|:---:|:---:|:---|
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/jsodeh/terminalwon.git
cd terminalwon

# Install CLI globally
cd cli && npm install && npm run build && npm link && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

### Step 2: Start TerminalWON

```bash
# Start both servers (Hub + PWA)
./start-terminalwon.sh
```

You'll see:
```
🚀 Starting TerminalWON...

🔌 Starting Hub Server (port 3002)...
🌐 Starting PWA Server (port 8080)...

✅ TerminalWON is running!

📱 Open on your phone: http://192.168.1.100:8080
💻 Open on computer:   http://localhost:8080

🔧 To start streaming in any terminal:
   terminalwon start
```

### Step 3: Start Streaming

In **any terminal** (IDE or standalone):

```bash
terminalwon start
```

Output:
```
╭──────────────────────────────────────────╮
│ TerminalWON v2.0.0                       │
│                                          │
│ ✓ Streaming active!                      │
│                                          │
│ Terminal: my-project                     │
│ ID: pty-1234567890                       │
│ Project: /Users/dev/my-project           │
│ Shell: /bin/zsh                          │
│                                          │
│ 📱 Open your phone to control this       │
│ Press Ctrl+D to exit                     │
╰──────────────────────────────────────────╯
```

### Step 4: Access from Phone

1. **Find your computer's IP:**
   ```bash
   # macOS
   ipconfig getifaddr en0
   
   # Linux
   hostname -I | awk '{print $1}'
   
   # Windows
   ipconfig | findstr IPv4
   ```

2. **Open in phone browser:** `http://YOUR_IP:8080`

3. **Add to Home Screen** for app-like experience (iOS: Share → Add to Home Screen)

---

## 📱 PWA Dashboard

The Progressive Web App provides a native app-like experience:

### Dashboard Home
| Feature | Description |
|:---:|:---|
| **Terminal Cards** | See all active terminals with status indicators |
| **Quick Stats** | Active terminal count, connection status |
| **Create Terminal** | Tap "+" to create hub-managed PTY terminals |
| **AI Chat Access** | Quick link to view IDE conversations |

### Terminal Detail View
| Feature | Description |
|:---:|:---|
| **Live Output** | Real-time terminal output with auto-scroll |
| **Command Input** | Type and send commands |
| **Quick Actions** | `ls -la`, `pwd`, `git status` buttons |
| **Y/N Buttons** | For Claude Code approval prompts |
| **Ctrl+C** | Interrupt running processes |
| **Clear** | Clear terminal display |

### AI Chat Sessions
| Feature | Description |
|:---:|:---|
| **Multi-IDE** | Kiro, Cursor, Antigravity conversations |
| **Filter by IDE** | Show only specific IDE chats |
| **Search** | Find conversations by content |
| **Real-time** | New messages appear instantly |

---

## 🌐 Remote Access

### Option 1: ngrok (Easiest)

```bash
# Install ngrok: https://ngrok.com/download
# macOS: brew install ngrok
# Windows: choco install ngrok

# Create tunnel
terminalwon tunnel

# Output:
# ╭──────────────────────────────────────────╮
# │ ✓ Tunnel Active                          │
# │                                          │
# │ Public URL: https://abc123.ngrok.io      │
# │ Local Port: 3002                         │
# │ Service: ngrok                           │
# │                                          │
# │ 📱 Access from anywhere:                 │
# │    PWA: https://abc123.ngrok.io:8080     │
# │    Hub: https://abc123.ngrok.io          │
# ╰──────────────────────────────────────────╯
```

Configure CLI to use tunnel:
```bash
terminalwon config --set hubUrl=wss://abc123.ngrok.io
```

### Option 2: Cloudflare Tunnel (Free & Secure)

```bash
# Install cloudflared
# macOS: brew install cloudflare/cloudflare/cloudflared
# Linux: See https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Create tunnel (one-time setup)
cloudflared tunnel login
cloudflared tunnel create terminalwon

# Start tunnel
cloudflared tunnel --url http://localhost:3002 run terminalwon
```

### Option 3: localtunnel (No Account Required)

```bash
# Uses npx, no installation needed
npx localtunnel --port 3002

# Output: your url is: https://xyz.loca.lt
```

### Option 4: Tailscale (VPN-based)

```bash
# Install Tailscale on both devices
# https://tailscale.com/download

# Access via Tailscale IP
# http://100.x.x.x:8080
```

---

## 🐳 Self-Hosting

### Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/jsodeh/terminalwon.git
cd terminalwon

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Docker Run (Single Command)

```bash
docker run -d --name terminalwon \
  -p 3002:3002 -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  ghcr.io/jsodeh/terminalwon:latest
```

### Cloud Platforms

<details>
<summary><b>🚀 Railway</b></summary>

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

</details>

<details>
<summary><b>🔷 DigitalOcean App Platform</b></summary>

1. Fork the repository
2. Create new App in DigitalOcean
3. Connect GitHub repository
4. Set build command: `cd server && npm install`
5. Set run command: `node server/hub-server.js`
6. Add HTTP port: 3002

</details>

<details>
<summary><b>☁️ AWS EC2</b></summary>

```bash
# SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-instance

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Clone and run
git clone https://github.com/jsodeh/terminalwon.git
cd terminalwon
cd server && npm install && cd ..
./start-terminalwon.sh

# Configure security group to allow ports 3002 and 8080
```

</details>

<details>
<summary><b>🌐 Fly.io</b></summary>

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

</details>

---

## 📂 Project Structure

```
terminalwon/
├── cli/                        # CLI Tool (Main Interface)
│   ├── src/
│   │   ├── cli.ts              # Command definitions
│   │   ├── pty/                # PTY session management
│   │   ├── session/            # Hub connection & streaming
│   │   ├── tunnel/             # ngrok/localtunnel integration
│   │   └── config/             # Configuration management
│   ├── package.json
│   └── README.md               # CLI Documentation
│
├── server/                     # Backend Servers
│   ├── hub-server.js           # WebSocket hub (port 3002)
│   ├── mobile-server.js        # PWA server (port 8080)
│   ├── public/                 # PWA HTML/JS files
│   │   ├── mobile-dashboard.html
│   │   ├── mobile-terminal-detail.html
│   │   ├── mobile-ai-sessions.html
│   │   └── mobile-ai-conversations.html
│   ├── chat/                   # AI Chat History Readers
│   │   ├── ChatHistoryManager.js
│   │   └── readers/
│   │       ├── KiroReader.js
│   │       ├── CursorReader.js
│   │       └── AntigravityReader.js
│   └── auth/                   # Authentication (Cloud prep)
│       └── AuthManager.js
│
├── extensions/                 # IDE Extensions (Optional/Legacy)
│   ├── vscode/
│   ├── cursor/
│   ├── kiro/
│   └── README.md
│
├── mobile-app/                 # React Native App (Future)
│   └── README.md
│
├── docs/                       # Documentation & Assets
│
├── Dockerfile                  # Docker build
├── docker-compose.yml          # Docker deployment
├── start-terminalwon.sh        # Quick start script
├── GETTING_STARTED.md          # Detailed setup guide
└── LICENSE                     # MIT License
```

---

## 🔧 CLI Reference

| Command | Description |
|:---|:---|
| `terminalwon start` | Start streaming session (main feature) |
| `terminalwon start -n "Name"` | Start with custom terminal name |
| `terminalwon list` | List all active terminals |
| `terminalwon status` | Check hub connection status |
| `terminalwon tunnel` | Create ngrok tunnel for remote access |
| `terminalwon config --list` | View configuration |
| `terminalwon config --set key=value` | Set configuration value |
| `terminalwon --help` | Show all commands |

See [CLI README](cli/README.md) for complete documentation.

---

## 🤖 AI Chat History

TerminalWON reads AI conversations from your IDEs:

| IDE | Support | Storage Location |
|:---:|:---:|:---|
| **Kiro** | ✅ Full | `~/.kiro/` SQLite database |
| **Cursor** | ✅ Full | `~/.cursor/` SQLite database |
| **Antigravity** | ✅ Full | `~/.antigravity/` chat files |

### How It Works

1. **ChatHistoryManager** scans IDE data directories on startup
2. **File watchers** detect new conversations in real-time
3. **WebSocket broadcasts** push updates to connected clients
4. **PWA displays** sessions with search and filtering

### Viewing Chat History

1. Open PWA dashboard
2. Tap "AI Chat" in bottom navigation
3. Browse sessions by IDE
4. Tap session to view full conversation
5. Code blocks have syntax highlighting and copy buttons

---

## 📋 Roadmap

### ✅ Released (v2.0.0)
- [x] CLI-first terminal streaming
- [x] Full PTY support with bidirectional I/O
- [x] PWA dashboard with terminal control
- [x] AI chat history (Kiro, Cursor, Antigravity)
- [x] ngrok tunnel integration
- [x] Docker deployment support

### 🚧 In Progress
- [ ] **Project-Based Matching** — Link terminals to chat sessions by workspace
- [ ] **Real-time Chat + CLI Linking** — See AI responses alongside terminal output
- [ ] **File Path Context** — Track which files are affected by commands

### 📅 Planned
- [ ] **Team Workspaces** — Share terminals with team members
- [ ] **Cloud Hosting** — Managed service with mobile app
- [ ] **Authentication** — API keys, JWT tokens, OAuth
- [ ] **Terminal Recording** — Replay sessions, share recordings
- [ ] **Notifications** — Push alerts for long-running commands
- [ ] **IDE Extension Improvements** — Better metadata, optional streaming

---

## ❓ FAQ

<details>
<summary><b>Why CLI instead of IDE extensions?</b></summary>

IDE extensions are limited by VSCode's Terminal API which doesn't expose terminal output. The CLI runs inside the terminal and has full access to stdin/stdout, enabling true bidirectional streaming.

| Feature | CLI | IDE Extension |
|:---:|:---:|:---:|
| Output streaming | ✅ Full | ❌ Not possible |
| Remote commands | ✅ Full | ❌ Not possible |
| Ctrl+C support | ✅ Full | ❌ Not possible |
| Works in any IDE | ✅ Yes | ❌ Per-IDE install |

</details>

<details>
<summary><b>Can I use this with Claude Code / Gemini CLI?</b></summary>

Yes! That's the primary use case. Run `terminalwon start`, then launch Claude or Gemini. You'll see all output on your phone and can:
- Approve/reject changes (Y/N buttons)
- Send follow-up prompts
- Interrupt with Ctrl+C
- See real-time streaming

</details>

<details>
<summary><b>Is my terminal data secure?</b></summary>

- **Local mode**: Data stays on your machine, accessible only on your network
- **Tunnel mode**: Data passes through ngrok/Cloudflare (encrypted HTTPS)
- **Self-hosted**: You control the server, no third-party access

For sensitive work, use local mode or self-host on your own infrastructure.

</details>

<details>
<summary><b>Phone can't connect to PWA?</b></summary>

1. **Same network**: Phone and computer must be on same WiFi
2. **Firewall**: Allow ports 3002 and 8080
3. **IP address**: Use computer's IP, not `localhost`
4. **Hub running**: Check `terminalwon status`

</details>

<details>
<summary><b>How do I update?</b></summary>

```bash
cd terminalwon
git pull
cd cli && npm install && npm run build && cd ..
cd server && npm install && cd ..
```

</details>

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file.

---

## 👤 Author

**Joseph Odeh**

- Twitter: [@thatjosephodeh](https://twitter.com/thatjosephodeh)
- LinkedIn: [josephodeh](https://linkedin.com/in/josephodeh)
- GitHub: [@jsodeh](https://github.com/jsodeh)

---

<div align="center">

**Built for developers who need terminal access on the go.**

[⭐ Star us](https://github.com/jsodeh/terminalwon/stargazers) · [🐛 Report a bug](https://github.com/jsodeh/terminalwon/issues) · [💬 Discussions](https://github.com/jsodeh/terminalwon/discussions) · [🐦 Twitter](https://twitter.com/thatjosephodeh)

</div>

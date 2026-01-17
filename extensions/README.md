<div align="center">

# TerminalWON IDE Extensions

### Optional Terminal Metadata Integration

[![VSCode](https://img.shields.io/badge/VSCode-Extension-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)
[![Cursor](https://img.shields.io/badge/Cursor-Extension-000000?style=flat-square&logo=cursor&logoColor=white)](https://cursor.sh/)
[![Kiro](https://img.shields.io/badge/Kiro-Extension-6366F1?style=flat-square&logo=amazon&logoColor=white)](https://kiro.dev/)

[**Why CLI Instead?**](#-why-cli-instead-of-extensions) · [**Installation**](#-installation) · [**What Extensions Provide**](#-what-extensions-provide)

</div>

---

## ⚠️ Important Notice

> **IDE extensions are now OPTIONAL and considered LEGACY.**
> 
> The recommended approach is to use the **CLI tool** (`terminalwon start`) which provides **full streaming** from any terminal. Extensions are limited by VSCode's Terminal API and cannot stream terminal output.

---

## 🤔 Why CLI Instead of Extensions?

VSCode's Terminal API has fundamental limitations that prevent extensions from accessing terminal output. Here's the comparison:

| Feature | CLI (`terminalwon start`) | IDE Extension |
|:---:|:---:|:---:|
| **Output streaming** | ✅ Full real-time | ❌ **Not possible** |
| **Remote commands** | ✅ Full control | ❌ **Not possible** |
| **Ctrl+C support** | ✅ Works perfectly | ❌ **Not possible** |
| **Y/N for Claude** | ✅ Tap to respond | ❌ **Not possible** |
| **Works in any IDE** | ✅ Universal | ❌ Per-IDE install |
| **Setup complexity** | Simple | Complex |

### The Technical Reason

```
┌─────────────────────────────────────────────────────────────────┐
│                    VSCode Terminal API                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What extensions CAN access:                                    │
│  ✅ Terminal name                                               │
│  ✅ Terminal creation/disposal events                           │
│  ✅ Active terminal changes                                     │
│  ✅ Send text TO terminal (writeEmitter)                        │
│                                                                 │
│  What extensions CANNOT access:                                 │
│  ❌ Terminal output (stdout)                                    │
│  ❌ Terminal input (stdin)                                      │
│  ❌ Process exit codes                                          │
│  ❌ Current working directory                                   │
│                                                                 │
│  This is a VSCode security/design decision, not a bug.          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Workflow

```bash
# Instead of installing extensions, just run this in any IDE terminal:
terminalwon start

# That's it! Full streaming, full control.
```

---

## 📋 What Extensions Provide

If you still want to use extensions, here's what they offer:

### ✅ What Extensions CAN Do

| Feature | Description |
|:---:|:---|
| **Terminal Metadata** | Report terminal names to dashboard |
| **Status Tracking** | Show active/idle status |
| **Working Directory** | Display terminal's cwd (when available) |
| **Hub Connection** | Maintain WebSocket connection to hub |
| **Terminal Count** | Show number of open terminals |

### ❌ What Extensions CANNOT Do

| Feature | Reason |
|:---:|:---|
| **Stream Output** | VSCode API doesn't expose stdout |
| **Execute Commands** | Can only send text, not execute |
| **Send Ctrl+C** | No signal support |
| **Read Input** | VSCode API doesn't expose stdin |
| **Interactive Control** | No bidirectional communication |

---

## 📦 Installation

> **Reminder:** Consider using the CLI instead: `terminalwon start`

### VSCode Extension

```bash
# Navigate to extension directory
cd extensions/vscode

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npx vsce package

# Install the .vsix file:
# 1. Open VSCode
# 2. Go to Extensions (Ctrl+Shift+X)
# 3. Click "..." menu → "Install from VSIX..."
# 4. Select the generated .vsix file
```

### Cursor Extension

```bash
cd extensions/cursor
npm install
npm run compile
npx vsce package

# Install in Cursor the same way as VSCode
```

### Kiro Extension

```bash
cd extensions/kiro
npm install
npm run compile
npx vsce package

# Install in Kiro the same way as VSCode
```

### Antigravity

Antigravity is VSCode-compatible. Use the VSCode extension:

```bash
cd extensions/vscode
npm install
npm run compile
npx vsce package

# Install in Antigravity
```

### Build All Extensions

```bash
# From repository root
./build-all-extensions.sh
```

---

## 🏗️ Extension Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Extension Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  extension.ts              Entry point, activation              │
│    │                                                            │
│    ├── HubConnection       WebSocket connection to hub          │
│    │   └── connect()       Establishes connection               │
│    │   └── send()          Sends messages to hub                │
│    │   └── onMessage()     Handles hub responses                │
│    │                                                            │
│    ├── TerminalMonitor     Watches VSCode terminals             │
│    │   └── onDidOpenTerminal()   Registers new terminals        │
│    │   └── onDidCloseTerminal()  Unregisters terminals          │
│    │   └── onDidChangeActiveTerminal()  Updates status          │
│    │                                                            │
│    └── Providers           UI components (optional)             │
│        └── TerminalProvider    Tree view of terminals           │
│        └── ActivityProvider    Activity feed                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Source Structure

```
extensions/
├── vscode/
│   ├── src/
│   │   ├── extension.ts           # Entry point
│   │   ├── hub/
│   │   │   └── HubConnection.ts   # WebSocket client
│   │   ├── terminal/
│   │   │   └── TerminalMonitor.ts # Terminal watcher
│   │   └── providers/
│   │       ├── TerminalProvider.ts
│   │       └── ActivityProvider.ts
│   ├── package.json               # Extension manifest
│   └── tsconfig.json
│
├── cursor/
│   └── (similar structure)
│
├── kiro/
│   └── (similar structure with Kiro-specific APIs)
│
└── README.md
```

---

## 🔧 Extension Configuration

Extensions connect to the hub server. Configure in VSCode settings:

```json
{
  "terminalwon.hubUrl": "ws://localhost:3002",
  "terminalwon.autoConnect": true,
  "terminalwon.showStatusBar": true
}
```

| Setting | Description | Default |
|:---|:---|:---:|
| `hubUrl` | WebSocket URL of hub server | `ws://localhost:3002` |
| `autoConnect` | Connect on extension activation | `true` |
| `showStatusBar` | Show connection status in status bar | `true` |

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Data Flow                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VSCode/Cursor/Kiro                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Terminal 1    Terminal 2    Terminal 3                 │   │
│  │  (npm run dev) (git status) (claude)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │              │              │                       │
│           │ Metadata only (no output)   │                       │
│           ▼              ▼              ▼                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TerminalMonitor                            │   │
│  │  • Terminal name                                        │   │
│  │  • Active/inactive status                               │   │
│  │  • Creation time                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          │ WebSocket                            │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Hub Server                           │   │
│  │  Receives: terminal.register { name, status, tool }     │   │
│  │  Does NOT receive: terminal output, commands            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PWA Dashboard                        │   │
│  │  Shows: Terminal cards with names and status            │   │
│  │  Cannot: Stream output, send commands                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🆚 Extension vs CLI Comparison

### Use Case: Running Claude Code

**With CLI (Recommended):**
```bash
# In any terminal
terminalwon start -n "Claude"
claude

# On your phone:
# ✅ See Claude's responses in real-time
# ✅ Tap Y to approve changes
# ✅ Tap N to reject
# ✅ Type follow-up prompts
# ✅ Tap Ctrl+C to interrupt
```

**With Extension:**
```
# In VSCode with extension installed
# Open terminal, run claude

# On your phone:
# ✅ See "Claude" terminal in list
# ❌ Cannot see Claude's output
# ❌ Cannot approve/reject changes
# ❌ Cannot send commands
# ❌ Cannot interrupt
```

### Use Case: Monitoring Multiple Projects

**With CLI:**
```bash
# Terminal 1 (Frontend)
cd frontend && terminalwon start -n "Frontend" && npm run dev

# Terminal 2 (Backend)
cd backend && terminalwon start -n "Backend" && npm run server

# Terminal 3 (AI)
terminalwon start -n "Claude" && claude

# On phone: Full streaming and control of all three
```

**With Extension:**
```
# Open 3 terminals in VSCode

# On phone: See 3 terminal cards
# Cannot see output or send commands to any of them
```

---

## 🚧 Future Improvements

While extensions have fundamental limitations, we're exploring:

| Feature | Status | Notes |
|:---:|:---:|:---|
| **Better Metadata** | 🔄 Planned | More terminal info when available |
| **Workspace Context** | 🔄 Planned | Link terminals to projects |
| **AI Chat Integration** | ✅ Done | Read Kiro/Cursor chat history |
| **Output Streaming** | ❌ Blocked | VSCode API limitation |

---

## 📄 License

MIT License — see [LICENSE](../LICENSE) file.

---

<div align="center">

**Part of the [TerminalWON](https://github.com/jsodeh/terminalwon) project**

[⭐ Star](https://github.com/jsodeh/terminalwon) · [🐛 Issues](https://github.com/jsodeh/terminalwon/issues) · [💬 Discord](https://discord.gg/UM9CY5A6q)

---

### 💡 Recommendation

**Skip the extensions. Use the CLI:**

```bash
terminalwon start
```

**It's simpler, more powerful, and works everywhere.**

</div>

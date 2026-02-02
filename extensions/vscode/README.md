# TerminalWON - Remote Terminal Hub for Multi-IDE Workflows

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/terminalwon.terminalwon-vscode)](https://marketplace.visualstudio.com/items?itemName=terminalwon.terminalwon-vscode)
[![Open VSX](https://img.shields.io/open-vsx/v/terminalwon/terminalwon-vscode)](https://open-vsx.org/extension/terminalwon/terminalwon-vscode)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/terminalwon.terminalwon-vscode)](https://marketplace.visualstudio.com/items?itemName=terminalwon.terminalwon-vscode)

> Monitor and control all your terminals from one dashboard. Works with Cursor, Claude Code, and more.

---

## One Dashboard. All Your Terminals. Everywhere.

Are you tired of juggling terminals across Cursor, VSCode, Claude Code, Kiro, and other tools? Do you walk away from your desk only to wonder if your build finished or if Claude is waiting for your input?

**TerminalWON solves this.**

![TerminalWON Dashboard](https://terminalwon.com/images/dashboard-preview.png)

---

## ✨ What You Get

### 🖥️ Unified Terminal Monitoring
- See all active terminals across VSCode, Cursor, Claude Code, Kiro, Antigravity, Gemini CLI, and Qoder
- Beautiful dashboard that updates in real-time
- Filter by project, status, or tool
- Search through terminal history instantly

### 📱 Mobile Access
- Check terminal status from your phone
- Execute commands remotely
- Get push notifications when:
  - Commands complete
  - Errors occur
  - AI needs your input
  - Long-running processes finish

### 🤖 AI Conversation Continuity
- Continue Claude Code chats from the web dashboard
- Resume Cursor AI conversations on mobile
- Never lose context when switching devices
- Full conversation history preserved

### 🔔 Smart Notifications
- Get alerted only when it matters
- Customizable notification rules per project
- Pattern detection for: completion, errors, input needed
- Quiet hours and do-not-disturb mode

### 👥 Team Collaboration (Premium)
- Share terminal visibility with your team
- See who's running what in real-time
- Audit logs for compliance
- Role-based access control

---

## 🚀 Quick Start

1. **Install** TerminalWON extension in your IDE
2. **Sign up** at [terminalwon.com](https://terminalwon.com)
3. **Connect** your first terminal (`Cmd+Shift+P` → "TerminalWON: Connect to Hub")
4. **Access** from web, mobile, or desktop app

---

## ⚙️ Commands

| Command | Description |
|---------|-------------|
| `TerminalWON: Connect to Hub` | Connect to the TerminalWON dashboard |
| `TerminalWON: Disconnect from Hub` | Disconnect from the hub |
| `TerminalWON: Share Current Terminal` | Share the active terminal |
| `TerminalWON: Open Dashboard` | Open the web dashboard |

---

## ⚡ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `terminalwon.hubUrl` | `ws://localhost:3002` | TerminalWON Hub WebSocket URL |
| `terminalwon.apiKey` | ` ` | Your TerminalWON API Key |
| `terminalwon.autoConnect` | `true` | Automatically connect to hub on startup |
| `terminalwon.shareByDefault` | `false` | Share new terminals by default |

---

## 💎 Pricing

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 3 active terminals, 7 days history, basic notifications |
| **Pro** | $12/month | Unlimited terminals, 90 days history, mobile app, priority support |
| **Team** | $49/month | Everything in Pro + shared workspaces, audit logs, SSO |

---

## 🔒 Security First

- ✅ End-to-end encryption
- ✅ SOC 2 Type II compliant
- ✅ Optional self-hosted deployment
- ✅ 2FA required for remote execution

---

## 🛠️ Supported Tools

| Tool | Status |
|------|--------|
| VSCode | ✅ Full Support |
| Cursor | ✅ Full Support |
| Claude Code | ✅ Full Support |
| Kiro | ✅ Full Support |
| Antigravity | ✅ Full Support |
| Gemini CLI | ✅ Full Support |
| Qoder | ✅ Full Support |
| Any Terminal | ✅ Via CLI Adapter |

---

## 📚 Learn More

- 📖 [Documentation](https://docs.terminalwon.com)
- 💬 [Discord Community](https://discord.gg/terminalwon)
- 🐦 [Twitter @terminalwon](https://twitter.com/terminalwon)
- 🐛 [Report Issues](https://github.com/jsodeh/terminalwon/issues)

---

## 📝 Release Notes

See the [CHANGELOG](CHANGELOG.md) for release history.

---

**Made for developers who refuse to babysit terminals.** ⚡

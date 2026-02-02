# Changelog

All notable changes to the TerminalWON VSCode extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-02

### 🎉 Initial Release

#### Added
- **Real-time Terminal Streaming** - Stream terminal output to TerminalWON dashboard
- **Remote Command Execution** - Execute commands from web or mobile dashboard
- **Smart Notifications** - Get notified when commands complete, errors occur, or input is needed
- **Multi-Terminal Support** - Monitor multiple terminals simultaneously
- **Activity Bar Integration** - Quick access to active terminals and recent activity
- **Context Menu** - Right-click any terminal to share it
- **AI Conversation Continuity** - Continue Claude/Cursor AI chats across devices
- **Multi-Provider Support** - Works with Anthropic, OpenAI, Google Gemini, xAI, and Ollama

#### Commands
- `TerminalWON: Connect to Hub` - Connect to the TerminalWON dashboard
- `TerminalWON: Disconnect from Hub` - Disconnect from the hub
- `TerminalWON: Share Current Terminal` - Share the active terminal
- `TerminalWON: Open Dashboard` - Open the web dashboard in browser

#### Configuration
- Configurable hub URL for self-hosted deployments
- API key authentication
- Auto-connect on startup option
- Share by default option

### Security
- End-to-end encryption for all terminal data
- Secure WebSocket connections (WSS)
- API key authentication
- 2FA support for remote execution

---

## [Unreleased]

### Planned Features
- [ ] Terminal search and filtering
- [ ] Command history sync
- [ ] Team workspace support
- [ ] Custom notification rules
- [ ] Keyboard shortcuts
- [ ] Windsurf integration
- [ ] JetBrains IDE support

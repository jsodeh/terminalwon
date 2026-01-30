# Changelog

All notable changes to the TerminalWON Kiro extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-29

### 🎉 Initial Release

#### Added
- **Deep Kiro Integration** - Native integration with Kiro IDE tools
- **Live Terminal Streaming** - Full PTY support for real-time terminal streaming
- **Remote Terminal Creation** - Create and manage remote terminals from dashboard
- **Auto Terminal Sharing** - Automatically share Kiro terminals to dashboard
- **Kiro Tools Panel** - Access TerminalWON tools directly in Kiro sidebar
- **Multi-Terminal Support** - Monitor multiple terminals simultaneously

#### Commands
- `TerminalWON: Connect to Hub` - Connect to the TerminalWON dashboard
- `TerminalWON: Disconnect from Hub` - Disconnect from the hub
- `TerminalWON: Share Current Terminal` - Share the active terminal
- `TerminalWON: Create Remote Terminal` - Create a new live streaming remote terminal
- `TerminalWON: Enable Kiro Integration` - Enable deep Kiro IDE integration

#### Configuration
- Deep Kiro integration toggle
- Auto-share Kiro terminals option
- Configurable hub URL for self-hosted deployments
- API key authentication

### Technical Features
- node-pty integration for full PTY support
- Low-latency WebSocket streaming
- Interactive remote terminal sessions

### Security
- End-to-end encryption for all terminal data
- Secure WebSocket connections (WSS)
- API key authentication

---

## [Unreleased]

### Planned Features
- [ ] Kiro workspace sync
- [ ] Team collaboration features
- [ ] Terminal session recording
- [ ] Custom notification rules
- [ ] Keyboard shortcuts

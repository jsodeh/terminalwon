# Contributing to TerminalWON

Thank you for your interest in contributing to TerminalWON! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

---

## Code of Conduct

Please be respectful and constructive in all interactions. We're building something useful together.

---

## Getting Started

### Prerequisites

- Node.js 18.x - 20.x (⚠️ NOT v24 - incompatible with node-pty)
- npm 9+
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/terminalwon.git
   cd terminalwon
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/jsodeh/terminalwon.git
   ```

---

## Development Setup

### CLI Development

```bash
cd cli
npm install
npm run build

# Watch mode for development
npm run watch

# Link for testing
npm link
```

### Server Development

```bash
cd server
npm install

# Start hub server
node hub-server.js

# Start PWA server (separate terminal)
node mobile-server.js
```

### Full Stack Development

```bash
# Terminal 1: Hub server
cd server && node hub-server.js

# Terminal 2: PWA server
cd server && node mobile-server.js

# Terminal 3: CLI development
cd cli && npm run watch
```

---

## Making Changes

### Branch Naming

- `feature/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation
- `refactor/description` — Code refactoring

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Formatting
- `refactor` — Code restructuring
- `test` — Tests
- `chore` — Maintenance

**Examples:**
```
feat(cli): add tunnel command for ngrok integration
fix(hub): handle WebSocket reconnection properly
docs(readme): update installation instructions
```

---

## Pull Request Process

1. **Create branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Push to your fork:**
   ```bash
   git push origin feature/my-feature
   ```

4. **Open Pull Request:**
   - Go to GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill in the template

5. **Address feedback:**
   - Respond to review comments
   - Make requested changes
   - Push updates

---

## Coding Standards

### TypeScript (CLI)

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await over callbacks
- Add JSDoc comments for public APIs

```typescript
/**
 * Starts a streaming terminal session
 * @param options - Session configuration
 * @returns Session info including terminal ID
 */
async function startSession(options: SessionOptions): Promise<SessionInfo> {
  // Implementation
}
```

### JavaScript (Server)

- Use ES6+ features
- Add comments for complex logic
- Handle errors gracefully

```javascript
// Handle terminal creation with proper error handling
async function createTerminal(name, cwd) {
  try {
    const terminal = pty.spawn(shell, [], { cwd });
    return { success: true, terminal };
  } catch (error) {
    console.error('Failed to create terminal:', error);
    return { success: false, error: error.message };
  }
}
```

### HTML/CSS (PWA)

- Use Tailwind CSS classes
- Keep JavaScript inline for simplicity
- Support dark mode

---

## Testing

### Manual Testing

1. Start servers:
   ```bash
   ./start-terminalwon.sh
   ```

2. Test CLI:
   ```bash
   terminalwon start
   terminalwon list
   terminalwon status
   ```

3. Test PWA:
   - Open http://localhost:8080
   - Create terminal
   - Send commands
   - Check AI chat

### Automated Tests (Coming Soon)

```bash
npm test
```

---

## Areas for Contribution

### High Priority

- [ ] Project-based terminal/chat matching
- [ ] Improved error handling
- [ ] Better reconnection logic
- [ ] Documentation improvements

### Medium Priority

- [ ] Additional tunnel services
- [ ] Terminal recording/playback
- [ ] Push notifications
- [ ] Team workspace features

### Low Priority

- [ ] Themes and customization
- [ ] Keyboard shortcuts
- [ ] Terminal tabs in PWA

---

## Questions?

- Open a [Discussion](https://github.com/jsodeh/terminalwon/discussions)
- Check existing [Issues](https://github.com/jsodeh/terminalwon/issues)
- Join our [Discord](https://discord.gg/UM9CY5A6q)
- Follow [@thatjosephodeh](https://twitter.com/thatjosephodeh) on Twitter

---

Thank you for contributing! 🎉

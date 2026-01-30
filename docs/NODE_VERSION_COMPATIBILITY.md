# Node.js Version Compatibility

## Overview

TerminalWON requires **Node.js v18.x or v20.x** for full functionality. Node.js v24 has breaking changes that prevent the `node-pty` library from working correctly.

## Supported Versions

| Version | Status | Notes |
|:---:|:---:|:---|
| **v20.x** | ✅ Recommended | LTS, best compatibility |
| **v18.x** | ✅ Supported | LTS, fully compatible |
| **v24.x** | ❌ Not Compatible | Breaks node-pty |
| **v22.x** | ⚠️ Untested | May work but not officially supported |
| **<v18** | ❌ Not Supported | Too old |

## Why Node.js v24 Doesn't Work

Node.js v24 introduced stricter security policies and changes to the `child_process` module that break `node-pty`, which is essential for TerminalWON's terminal streaming functionality.

### Error Symptoms

If you're using Node.js v24, you'll see:

```bash
terminalwon start
✖ Failed to start: posix_spawnp failed.
```

Or during installation:

```bash
npm install
# Compilation errors with v8-memory-span.h
# std::ranges::enable_view errors
```

## Solution: Use Node.js v20 LTS

### Option 1: Using nvm (Recommended)

```bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal or source nvm
source ~/.zshrc  # or ~/.bashrc for bash users

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
```

### Option 2: Direct Installation

Download Node.js v20 LTS from [nodejs.org](https://nodejs.org/) and install it directly.

### Option 3: Using Docker

If you prefer not to change your system Node.js version, use Docker:

```bash
docker-compose up -d
```

The Docker image uses Node.js 20 and will work regardless of your system's Node.js version.

## After Changing Node.js Version

Once you've switched to a compatible Node.js version, rebuild everything:

```bash
# Clean all dependencies
rm -rf node_modules cli/node_modules server/node_modules
rm -rf package-lock.json cli/package-lock.json server/package-lock.json

# Reinstall
npm install
cd cli && npm install && npm run build && npm link
cd ../server && npm install

# Test
terminalwon start
```

## Checking Your Version

Run the version checker script:

```bash
./check-node-version.sh
```

This will tell you if your Node.js version is compatible and provide instructions if it's not.

## Technical Details

### Why node-pty?

`node-pty` is a library that provides true pseudo-terminal (PTY) functionality, allowing TerminalWON to:
- Stream terminal I/O in real-time
- Preserve ANSI colors and formatting
- Support interactive programs (vim, nano, etc.)
- Handle terminal resize events
- Provide full shell experience

### Alternatives Considered

We evaluated alternatives but none provide the same level of functionality:
- `child_process.spawn()` - No PTY, breaks interactive programs
- `pty.js` - Deprecated, unmaintained
- `node-pty-prebuilt` - Still has same v24 issues
- Custom PTY implementation - Too complex, platform-specific

## Future Plans

We're monitoring the situation and will update to support Node.js v24 when:
1. `node-pty` releases a v24-compatible version, OR
2. A suitable alternative library becomes available, OR
3. Node.js v24 changes are reverted/fixed

## Questions?

If you're having Node.js version issues:

1. Check the [Troubleshooting Guide](../GETTING_STARTED.md#-troubleshooting)
2. Run `./check-node-version.sh` for automated diagnosis
3. Join our [Discord](https://discord.gg/UM9CY5A6q) for help
4. Open an [issue](https://github.com/jsodeh/terminalwon/issues) if problems persist

---

**Last Updated**: January 2026  
**Applies To**: TerminalWON v2.0.0+

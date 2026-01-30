#!/bin/bash

# TerminalWON Node.js Version Checker
# Verifies that Node.js version is compatible with node-pty

echo ""
echo "🔍 TerminalWON Node.js Version Checker"
echo "========================================"
echo ""

# Get Node.js version
NODE_VERSION=$(node --version 2>/dev/null)

if [ -z "$NODE_VERSION" ]; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js v18 or v20 from:"
    echo "https://nodejs.org/"
    echo ""
    exit 1
fi

echo "Current Node.js version: $NODE_VERSION"
echo ""

# Extract major version number
MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')

# Check compatibility
if [ "$MAJOR_VERSION" -ge 24 ]; then
    echo "❌ INCOMPATIBLE VERSION DETECTED!"
    echo ""
    echo "Node.js v24+ has breaking changes that prevent node-pty from working."
    echo "You will encounter 'posix_spawnp failed' errors."
    echo ""
    echo "✅ SOLUTION: Downgrade to Node.js v18 or v20 LTS"
    echo ""
    echo "Quick fix using nvm:"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "  source ~/.zshrc  # or ~/.bashrc"
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo "  nvm alias default 20"
    echo ""
    exit 1
elif [ "$MAJOR_VERSION" -ge 18 ] && [ "$MAJOR_VERSION" -lt 24 ]; then
    echo "✅ Compatible version detected!"
    echo ""
    echo "Node.js $NODE_VERSION is compatible with TerminalWON."
    echo "You can proceed with installation."
    echo ""
    exit 0
else
    echo "⚠️  OLD VERSION DETECTED"
    echo ""
    echo "Node.js $NODE_VERSION is older than v18."
    echo "While it may work, we recommend upgrading to v18 or v20 LTS."
    echo ""
    echo "Install Node.js v20:"
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo "  nvm alias default 20"
    echo ""
    exit 1
fi

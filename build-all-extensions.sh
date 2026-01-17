#!/bin/bash

echo "🚀 Building all TerminalWON IDE Extensions..."
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to build extension
build_extension() {
    local name=$1
    local path=$2
    
    echo -e "${YELLOW}Building $name extension...${NC}"
    cd "$path"
    
    if npm install; then
        if npm run compile; then
            echo -e "${GREEN}✅ $name extension built successfully${NC}"
            echo
            return 0
        else
            echo -e "${RED}❌ $name extension compilation failed${NC}"
            echo
            return 1
        fi
    else
        echo -e "${RED}❌ $name extension npm install failed${NC}"
        echo
        return 1
    fi
}

# Build CLI tool
echo -e "${YELLOW}Building CLI tool...${NC}"
cd cli
if npm install && npm run build; then
    echo -e "${GREEN}✅ CLI tool built successfully${NC}"
    echo
    CLI_SUCCESS=1
else
    echo -e "${RED}❌ CLI tool build failed${NC}"
    echo
    CLI_SUCCESS=0
fi

# Return to root
cd ..

# Build extensions
VSCODE_SUCCESS=0
CURSOR_SUCCESS=0
KIRO_SUCCESS=0

if build_extension "VSCode" "extensions/vscode"; then
    VSCODE_SUCCESS=1
fi

if build_extension "Cursor" "extensions/cursor"; then
    CURSOR_SUCCESS=1
fi

if build_extension "Kiro" "extensions/kiro"; then
    KIRO_SUCCESS=1
fi

# Summary
echo "📊 Build Summary:"
echo "=================="

if [ $CLI_SUCCESS -eq 1 ]; then
    echo -e "${GREEN}✅ CLI Tool${NC}"
else
    echo -e "${RED}❌ CLI Tool${NC}"
fi

if [ $VSCODE_SUCCESS -eq 1 ]; then
    echo -e "${GREEN}✅ VSCode Extension${NC}"
else
    echo -e "${RED}❌ VSCode Extension${NC}"
fi

if [ $CURSOR_SUCCESS -eq 1 ]; then
    echo -e "${GREEN}✅ Cursor Extension${NC}"
else
    echo -e "${RED}❌ Cursor Extension${NC}"
fi

if [ $KIRO_SUCCESS -eq 1 ]; then
    echo -e "${GREEN}✅ Kiro Extension${NC}"
else
    echo -e "${RED}❌ Kiro Extension${NC}"
fi

echo
TOTAL_SUCCESS=$((CLI_SUCCESS + VSCODE_SUCCESS + CURSOR_SUCCESS + KIRO_SUCCESS))

if [ $TOTAL_SUCCESS -eq 4 ]; then
    echo -e "${GREEN}🎉 All components built successfully!${NC}"
    echo
    echo "Next steps:"
    echo "1. Install VSCode extension: code --install-extension extensions/vscode"
    echo "2. Install CLI globally: cd cli && npm install -g ."
    echo "3. Test connection: terminalwon connect"
else
    echo -e "${YELLOW}⚠️  $TOTAL_SUCCESS/4 components built successfully${NC}"
fi

echo
echo "🔧 Development setup complete!"
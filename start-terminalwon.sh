#!/bin/bash

# TerminalWON Startup Script
# Starts the hub server and PWA server

echo "🚀 Starting TerminalWON..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "   Install from: https://nodejs.org/"
    exit 1
fi

# Install server dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Start hub server in background
echo "🔌 Starting Hub Server (port 3002)..."
node server/hub-server.js &
HUB_PID=$!

# Wait for hub to start
sleep 1

# Start PWA server in background
echo "🌐 Starting PWA Server (port 8080)..."
node server/mobile-server.js &
PWA_PID=$!

# Get local IP
if command -v ipconfig &> /dev/null; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
fi

echo ""
echo "✅ TerminalWON is running!"
echo ""
echo "📱 Open on your phone: http://$LOCAL_IP:8080"
echo "💻 Open on computer:   http://localhost:8080"
echo ""
echo "🔧 To start streaming in any terminal:"
echo "   terminalwon start"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Handle shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down TerminalWON..."
    kill $HUB_PID 2>/dev/null
    kill $PWA_PID 2>/dev/null
    echo "✅ Stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait

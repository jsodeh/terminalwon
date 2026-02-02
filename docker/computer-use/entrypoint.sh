#!/bin/bash
# Entrypoint script for computer-use agent

# Start Xvfb (virtual framebuffer)
echo "Starting Xvfb display..."
Xvfb :99 -screen 0 ${SCREEN_RESOLUTION:-1920x1080x24} &
sleep 2

# Start VNC server for debugging (optional)
if [ "$ENABLE_VNC" = "true" ]; then
    echo "Starting VNC server..."
    x11vnc -display :99 -forever -shared -rfbport 5900 &
fi

echo "Starting TerminalWON Computer-Use Agent..."
exec "$@"

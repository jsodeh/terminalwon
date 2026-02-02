# TerminalWON Computer-Use Agent
# Uses Anthropic computer-use to continue IDE chat conversations

FROM python:3.11-slim

# Install system dependencies for screenshot and display
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    x11-utils \
    scrot \
    python3-tk \
    xdotool \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -s /bin/bash agent && \
    mkdir -p /app/data && \
    chown -R agent:agent /app

WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY --chown=agent:agent . .

# Switch to non-root user
USER agent

# Environment defaults
ENV DISPLAY=:99
ENV SCREEN_RESOLUTION=1920x1080x24
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Health check script
COPY --chown=agent:agent healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh

# Start Xvfb and the agent
COPY --chown=agent:agent entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "-m", "computer_use_agent.main"]

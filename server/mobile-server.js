#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { ConfigManager } = require('./config');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`📱 ${req.method} ${req.url}`);

  // Initialize ConfigManager
  let configManager;
  try {
    configManager = new ConfigManager();
  } catch (e) {
    console.error('Failed to load config:', e);
  }

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Check setup status and redirect if needed
  const isSetup = configManager?.isSetupComplete();
  const isSetupPage = req.url === '/setup' || req.url === '/mobile-setup.html' || req.url.startsWith('/assets/') || req.url === '/manifest.json' || req.url === '/sw.js';

  // CLI flag override: --setup
  const forceSetup = process.argv.includes('--setup');

  if ((!isSetup || forceSetup) && !isSetupPage) {
    res.writeHead(302, { 'Location': '/setup' });
    res.end();
    return;
  }

  // Route handling
  let filePath;
  if (req.url === '/') {
    filePath = 'mobile-dashboard.html';
  } else if (req.url === '/setup') {
    filePath = 'mobile-setup.html';
  } else if (req.url === '/settings') {
    filePath = 'mobile-settings.html';
  } else if (req.url.startsWith('/terminal/')) {
    filePath = 'mobile-terminal-detail.html';
  } else if (req.url === '/activity') {
    filePath = 'mobile-activity-feed.html';
  } else if (req.url === '/ai' || req.url === '/ai-sessions') {
    filePath = 'mobile-ai-sessions.html';
  } else if (req.url.startsWith('/ai-conversation')) {
    // Handle both /ai-conversation and /ai-conversation/:sessionId
    filePath = 'mobile-ai-conversations.html';
  } else if (req.url.startsWith('/mobile-ai-conversations.html')) {
    // Handle direct file path with query string
    filePath = 'mobile-ai-conversations.html';
  } else if (req.url === '/connect') {

    filePath = 'mobile-connect-terminal.html';
  } else if (req.url === '/settings') {
    filePath = 'mobile-settings.html';
  } else if (req.url === '/setup') {
    filePath = 'mobile-setup.html';
  } else {
    // Remove leading slash
    filePath = req.url.startsWith('/') ? req.url.slice(1) : req.url;
  }

  const fullPath = path.join(PUBLIC_DIR, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = path.extname(fullPath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(fullPath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>📱 TerminalWON</h1>
              <p>Page not found: ${req.url}</p>
              <p><a href="/">Go to Dashboard</a></p>
            </body>
          </html>
        `);
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('📱 TerminalWON PWA Server running on:');
  console.log(`   🌐 Local: http://localhost:${PORT}`);
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down PWA server...');
  server.close(() => {
    process.exit(0);
  });
});

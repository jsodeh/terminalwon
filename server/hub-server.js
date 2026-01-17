#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const os = require('os');
const { spawn } = require('child_process');

// Import Chat History Manager for AI chat integration
const { ChatHistoryManager } = require('./chat/ChatHistoryManager');
const path = require('path');

// Chat History Manager instance (initialized on server start)
let chatHistoryManager = null;

// Try to load node-pty (will work in Node.js outside of sandboxed environments)
let pty = null;
let ptyAvailable = false;

try {
    pty = require('node-pty');
    // Test if PTY actually works by trying to spawn
    const testShell = os.platform() === 'win32' ? 'cmd.exe' : '/bin/sh';
    const testPty = pty.spawn(testShell, [], { cols: 80, rows: 24 });
    testPty.kill();
    ptyAvailable = true;
    console.log('✅ node-pty loaded and working - Full PTY terminals available');
} catch (e) {
    console.log('⚠️ node-pty not available or sandboxed - Using child_process fallback');
    console.log('   (This provides command execution but not full PTY features)');
}

// Create HTTP server for health check and API
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            clients: wss.clients.size,
            terminals: ptyTerminals.size,
            ptyAvailable: ptyAvailable
        }));
    } else if (req.url === '/api/terminals') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const terminalList = getTerminalList();
        res.end(JSON.stringify({ terminals: terminalList }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// State management
const clients = new Map();           // WebSocket -> client info
const terminals = new Map();         // Terminal ID -> terminal metadata (non-PTY)
const ptyTerminals = new Map();      // Terminal ID -> PTY/Process
const terminalSubscribers = new Map(); // Terminal ID -> Set of WebSocket clients
let messageId = 0;

// Get default shell for the platform
function getDefaultShell() {
    if (os.platform() === 'win32') {
        return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/zsh';
}

// Create a new PTY terminal (or fallback to child_process)
function createPTYTerminal(name, cwd, requestingClient) {
    const terminalId = `pty-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const shell = getDefaultShell();
    const workingDir = cwd || process.cwd();
    
    console.log(`🖥️ Creating terminal: ${name || 'Terminal'} in ${workingDir}`);
    
    try {
        let terminalProcess;
        let isPty = false;
        
        if (ptyAvailable && pty) {
            // Use real PTY
            terminalProcess = pty.spawn(shell, [], {
                name: 'xterm-256color',
                cols: 120,
                rows: 30,
                cwd: workingDir,
                env: { ...process.env, TERM: 'xterm-256color', TERM_PROGRAM: 'TerminalWON' }
            });
            isPty = true;
        } else {
            // Fallback: Use child_process with shell
            // Use unbuffered mode for immediate output
            terminalProcess = spawn(shell, [], {
                cwd: workingDir,
                env: { 
                    ...process.env, 
                    TERM: 'xterm-256color', 
                    TERM_PROGRAM: 'TerminalWON',
                    PS1: '$ '  // Simple prompt
                },
                shell: false,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        }
        
        const terminalInfo = {
            id: terminalId,
            name: name || `Terminal ${ptyTerminals.size + 1}`,
            cwd: workingDir,
            status: 'active',
            tool: isPty ? 'hub-pty' : 'hub-shell',
            streaming: true,
            createdAt: new Date(),
            lastActivity: new Date(),
            shell: shell,
            pid: terminalProcess.pid,
            isPty: isPty
        };
        
        ptyTerminals.set(terminalId, { process: terminalProcess, info: terminalInfo, isPty });
        terminalSubscribers.set(terminalId, new Set());
        
        // Subscribe the requesting client
        if (requestingClient) {
            terminalSubscribers.get(terminalId).add(requestingClient);
        }
        
        if (isPty) {
            // Handle PTY output
            terminalProcess.onData((data) => {
                terminalInfo.lastActivity = new Date();
                broadcastToSubscribers(terminalId, 'terminal.output', {
                    terminalId,
                    content: data,
                    timestamp: new Date()
                });
            });
            
            // Handle PTY exit
            terminalProcess.onExit(({ exitCode, signal }) => {
                console.log(`🔚 PTY terminal exited: ${terminalId} (code: ${exitCode})`);
                terminalInfo.status = 'closed';
                
                broadcastToSubscribers(terminalId, 'terminal.closed', {
                    terminalId,
                    exitCode,
                    signal
                });
                
                ptyTerminals.delete(terminalId);
                terminalSubscribers.delete(terminalId);
            });
        } else {
            // Handle child_process output
            terminalProcess.stdout.on('data', (data) => {
                terminalInfo.lastActivity = new Date();
                broadcastToSubscribers(terminalId, 'terminal.output', {
                    terminalId,
                    content: data.toString(),
                    timestamp: new Date()
                });
            });
            
            terminalProcess.stderr.on('data', (data) => {
                terminalInfo.lastActivity = new Date();
                broadcastToSubscribers(terminalId, 'terminal.output', {
                    terminalId,
                    content: data.toString(),
                    timestamp: new Date()
                });
            });
            
            terminalProcess.on('close', (code) => {
                console.log(`🔚 Shell terminal exited: ${terminalId} (code: ${code})`);
                terminalInfo.status = 'closed';
                
                broadcastToSubscribers(terminalId, 'terminal.closed', {
                    terminalId,
                    exitCode: code
                });
                
                ptyTerminals.delete(terminalId);
                terminalSubscribers.delete(terminalId);
            });
            
            terminalProcess.on('error', (err) => {
                console.error(`❌ Shell error: ${terminalId}`, err);
            });
        }
        
        console.log(`✅ Terminal created: ${terminalId} (PID: ${terminalProcess.pid}, PTY: ${isPty})`);
        return { terminalId, info: terminalInfo };
        
    } catch (error) {
        console.error(`❌ Failed to create terminal:`, error);
        return { error: error.message };
    }
}

// Send input to a terminal
function sendToTerminal(terminalId, input) {
    const terminal = ptyTerminals.get(terminalId);
    if (!terminal || !terminal.process) return false;
    
    terminal.info.lastActivity = new Date();
    
    if (terminal.isPty) {
        terminal.process.write(input);
    } else {
        terminal.process.stdin.write(input);
    }
    return true;
}

// Resize a PTY terminal
function resizePTY(terminalId, cols, rows) {
    const terminal = ptyTerminals.get(terminalId);
    if (terminal && terminal.process && terminal.isPty) {
        terminal.process.resize(cols, rows);
        return true;
    }
    return false;
}

// Close a terminal
function closeTerminal(terminalId) {
    const terminal = ptyTerminals.get(terminalId);
    if (terminal && terminal.process) {
        if (terminal.isPty) {
            terminal.process.kill();
        } else {
            terminal.process.kill('SIGTERM');
        }
        ptyTerminals.delete(terminalId);
        terminalSubscribers.delete(terminalId);
        return true;
    }
    return false;
}

// Broadcast message to all subscribers of a terminal
function broadcastToSubscribers(terminalId, type, payload) {
    const subscribers = terminalSubscribers.get(terminalId);
    if (!subscribers) return;
    
    const message = JSON.stringify({
        type,
        payload,
        timestamp: new Date(),
        messageId: ++messageId
    });
    
    subscribers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Get combined list of all terminals
function getTerminalList() {
    const list = [];
    
    // Add PTY/shell terminals
    for (const [id, terminal] of ptyTerminals.entries()) {
        list.push({
            ...terminal.info,
            type: terminal.isPty ? 'pty' : 'shell'
        });
    }
    
    // Add registered non-PTY terminals
    for (const [id, terminal] of terminals.entries()) {
        list.push({
            ...terminal,
            type: 'external'
        });
    }
    
    return list;
}


// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    clients.set(ws, { id: clientId, connectedAt: new Date(), subscribedTerminals: new Set() });
    
    console.log(`🔗 Client connected: ${clientId} (Total: ${wss.clients.size})`);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        payload: { 
            clientId, 
            message: 'Connected to TerminalWON Hub',
            ptyAvailable: pty !== null,
            serverVersion: '2.0.0'
        },
        timestamp: new Date(),
        messageId: ++messageId
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleClientMessage(ws, clientId, message);
        } catch (error) {
            console.error(`❌ Error parsing message from ${clientId}:`, error);
        }
    });

    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        
        // Unsubscribe from all terminals
        if (clientInfo && clientInfo.subscribedTerminals) {
            clientInfo.subscribedTerminals.forEach(terminalId => {
                const subscribers = terminalSubscribers.get(terminalId);
                if (subscribers) {
                    subscribers.delete(ws);
                }
            });
        }
        
        // Unsubscribe from chat updates (Requirements 6.3)
        if (chatHistoryManager) {
            chatHistoryManager.unsubscribe(ws);
        }
        
        // Clean up terminals registered by this client
        for (const [terminalId, terminal] of terminals.entries()) {
            if (terminal.clientId === clientId) {
                terminals.delete(terminalId);
                console.log(`🗑️ Removed external terminal ${terminalId} (client disconnected)`);
            }
        }
        
        clients.delete(ws);
        console.log(`🔌 Client disconnected: ${clientId} (Remaining: ${wss.clients.size})`);
    });

    ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error);
    });
});

// Handle incoming messages from clients
async function handleClientMessage(ws, clientId, message) {
    console.log(`📨 Message from ${clientId}:`, message.type);
    
    switch (message.type) {
        case 'auth':
            console.log(`🔐 Auth from ${clientId}:`, message.payload.tool);
            ws.send(JSON.stringify({
                type: 'auth.success',
                payload: { authenticated: true, ptyAvailable: pty !== null },
                timestamp: new Date(),
                messageId: ++messageId
            }));
            break;
            
        // === PTY Terminal Management ===
        
        case 'terminal.create':
            // Create a new PTY terminal on the hub
            const { name, cwd } = message.payload || {};
            const result = createPTYTerminal(name, cwd, ws);
            
            if (result.error) {
                ws.send(JSON.stringify({
                    type: 'terminal.create.error',
                    payload: { error: result.error },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            } else {
                // Subscribe the creator to this terminal
                const clientInfo = clients.get(ws);
                if (clientInfo) {
                    clientInfo.subscribedTerminals.add(result.terminalId);
                }
                
                ws.send(JSON.stringify({
                    type: 'terminal.created',
                    payload: result.info,
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                
                // Broadcast to all clients that a new terminal was created
                broadcastToAll('terminal.new', result.info, ws);
            }
            break;
            
        case 'terminal.subscribe':
            // Subscribe to receive output from a terminal
            const subTerminalId = message.payload.terminalId;
            const subscribers = terminalSubscribers.get(subTerminalId);
            
            if (subscribers) {
                subscribers.add(ws);
                const clientInfo = clients.get(ws);
                if (clientInfo) {
                    clientInfo.subscribedTerminals.add(subTerminalId);
                }
                
                ws.send(JSON.stringify({
                    type: 'terminal.subscribed',
                    payload: { terminalId: subTerminalId },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                console.log(`📺 Client ${clientId} subscribed to terminal ${subTerminalId}`);
            } else {
                ws.send(JSON.stringify({
                    type: 'terminal.subscribe.error',
                    payload: { terminalId: subTerminalId, error: 'Terminal not found' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;
            
        case 'terminal.input':
            // Send input to a terminal
            const inputTerminalId = message.payload.terminalId;
            const input = message.payload.input || message.payload.data;
            
            if (sendToTerminal(inputTerminalId, input)) {
                console.log(`⌨️ Input sent to terminal ${inputTerminalId}`);
            } else {
                // Try external terminal
                const externalTerminal = terminals.get(inputTerminalId);
                if (externalTerminal) {
                    // Route to the client that owns this terminal
                    broadcastToTerminalOwner(inputTerminalId, 'terminal.input', {
                        terminalId: inputTerminalId,
                        input: input
                    });
                }
            }
            break;
            
        case 'terminal.execute':
            // Execute a command (send with newline)
            const execTerminalId = message.payload.terminalId;
            const command = message.payload.command;
            
            if (sendToTerminal(execTerminalId, command + '\n')) {
                console.log(`🎮 Command executed in terminal ${execTerminalId}: ${command}`);
            } else {
                // Try external terminal
                broadcastToTerminalOwner(execTerminalId, 'terminal.execute', {
                    terminalId: execTerminalId,
                    command: command
                });
            }
            break;
            
        case 'terminal.resize':
            const resizeTerminalId = message.payload.terminalId;
            const { cols, rows } = message.payload;
            
            if (resizePTY(resizeTerminalId, cols, rows)) {
                console.log(`📐 Terminal ${resizeTerminalId} resized to ${cols}x${rows}`);
            }
            break;
            
        case 'terminal.close':
            const closeTerminalId = message.payload.terminalId;
            
            if (closeTerminal(closeTerminalId)) {
                console.log(`🔚 Terminal ${closeTerminalId} closed`);
                broadcastToAll('terminal.closed', { terminalId: closeTerminalId });
            }
            break;
            
        // === External Terminal Registration (from IDE extensions) ===
        
        case 'terminal.register':
            console.log(`📟 External terminal registered: ${message.payload.name}`);
            terminals.set(message.payload.id, {
                ...message.payload,
                clientId: clientId,
                type: 'external',
                registeredAt: new Date(),
                lastActivity: new Date()
            });
            
            // Create subscriber set for this terminal
            terminalSubscribers.set(message.payload.id, new Set([ws]));
            
            // Broadcast to all clients
            broadcastToAll('terminal.new', message.payload, ws);
            break;
            
        case 'terminal.output':
            // Output from external terminal - broadcast to subscribers
            const outputTerminalId = message.payload.terminalId;
            
            if (terminals.has(outputTerminalId)) {
                terminals.get(outputTerminalId).lastActivity = new Date();
            }
            
            broadcastToSubscribers(outputTerminalId, 'terminal.output', message.payload);
            break;
            
        // === Terminal Listing ===
        
        case 'terminals.list':
            const terminalList = getTerminalList();
            ws.send(JSON.stringify({
                type: 'message',
                payload: { terminals: terminalList },
                timestamp: new Date(),
                messageId: message.payload?.messageId || ++messageId
            }));
            break;
            
        // === Chat History API (Requirements 4.1, 4.5, 5.1, 5.4, 6.1, 6.3) ===
        
        case 'chat.sessions.list':
            // Return all available chat sessions (Requirements 4.1, 4.3, 4.4, 4.5)
            if (chatHistoryManager) {
                const sessions = chatHistoryManager.getAllSessions();
                ws.send(JSON.stringify({
                    type: 'chat.sessions',
                    payload: {
                        sessions: sessions.map(s => ({
                            id: s.id,
                            title: s.title,
                            sourceIDE: s.sourceIDE,
                            workspacePath: s.workspacePath,
                            workspaceName: s.workspaceName,
                            dateCreated: s.dateCreated,
                            lastActivity: s.lastActivity,
                            messageCount: s.messageCount
                        }))
                    },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            } else {
                ws.send(JSON.stringify({
                    type: 'chat.sessions',
                    payload: { sessions: [] },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;
            
        case 'chat.session.get':
            // Return full session with messages (Requirements 5.1, 5.2, 5.3, 5.4)
            const requestedSessionId = message.payload?.sessionId;
            
            if (!requestedSessionId) {
                ws.send(JSON.stringify({
                    type: 'chat.session.error',
                    payload: { error: 'Session ID required' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                break;
            }
            
            if (chatHistoryManager) {
                try {
                    const session = await chatHistoryManager.getSession(requestedSessionId);
                    
                    if (session) {
                        ws.send(JSON.stringify({
                            type: 'chat.session',
                            payload: {
                                session: {
                                    id: session.id,
                                    title: session.title,
                                    sourceIDE: session.sourceIDE,
                                    workspacePath: session.workspacePath,
                                    workspaceName: session.workspaceName,
                                    dateCreated: session.dateCreated,
                                    lastActivity: session.lastActivity,
                                    messageCount: session.messageCount,
                                    messages: (session.messages || []).map(m => ({
                                        id: m.id,
                                        role: m.role,
                                        content: m.content,
                                        timestamp: m.timestamp,
                                        metadata: m.metadata
                                    }))
                                }
                            },
                            timestamp: new Date(),
                            messageId: ++messageId
                        }));
                    } else {
                        // Session not found (Requirement 5.4)
                        ws.send(JSON.stringify({
                            type: 'chat.session.error',
                            payload: { error: 'Session not found' },
                            timestamp: new Date(),
                            messageId: ++messageId
                        }));
                    }
                } catch (e) {
                    console.error(`❌ Error getting session ${requestedSessionId}:`, e);
                    ws.send(JSON.stringify({
                        type: 'chat.session.error',
                        payload: { error: 'Failed to retrieve session' },
                        timestamp: new Date(),
                        messageId: ++messageId
                    }));
                }
            } else {
                ws.send(JSON.stringify({
                    type: 'chat.session.error',
                    payload: { error: 'Chat history not available' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;
            
        case 'chat.subscribe':
            // Subscribe to real-time chat updates (Requirements 6.1, 6.2)
            if (chatHistoryManager) {
                chatHistoryManager.subscribe(ws);
                console.log(`💬 Client ${clientId} subscribed to chat updates`);
                ws.send(JSON.stringify({
                    type: 'chat.subscribed',
                    payload: { success: true },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            } else {
                ws.send(JSON.stringify({
                    type: 'chat.subscribed',
                    payload: { success: false, error: 'Chat history not available' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;
            
        case 'chat.unsubscribe':
            // Unsubscribe from chat updates
            if (chatHistoryManager) {
                chatHistoryManager.unsubscribe(ws);
                console.log(`💬 Client ${clientId} unsubscribed from chat updates`);
            }
            ws.send(JSON.stringify({
                type: 'chat.unsubscribed',
                payload: { success: true },
                timestamp: new Date(),
                messageId: ++messageId
            }));
            break;
            
        default:
            console.log(`❓ Unknown message type: ${message.type}`);
    }
}

// Broadcast to all connected clients
function broadcastToAll(type, payload, excludeWs = null) {
    const message = JSON.stringify({
        type,
        payload,
        timestamp: new Date(),
        messageId: ++messageId
    });
    
    wss.clients.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Broadcast to the client that owns a terminal
function broadcastToTerminalOwner(terminalId, type, payload) {
    const terminal = terminals.get(terminalId);
    if (!terminal) return;
    
    const message = JSON.stringify({
        type,
        payload,
        timestamp: new Date(),
        messageId: ++messageId
    });
    
    // Find the client that owns this terminal
    for (const [ws, clientInfo] of clients.entries()) {
        if (clientInfo.id === terminal.clientId && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            return;
        }
    }
}

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n🚀 TerminalWON Hub Server v2.0 running on:`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   API: http://localhost:${PORT}/api/terminals`);
    console.log(`   PTY Support: ${ptyAvailable ? '✅ Full PTY' : '⚡ Shell fallback'}`);
    
    // Initialize Chat History Manager (Requirements 1.1, 2.1, 3.1)
    try {
        chatHistoryManager = new ChatHistoryManager();
        await chatHistoryManager.initialize();
        console.log(`   💬 Chat History: ✅ Initialized (${chatHistoryManager.getSessionCount()} sessions)`);
        console.log(`   📁 Watching: ${chatHistoryManager.getReaderNames().join(', ')}`);
    } catch (e) {
        console.error(`   💬 Chat History: ❌ Failed to initialize:`, e.message);
        // Continue without chat history - graceful degradation
    }
    
    console.log(`\n🎉 Ready for connections!\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down TerminalWON Hub...');
    
    // Shutdown chat history manager
    if (chatHistoryManager) {
        await chatHistoryManager.shutdown();
        console.log('💬 Chat history manager shutdown');
    }
    
    // Close all terminals
    for (const [terminalId, terminal] of ptyTerminals.entries()) {
        if (terminal.isPty) {
            terminal.process.kill();
        } else {
            terminal.process.kill('SIGTERM');
        }
    }
    
    wss.clients.forEach(ws => {
        ws.close(1000, 'Server shutting down');
    });
    
    server.close(() => {
        console.log('✅ Server closed gracefully');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const os = require('os');
const { spawn } = require('child_process');

// Import Chat History Manager for AI chat integration
const { ChatHistoryManager } = require('./chat/ChatHistoryManager');
const path = require('path');

// Import Terminal Agents
const { ClaudeClient, TerminalAgent, IDEAgent } = require('./agents');
const { AIProviderManager } = require('./agents/AIProviderManager');

// Import Configuration and Tunnel Manager
const { ConfigManager, TunnelManager } = require('./config');

// Chat History Manager instance (initialized on server start)
let chatHistoryManager = null;

// Configuration manager (persistent settings)
let configManager = null;

// AI Provider manager (multi-provider support)
let aiProviderManager = null;

// Tunnel manager (subprocess control for ngrok, cloudflared, etc.)
let tunnelManager = null;

// Shared Claude client for agents (legacy, being replaced by AIProviderManager)
let claudeClient = null;

// Terminal agents map
const terminalAgents = new Map(); // Terminal ID -> TerminalAgent

// IDE agents map
const ideAgents = new Map(); // IDE type -> IDEAgent

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

        // Create terminal agent if AI provider is configured
        if (aiProviderManager && configManager) {
            const agent = new TerminalAgent({
                terminalId,
                terminalInfo,
                aiProviderManager,
                configManager,
                onTimelineEvent: (event) => {
                    // Broadcast agent timeline events to subscribers
                    broadcastToSubscribers(terminalId, 'agent.timeline', event);

                    // If error detected, correlate with IDE chat history
                    if (event.type === 'error_detected' && terminalInfo.cwd) {
                        // Try to correlate with each IDE agent
                        for (const [ideType, ideAgent] of ideAgents.entries()) {
                            ideAgent.correlateTerminalError(event, terminalInfo.cwd)
                                .catch(err => console.error(`[IDEAgent] Correlation error:`, err.message));
                        }
                    }
                }
            });
            terminalAgents.set(terminalId, agent);
        }

        // Subscribe the requesting client
        if (requestingClient) {
            terminalSubscribers.get(terminalId).add(requestingClient);
        }

        if (isPty) {
            // Handle PTY output
            terminalProcess.onData((data) => {
                terminalInfo.lastActivity = new Date();

                // Feed output to agent for analysis
                const agent = terminalAgents.get(terminalId);
                if (agent) {
                    agent.processOutput(data);
                }

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

                // Cleanup agent
                const agent = terminalAgents.get(terminalId);
                if (agent) {
                    agent.destroy();
                    terminalAgents.delete(terminalId);
                }
            });
        } else {
            // Handle child_process output
            terminalProcess.stdout.on('data', (data) => {
                terminalInfo.lastActivity = new Date();

                // Feed output to agent for analysis
                const agent = terminalAgents.get(terminalId);
                if (agent) {
                    agent.processOutput(data.toString());
                }

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

                // Cleanup agent
                const agent = terminalAgents.get(terminalId);
                if (agent) {
                    agent.destroy();
                    terminalAgents.delete(terminalId);
                }
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

        case 'chat.send':
            // Send a message to AI and get response (mobile chat input)
            const chatPayload = message.payload || {};
            const userMessage = chatPayload.message;
            const chatSessionId = chatPayload.sessionId;

            if (!userMessage) {
                ws.send(JSON.stringify({
                    type: 'chat.error',
                    payload: { error: 'Message is required' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                break;
            }

            // Check if AI provider is configured
            if (!aiProviderManager || !configManager?.getActiveProvider()) {
                ws.send(JSON.stringify({
                    type: 'chat.response',
                    payload: {
                        error: 'No AI provider configured. Go to Settings to add an API key.',
                        sessionId: chatSessionId
                    },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                break;
            }

            try {
                // Get session context if available
                let context = [];
                if (chatHistoryManager && chatSessionId) {
                    const session = chatHistoryManager.getSession(chatSessionId);
                    if (session?.messages) {
                        // Include last few messages for context
                        context = session.messages.slice(-10).map(m => ({
                            role: m.role === 'human' ? 'user' : 'assistant',
                            content: m.content
                        }));
                    }
                }

                // Add user's new message
                context.push({ role: 'user', content: userMessage });

                // Send acknowledgment
                ws.send(JSON.stringify({
                    type: 'chat.sending',
                    payload: { sessionId: chatSessionId },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));

                // Call AI provider
                const response = await aiProviderManager.chat(context, {
                    system: 'You are TerminalWON, an AI assistant that helps developers with terminal commands, coding questions, and debugging. Be concise and helpful.'
                });

                ws.send(JSON.stringify({
                    type: 'chat.response',
                    payload: {
                        sessionId: chatSessionId,
                        content: response.content,
                        provider: response.provider,
                        model: response.model
                    },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));

            } catch (error) {
                console.error('[Chat] Error:', error.message);
                ws.send(JSON.stringify({
                    type: 'chat.response',
                    payload: {
                        sessionId: chatSessionId,
                        error: error.message
                    },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        // === Agent Commands ===

        case 'agent.status':
            // Get agent status for a terminal or overall
            const statusTerminalId = message.payload?.terminalId;

            if (statusTerminalId) {
                const agent = terminalAgents.get(statusTerminalId);
                ws.send(JSON.stringify({
                    type: 'agent.status',
                    payload: {
                        terminalId: statusTerminalId,
                        enabled: !!agent,
                        hasError: agent?.lastError ? true : false
                    },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            } else {
                // Overall agent status
                ws.send(JSON.stringify({
                    type: 'agent.status',
                    payload: {
                        enabled: claudeClient?.isReady() || false,
                        activeAgents: terminalAgents.size
                    },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'agent.suggest.apply':
            // Apply a suggested command from agent
            const applyTerminalId = message.payload?.terminalId;
            const suggestedCommand = message.payload?.command;

            if (!applyTerminalId || !suggestedCommand) {
                ws.send(JSON.stringify({
                    type: 'agent.suggest.error',
                    payload: { error: 'Terminal ID and command required' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                break;
            }

            // Execute the command
            if (sendToTerminal(applyTerminalId, suggestedCommand + '\n')) {
                console.log(`🤖 Agent suggestion applied in ${applyTerminalId}: ${suggestedCommand}`);

                // Notify agent of action
                const agent = terminalAgents.get(applyTerminalId);
                if (agent) {
                    agent.applySuggestion(suggestedCommand);
                }

                ws.send(JSON.stringify({
                    type: 'agent.suggest.applied',
                    payload: { terminalId: applyTerminalId, command: suggestedCommand },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            } else {
                ws.send(JSON.stringify({
                    type: 'agent.suggest.error',
                    payload: { error: 'Failed to send command to terminal' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        // === Computer-Use Chat Continuation ===

        case 'agent.chat.continue':
            // Request to continue a chat session via computer-use
            const continueSessionId = message.payload?.sessionId;
            const instructions = message.payload?.instructions || '';

            if (!continueSessionId) {
                ws.send(JSON.stringify({
                    type: 'agent.chat.continue.error',
                    payload: { error: 'Session ID required' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                break;
            }

            // Get session from chat history
            if (chatHistoryManager) {
                try {
                    const session = await chatHistoryManager.getSession(continueSessionId);

                    if (!session) {
                        ws.send(JSON.stringify({
                            type: 'agent.chat.continue.error',
                            payload: { error: 'Session not found' },
                            timestamp: new Date(),
                            messageId: ++messageId
                        }));
                        break;
                    }

                    // Broadcast to computer-use agents (they respond with agent.chat.continue.result)
                    broadcastToAll('agent.chat.continue', {
                        sessionId: continueSessionId,
                        messages: session.messages || [],
                        instructions,
                        sourceIDE: session.sourceIDE,
                        workspacePath: session.workspacePath,
                        requestedBy: clients.get(ws)?.id
                    });

                    ws.send(JSON.stringify({
                        type: 'agent.chat.continue.queued',
                        payload: { sessionId: continueSessionId },
                        timestamp: new Date(),
                        messageId: ++messageId
                    }));
                } catch (e) {
                    ws.send(JSON.stringify({
                        type: 'agent.chat.continue.error',
                        payload: { error: e.message },
                        timestamp: new Date(),
                        messageId: ++messageId
                    }));
                }
            } else {
                ws.send(JSON.stringify({
                    type: 'agent.chat.continue.error',
                    payload: { error: 'Chat history not available' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'agent.chat.continue.result':
            // Result from computer-use agent
            const continueResult = message.payload;
            console.log(`🤖 Chat continuation result:`, continueResult?.success ? 'Success' : 'Failed');

            // Find the client that requested this and send them the result
            const requestedBy = continueResult?.requestedBy;
            if (requestedBy) {
                for (const [clientWs, clientInfo] of clients.entries()) {
                    if (clientInfo.id === requestedBy && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({
                            type: 'agent.chat.continue.complete',
                            payload: continueResult,
                            timestamp: new Date(),
                            messageId: ++messageId
                        }));
                        break;
                    }
                }
            }
            break;

        // === Settings & Configuration ===

        case 'settings.get':
            // Get current configuration (with masked keys)
            if (configManager) {
                ws.send(JSON.stringify({
                    type: 'settings.config',
                    payload: configManager.getConfig(false),
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'settings.providers':
            // Get available providers with status
            if (aiProviderManager) {
                ws.send(JSON.stringify({
                    type: 'settings.providers',
                    payload: { providers: aiProviderManager.getProviders() },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'settings.provider.update':
            // Update provider configuration (API key, enabled state)
            const updateProvider = message.payload?.provider;
            const updateConfig = message.payload?.config || {};

            if (!updateProvider || !configManager) {
                ws.send(JSON.stringify({
                    type: 'settings.error',
                    payload: { error: 'Provider and config required' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                break;
            }

            const success = configManager.setProviderConfig(updateProvider, updateConfig);
            ws.send(JSON.stringify({
                type: 'settings.provider.updated',
                payload: { provider: updateProvider, success },
                timestamp: new Date(),
                messageId: ++messageId
            }));
            break;

        case 'settings.provider.test':
            // Test provider connection
            const testProvider = message.payload?.provider;
            const testApiKey = message.payload?.apiKey;

            if (!testProvider || !aiProviderManager) {
                ws.send(JSON.stringify({
                    type: 'settings.provider.test.result',
                    payload: { success: false, error: 'Provider required' },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
                break;
            }

            try {
                const testResult = await aiProviderManager.testConnection(testProvider, testApiKey);
                ws.send(JSON.stringify({
                    type: 'settings.provider.test.result',
                    payload: { provider: testProvider, ...testResult },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            } catch (e) {
                ws.send(JSON.stringify({
                    type: 'settings.provider.test.result',
                    payload: { success: false, error: e.message },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'settings.default.set':
            // Set default provider and model
            const defaultProvider = message.payload?.provider;
            const defaultModel = message.payload?.model;

            if (configManager && defaultProvider) {
                configManager.setDefaultProvider(defaultProvider, defaultModel);
                ws.send(JSON.stringify({
                    type: 'settings.default.updated',
                    payload: { provider: defaultProvider, model: defaultModel },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'settings.tunnel.update':
            // Update tunnel configuration
            const tunnelConfig = message.payload || {};

            if (configManager) {
                configManager.setTunnelConfig(tunnelConfig);
                ws.send(JSON.stringify({
                    type: 'settings.tunnel.updated',
                    payload: { success: true, tunnel: configManager.getConfig().tunnel },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'settings.setup.complete':
            // Mark setup as complete
            if (configManager) {
                configManager.completeSetup();
                ws.send(JSON.stringify({
                    type: 'settings.setup.completed',
                    payload: { success: true },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'settings.setup.status':
            // Check if setup is complete
            ws.send(JSON.stringify({
                type: 'settings.setup.status',
                payload: {
                    complete: configManager?.isSetupComplete() || false,
                    tunnelConfigured: configManager?.getConfig()?.tunnel?.configured || false
                },
            }));
            break;

        // === Tunnel Control ===

        case 'tunnel.detect':
            // Detect installed tunnel tools
            if (tunnelManager) {
                const tools = tunnelManager.detectInstalledTools();
                ws.send(JSON.stringify({
                    type: 'tunnel.detected',
                    payload: { tools },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'tunnel.start':
            // Start a tunnel with specified provider
            const startProvider = message.payload?.provider;
            if (tunnelManager && startProvider) {
                try {
                    const result = await tunnelManager.startTunnel(startProvider);
                    ws.send(JSON.stringify({
                        type: 'tunnel.started',
                        payload: result,
                        timestamp: new Date(),
                        messageId: ++messageId
                    }));

                    // Save URL to config if successful
                    if (result.success && result.url && configManager) {
                        configManager.setTunnelConfig({
                            provider: startProvider,
                            url: result.url,
                            configured: true
                        });
                    }
                } catch (error) {
                    ws.send(JSON.stringify({
                        type: 'tunnel.error',
                        payload: { error: error.message },
                        timestamp: new Date(),
                        messageId: ++messageId
                    }));
                }
            }
            break;

        case 'tunnel.stop':
            // Stop the running tunnel
            if (tunnelManager) {
                const stopResult = tunnelManager.stopTunnel();
                ws.send(JSON.stringify({
                    type: 'tunnel.stopped',
                    payload: stopResult,
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'tunnel.status':
            // Get tunnel status
            if (tunnelManager) {
                ws.send(JSON.stringify({
                    type: 'tunnel.status',
                    payload: tunnelManager.getStatus(),
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        // === Agent Configuration ===

        case 'settings.agents.get':
            // Get all agent configurations
            if (configManager) {
                ws.send(JSON.stringify({
                    type: 'settings.agents',
                    payload: { agents: configManager.getAllAgentConfigs() },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
            break;

        case 'settings.agent.update':
            // Update specific agent configuration
            const agentType = message.payload?.agentType;
            const agentConfigUpdate = message.payload?.config;

            if (configManager && agentType && agentConfigUpdate) {
                configManager.setAgentConfig(agentType, agentConfigUpdate);
                ws.send(JSON.stringify({
                    type: 'settings.agent.updated',
                    payload: {
                        agentType,
                        config: configManager.getAgentConfig(agentType)
                    },
                    timestamp: new Date(),
                    messageId: ++messageId
                }));
            }
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


    // Initialize Configuration Manager and AI Provider
    try {
        configManager = new ConfigManager();
        aiProviderManager = new AIProviderManager(configManager);
        console.log(`   ⚙️  Config: ✅ Loaded from ~/.terminalwon/config.json`);

        const activeProvider = configManager.getActiveProvider();
        if (activeProvider) {
            console.log(`   🔑 Active Provider: ${activeProvider}`);
        } else {
            console.log(`   🔑 No AI provider configured (run setup or add API key)`);
        }

        // Initialize Tunnel Manager
        try {
            tunnelManager = new TunnelManager({ port: PORT });
            const installedTools = tunnelManager.detectInstalledTools();
            const toolsList = Object.keys(installedTools).filter(k => installedTools[k].installed).join(', ');
            console.log(`   🚇 Tunnel Tools: ${toolsList || 'None detected'}`);

            // Auto-start tunnel if configured
            const tunnelConfig = configManager.getConfig().tunnel;
            if (tunnelConfig?.autoStart && tunnelConfig?.provider) {
                console.log(`   🚇 Auto-starting tunnel (${tunnelConfig.provider})...`);
                tunnelManager.startTunnel(tunnelConfig.provider)
                    .then(result => {
                        if (result.success) {
                            console.log(`   ✅ Tunnel URLs: ${result.url}`);
                            configManager.setTunnelConfig({
                                url: result.url,
                                configured: true
                            });
                        } else {
                            console.error(`   ❌ Auto-start failed: ${result.error}`);
                        }
                    })
                    .catch(err => console.error(`   ❌ Tunnel error: ${err.message}`));
            }
        } catch (e) {
            console.error(`   🚇 Tunnel Manager: ❌ Failed to initialize:`, e.message);
        }

    } catch (e) {
        console.error(`   ⚙️  Config: ❌ Failed to initialize:`, e.message);
    }

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

    // Initialize Claude client for legacy compatibility, and AI provider manager for agents
    try {
        claudeClient = new ClaudeClient();
        const hasClaudeKey = claudeClient.isReady();
        const hasAnyProvider = configManager?.getActiveProvider();

        if (hasClaudeKey || hasAnyProvider) {
            console.log(`   🤖 Terminal Agents: ✅ AI Provider ready (${hasAnyProvider || 'anthropic'})`);

            // Initialize IDE agents for each IDE type
            const ideTypes = ['kiro', 'cursor', 'antigravity'];
            for (const ideType of ideTypes) {
                const ideAgent = new IDEAgent({
                    ideType,
                    aiProviderManager,
                    configManager,
                    chatHistoryManager,
                    onInsight: (insight) => {
                        // Broadcast IDE insights to all subscribers
                        broadcastToAll('agent.ide.insight', insight);
                    }
                });

                // Initialize with existing sessions for this IDE
                if (chatHistoryManager) {
                    const allSessions = chatHistoryManager.getAllSessions();
                    ideAgent.initialize(allSessions);
                }

                ideAgents.set(ideType, ideAgent);
            }
            console.log(`   🧠 IDE Agents: ✅ ${ideAgents.size} agents created`);
        } else {
            console.log(`   🤖 Terminal Agents: ⚠️ No AI provider configured (go to Settings to add API key)`);
        }
    } catch (e) {
        console.error(`   🤖 Terminal Agents: ❌ Failed to initialize:`, e.message);
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

    // Cleanup all terminal agents
    for (const [terminalId, agent] of terminalAgents.entries()) {
        agent.destroy();
    }
    terminalAgents.clear();
    console.log('🤖 Terminal agents shutdown');

    // Cleanup all IDE agents
    for (const [ideType, agent] of ideAgents.entries()) {
        agent.destroy();
    }
    ideAgents.clear();
    console.log('🧠 IDE agents shutdown');

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

/**
 * Chat History Manager for TerminalWON AI Chat Integration
 * 
 * Central coordinator that manages all IDE readers and aggregates chat sessions
 * from multiple sources (Kiro, Cursor, and future IDEs).
 * 
 * Requirements: 4.1, 4.3, 4.4, 3.4
 */

const { KiroReader } = require('./readers/KiroReader');
const { CursorReader } = require('./readers/CursorReader');
const { AntigravityReader } = require('./readers/AntigravityReader');
const { ChatFileWatcher } = require('./ChatFileWatcher');

class ChatHistoryManager {
  /**
   * @param {Object} options - Manager options
   * @param {Object} [options.readers] - Custom reader instances (for testing)
   * @param {boolean} [options.enableWatcher=true] - Whether to enable file watching
   * @param {Object} [options.watcherConfig] - Configuration for the file watcher
   */
  constructor(options = {}) {
    /** @type {Map<string, Object>} IDE name -> Reader instance */
    this.readers = new Map();
    
    /** @type {Map<string, import('./models').ChatSession>} sessionId -> ChatSession */
    this.sessions = new Map();
    
    /** @type {Set<Object>} WebSocket clients subscribed to updates */
    this.subscribers = new Set();
    
    /** @type {boolean} Whether the manager has been initialized */
    this.initialized = false;
    
    /** @type {boolean} Whether file watching is enabled */
    this.watcherEnabled = options.enableWatcher !== false;
    
    /** @type {ChatFileWatcher|null} File watcher instance */
    this.watcher = null;
    
    /** @type {Object} Watcher configuration */
    this.watcherConfig = options.watcherConfig || {};
    
    // Initialize with custom readers if provided, otherwise use defaults
    if (options.readers) {
      for (const [name, reader] of Object.entries(options.readers)) {
        this.readers.set(name, reader);
      }
    }
  }

  /**
   * Initializes all readers and performs initial session scan
   * @returns {Promise<void>}
   */
  async initialize() {
    // Add default readers if none were provided
    if (this.readers.size === 0) {
      this.readers.set('kiro', new KiroReader());
      this.readers.set('cursor', new CursorReader());
      this.readers.set('antigravity', new AntigravityReader());
    }

    // Scan all sessions from all readers
    await this.refreshSessions();
    
    // Start file watcher if enabled
    if (this.watcherEnabled) {
      await this.startWatcher();
    }
    
    this.initialized = true;
  }

  /**
   * Starts the file watcher for real-time updates
   * @returns {Promise<void>}
   */
  async startWatcher() {
    if (this.watcher && this.watcher.isWatching()) {
      console.warn('[ChatHistoryManager] Watcher already running');
      return;
    }

    const watchPaths = this.getWatchPaths();
    
    if (watchPaths.length === 0) {
      console.warn('[ChatHistoryManager] No paths to watch');
      return;
    }

    try {
      this.watcher = new ChatFileWatcher(this.watcherConfig);
      
      // Set up session update callback
      this.watcher.setSessionUpdateCallback((result, readerName) => {
        this._handleWatcherUpdate(result, readerName);
      });
      
      // Listen for watcher events
      this.watcher.on('error', (error) => {
        console.error('[ChatHistoryManager] Watcher error:', error.message);
      });
      
      this.watcher.on('sessionUpdate', (data) => {
        console.log(`[ChatHistoryManager] Session update from ${data.reader}: ${data.filePath}`);
      });
      
      await this.watcher.start(watchPaths, this.readers);
      
      console.log('[ChatHistoryManager] File watcher started');
    } catch (e) {
      console.error('[ChatHistoryManager] Failed to start watcher:', e.message);
    }
  }

  /**
   * Stops the file watcher
   * @returns {Promise<void>}
   */
  async stopWatcher() {
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
      console.log('[ChatHistoryManager] File watcher stopped');
    }
  }

  /**
   * Handles updates from the file watcher
   * @param {Object} result - Session or array of sessions from reader
   * @param {string} readerName - Name of the reader that processed the change
   * @private
   */
  _handleWatcherUpdate(result, readerName) {
    if (!result) return;

    // Handle array of sessions (from Cursor reader)
    if (Array.isArray(result)) {
      for (const session of result) {
        this.handleSessionUpdate(session);
      }
    } else {
      // Handle single session (from Kiro reader)
      this.handleSessionUpdate(result);
    }
  }

  /**
   * Checks if the file watcher is running
   * @returns {boolean}
   */
  isWatcherRunning() {
    return !!(this.watcher && this.watcher.isWatching());
  }

  /**
   * Refreshes sessions from all readers
   * @returns {Promise<void>}
   */
  async refreshSessions() {
    this.sessions.clear();
    
    for (const [name, reader] of this.readers) {
      try {
        const sessions = await reader.scanSessions();
        for (const session of sessions) {
          this.sessions.set(session.id, session);
        }
      } catch (e) {
        console.warn(`[ChatHistoryManager] Error scanning sessions from ${name}:`, e.message);
      }
    }
  }

  /**
   * Gets all sessions from all IDEs, sorted by dateCreated descending (newest first)
   * @returns {import('./models').ChatSession[]}
   */
  getAllSessions() {
    const sessions = Array.from(this.sessions.values());
    return this._sortSessionsByDate(sessions);
  }

  /**
   * Aggregates sessions from multiple reader results
   * Used for combining sessions from different sources
   * @param {Array<import('./models').ChatSession[]>} sessionArrays - Arrays of sessions from different readers
   * @returns {import('./models').ChatSession[]}
   */
  aggregateSessions(sessionArrays) {
    const sessionMap = new Map();
    
    // Combine all sessions, using session ID as key to prevent duplicates
    for (const sessions of sessionArrays) {
      if (Array.isArray(sessions)) {
        for (const session of sessions) {
          if (session && session.id) {
            sessionMap.set(session.id, session);
          }
        }
      }
    }
    
    return this._sortSessionsByDate(Array.from(sessionMap.values()));
  }

  /**
   * Sorts sessions by dateCreated in descending order (newest first)
   * @param {import('./models').ChatSession[]} sessions - Sessions to sort
   * @returns {import('./models').ChatSession[]}
   * @private
   */
  _sortSessionsByDate(sessions) {
    return sessions.sort((a, b) => {
      const dateA = a.dateCreated instanceof Date ? a.dateCreated : new Date(a.dateCreated);
      const dateB = b.dateCreated instanceof Date ? b.dateCreated : new Date(b.dateCreated);
      
      // Handle invalid dates by treating them as oldest
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      
      // Descending order (newest first)
      return timeB - timeA;
    });
  }

  /**
   * Gets a specific session by ID
   * @param {string} sessionId - Session ID to retrieve
   * @returns {Promise<import('./models').ChatSession|null>}
   */
  async getSession(sessionId) {
    // First check cache
    if (this.sessions.has(sessionId)) {
      const cachedSession = this.sessions.get(sessionId);
      
      // If session has messages, return it
      if (cachedSession.messages && cachedSession.messages.length > 0) {
        return cachedSession;
      }
      
      // Otherwise, try to load full session from reader
      const reader = this._getReaderForSession(sessionId);
      if (reader) {
        try {
          const fullSession = await reader.readSession(sessionId);
          if (fullSession) {
            this.sessions.set(sessionId, fullSession);
            return fullSession;
          }
        } catch (e) {
          console.warn(`[ChatHistoryManager] Error reading session ${sessionId}:`, e.message);
        }
      }
      
      return cachedSession;
    }

    // Not in cache, search all readers
    for (const [name, reader] of this.readers) {
      try {
        const session = await reader.readSession(sessionId);
        if (session) {
          this.sessions.set(session.id, session);
          return session;
        }
      } catch (e) {
        console.warn(`[ChatHistoryManager] Error reading session from ${name}:`, e.message);
      }
    }

    return null;
  }

  /**
   * Gets the appropriate reader for a session based on its ID prefix
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Reader instance or null
   * @private
   */
  _getReaderForSession(sessionId) {
    if (sessionId.startsWith('kiro-')) {
      return this.readers.get('kiro');
    }
    if (sessionId.startsWith('cursor-')) {
      return this.readers.get('cursor');
    }
    if (sessionId.startsWith('antigravity-')) {
      return this.readers.get('antigravity');
    }
    return null;
  }

  /**
   * Subscribes a client to chat updates
   * @param {Object} ws - WebSocket client
   */
  subscribe(ws) {
    this.subscribers.add(ws);
  }

  /**
   * Unsubscribes a client from chat updates
   * @param {Object} ws - WebSocket client
   */
  unsubscribe(ws) {
    this.subscribers.delete(ws);
  }

  /**
   * Broadcasts a new message to all subscribers
   * @param {string} sessionId - Session ID
   * @param {string} sourceIDE - Source IDE name
   * @param {import('./models').ChatMessage} message - New message
   */
  broadcastNewMessage(sessionId, sourceIDE, message) {
    // Format message to ensure it has all required fields (Requirements 6.4)
    const messageData = message.toJSON ? message.toJSON() : message;
    
    // Ensure message has required fields: role, content, timestamp
    const formattedMessage = {
      id: messageData.id,
      role: messageData.role,
      content: messageData.content,
      timestamp: messageData.timestamp || new Date().toISOString(),
      metadata: messageData.metadata
    };
    
    const payload = {
      type: 'chat.message.new',
      payload: {
        sessionId,
        sourceIDE,
        message: formattedMessage
      },
      timestamp: new Date().toISOString()
    };

    const messageStr = JSON.stringify(payload);
    
    for (const ws of this.subscribers) {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(messageStr);
        }
      } catch (e) {
        console.warn('[ChatHistoryManager] Error broadcasting to subscriber:', e.message);
      }
    }
  }

  /**
   * Handles a session update (e.g., from file watcher)
   * @param {import('./models').ChatSession} session - Updated session
   */
  handleSessionUpdate(session) {
    if (!session || !session.id) return;

    const existingSession = this.sessions.get(session.id);
    
    // Update cache
    this.sessions.set(session.id, session);

    // Check for new messages
    if (existingSession && session.messages) {
      const existingCount = existingSession.messageCount || 0;
      const newCount = session.messages.length;
      
      if (newCount > existingCount) {
        // Broadcast new messages
        const newMessages = session.messages.slice(existingCount);
        for (const message of newMessages) {
          this.broadcastNewMessage(session.id, session.sourceIDE, message);
        }
      }
    }
  }

  /**
   * Gets paths to watch for all readers
   * @returns {string[]}
   */
  getWatchPaths() {
    const paths = [];
    
    for (const reader of this.readers.values()) {
      if (typeof reader.getWatchPaths === 'function') {
        paths.push(...reader.getWatchPaths());
      }
    }
    
    return paths;
  }

  /**
   * Gets the number of active subscribers
   * @returns {number}
   */
  getSubscriberCount() {
    return this.subscribers.size;
  }

  /**
   * Gets the total number of cached sessions
   * @returns {number}
   */
  getSessionCount() {
    return this.sessions.size;
  }

  /**
   * Gets list of registered reader names
   * @returns {string[]}
   */
  getReaderNames() {
    return Array.from(this.readers.keys());
  }

  /**
   * Shuts down the manager and cleans up resources
   * @returns {Promise<void>}
   */
  async shutdown() {
    // Stop the file watcher
    await this.stopWatcher();
    
    // Clear all subscribers
    this.subscribers.clear();
    
    // Clear session cache
    this.sessions.clear();
    
    this.initialized = false;
    
    console.log('[ChatHistoryManager] Shutdown complete');
  }

  /**
   * Gets the watcher status
   * @returns {Object|null} Watcher status or null if not running
   */
  getWatcherStatus() {
    if (!this.watcher) {
      return null;
    }
    return this.watcher.getStatus();
  }
}

module.exports = { ChatHistoryManager };

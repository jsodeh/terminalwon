/**
 * Antigravity Chat History Reader
 * 
 * Reads AI chat history from Antigravity IDE's SQLite storage.
 * Antigravity uses a similar storage format to Cursor (VSCode-based).
 * 
 * Storage location: ~/Library/Application Support/Antigravity/User/workspaceStorage/
 * 
 * Structure:
 * - Each workspace has a folder with a hash-based name
 * - Each folder contains state.vscdb SQLite database
 * - Chat data is stored in ItemTable with keys like:
 *   - 'chat.ChatSessionStore.index' - Chat session index
 *   - 'antigravityUnifiedStateSync.agentPreferences' - Agent preferences
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ChatSession, ChatMessage } = require('../models');

/**
 * Default storage path for Antigravity chat data
 */
const DEFAULT_ANTIGRAVITY_STORAGE_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Antigravity',
  'User',
  'workspaceStorage'
);

/**
 * Keys used to store chat data in Antigravity's SQLite database
 */
const ANTIGRAVITY_CHAT_KEYS = [
  'chat.ChatSessionStore.index',
  'antigravityUnifiedStateSync.agentPreferences'
];

class AntigravityReader {
  /**
   * @param {Object} options - Reader options
   * @param {string} [options.storagePath] - Override default storage path (useful for testing)
   */
  constructor(options = {}) {
    this.name = 'antigravity';
    this.storagePath = options.storagePath || DEFAULT_ANTIGRAVITY_STORAGE_PATH;
    this._Database = null;
  }

  /**
   * Lazily loads the better-sqlite3 module
   * @returns {Function} Database constructor
   * @private
   */
  _getDatabase() {
    if (!this._Database) {
      try {
        this._Database = require('better-sqlite3');
      } catch (e) {
        console.error('[AntigravityReader] Failed to load better-sqlite3:', e.message);
        throw new Error('better-sqlite3 is required for Antigravity chat reading');
      }
    }
    return this._Database;
  }

  /**
   * Checks if the storage directory exists
   * @returns {boolean}
   */
  storageExists() {
    try {
      return fs.existsSync(this.storagePath);
    } catch (e) {
      return false;
    }
  }

  /**
   * Scans all workspace folders and returns chat sessions
   * @returns {Promise<ChatSession[]>}
   */
  async scanSessions() {
    const sessions = [];

    if (!this.storageExists()) {
      console.warn(`[AntigravityReader] Storage directory not found: ${this.storagePath}`);
      return sessions;
    }

    try {
      const workspaceFolders = fs.readdirSync(this.storagePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folderName of workspaceFolders) {
        try {
          const workspaceSessions = await this._scanWorkspaceFolder(folderName);
          sessions.push(...workspaceSessions);
        } catch (e) {
          console.warn(`[AntigravityReader] Error scanning workspace folder ${folderName}:`, e.message);
        }
      }
    } catch (e) {
      console.error(`[AntigravityReader] Error scanning storage directory:`, e.message);
    }

    return sessions;
  }

  /**
   * Scans a single workspace folder for sessions
   * @param {string} folderName - Workspace folder name
   * @returns {Promise<ChatSession[]>}
   * @private
   */
  async _scanWorkspaceFolder(folderName) {
    const sessions = [];
    const folderPath = path.join(this.storagePath, folderName);
    const dbPath = path.join(folderPath, 'state.vscdb');

    if (!fs.existsSync(dbPath)) {
      return sessions;
    }

    const workspacePath = this._getWorkspacePath(folderPath, folderName);

    try {
      const chatData = await this._queryDatabase(dbPath);
      
      if (chatData) {
        const parsedSessions = this._parseChatData(chatData, workspacePath, folderName);
        sessions.push(...parsedSessions);
      }
    } catch (e) {
      if (e.code === 'SQLITE_BUSY' || e.message.includes('locked')) {
        console.warn(`[AntigravityReader] Database locked, skipping: ${dbPath}`);
      } else if (e.message.includes('corrupt') || e.message.includes('malformed')) {
        console.error(`[AntigravityReader] Database corrupted, skipping: ${dbPath}`);
      } else {
        console.warn(`[AntigravityReader] Error reading database ${dbPath}:`, e.message);
      }
    }

    return sessions;
  }

  /**
   * Gets the workspace path from workspace.json or folder name
   * @param {string} folderPath - Path to workspace folder
   * @param {string} folderName - Folder name (fallback)
   * @returns {string}
   * @private
   */
  _getWorkspacePath(folderPath, folderName) {
    const workspaceJsonPath = path.join(folderPath, 'workspace.json');
    
    try {
      if (fs.existsSync(workspaceJsonPath)) {
        const workspaceData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf-8'));
        if (workspaceData.folder) {
          return workspaceData.folder.replace(/^file:\/\//, '');
        }
      }
    } catch (e) {
      // Fall back to folder name
    }
    
    return folderName;
  }

  /**
   * Queries the SQLite database for chat data
   * @param {string} dbPath - Path to state.vscdb
   * @returns {Promise<Object|null>}
   * @private
   */
  async _queryDatabase(dbPath) {
    const Database = this._getDatabase();
    let db = null;
    
    try {
      db = new Database(dbPath, { readonly: true, fileMustExist: true });
      
      const result = {
        chatIndex: null,
        agentPrefs: null
      };

      for (const key of ANTIGRAVITY_CHAT_KEYS) {
        try {
          const row = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key);
          if (row && row.value) {
            if (key === 'chat.ChatSessionStore.index') {
              result.chatIndex = row.value;
            } else if (key === 'antigravityUnifiedStateSync.agentPreferences') {
              result.agentPrefs = row.value;
            }
          }
        } catch (e) {
          // Key might not exist
        }
      }

      return (result.chatIndex || result.agentPrefs) ? result : null;
    } finally {
      if (db) {
        try {
          db.close();
        } catch (e) {}
      }
    }
  }

  /**
   * Parses chat data from Antigravity format into ChatSessions
   * @param {Object} chatData - Raw chat data from database
   * @param {string} workspacePath - Workspace path
   * @param {string} folderName - Folder name for ID generation
   * @returns {ChatSession[]}
   * @private
   */
  _parseChatData(chatData, workspacePath, folderName) {
    const sessions = [];

    if (chatData.chatIndex) {
      try {
        const indexSessions = this._parseChatIndex(chatData.chatIndex, workspacePath, folderName);
        sessions.push(...indexSessions);
      } catch (e) {
        console.warn(`[AntigravityReader] Error parsing chat index:`, e.message);
      }
    }

    return sessions;
  }

  /**
   * Parses chat.ChatSessionStore.index data
   * @param {string} indexJson - JSON string of chat index
   * @param {string} workspacePath - Workspace path
   * @param {string} folderName - Folder name
   * @returns {ChatSession[]}
   * @private
   */
  _parseChatIndex(indexJson, workspacePath, folderName) {
    const sessions = [];
    
    try {
      const data = typeof indexJson === 'string' ? JSON.parse(indexJson) : indexJson;
      
      // Antigravity stores sessions in entries object
      if (data.entries && typeof data.entries === 'object') {
        Object.entries(data.entries).forEach(([sessionId, sessionData], index) => {
          const session = this._parseSession(sessionId, sessionData, workspacePath, folderName);
          if (session) {
            sessions.push(session);
          }
        });
      }
    } catch (e) {
      console.warn(`[AntigravityReader] Failed to parse chat index JSON:`, e.message);
    }

    return sessions;
  }

  /**
   * Parses a single session
   * @param {string} sessionId - Session ID
   * @param {Object} sessionData - Session data
   * @param {string} workspacePath - Workspace path
   * @param {string} folderName - Folder name
   * @returns {ChatSession|null}
   * @private
   */
  _parseSession(sessionId, sessionData, workspacePath, folderName) {
    if (!sessionData || typeof sessionData !== 'object') {
      return null;
    }

    const rawMessages = sessionData.messages || sessionData.history || 
                        sessionData.conversation || [];
    
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return null;
    }

    const messages = this._parseMessages(rawMessages);
    
    if (messages.length === 0) {
      return null;
    }

    const title = sessionData.title || sessionData.name || 
                  this._generateTitleFromMessages(messages) ||
                  'Untitled Antigravity Chat';

    const dateCreated = this._parseDate(sessionData.createdAt || sessionData.timestamp) || new Date();
    const lastActivity = messages.length > 0 
      ? messages[messages.length - 1].timestamp 
      : dateCreated;

    return new ChatSession({
      id: `antigravity-${sessionId}`,
      title: title,
      sourceIDE: 'antigravity',
      workspacePath: workspacePath,
      dateCreated: dateCreated,
      lastActivity: lastActivity,
      messageCount: messages.length,
      messages: messages
    });
  }

  /**
   * Parses message array
   * @param {Array} rawMessages - Raw message array
   * @returns {ChatMessage[]}
   * @private
   */
  _parseMessages(rawMessages) {
    if (!Array.isArray(rawMessages)) {
      return [];
    }

    return rawMessages
      .map((msg, index) => this._parseMessage(msg, index))
      .filter(msg => msg !== null);
  }

  /**
   * Parses a single message
   * @param {Object} msg - Raw message data
   * @param {number} index - Message index
   * @returns {ChatMessage|null}
   * @private
   */
  _parseMessage(msg, index) {
    if (!msg) return null;

    const role = this._normalizeRole(msg.role || msg.type || msg.sender);
    const content = this._extractContent(msg);

    if (!role || content === null) {
      return null;
    }

    return new ChatMessage({
      id: msg.id || msg.messageId || `msg-${index}`,
      role: role,
      content: content,
      timestamp: this._parseDate(msg.timestamp || msg.createdAt) || new Date(),
      metadata: {
        model: msg.model || msg.modelName,
        toolCalls: msg.toolCalls || msg.tool_calls
      }
    });
  }

  /**
   * Normalizes role string
   * @param {string} role - Raw role string
   * @returns {string|null}
   * @private
   */
  _normalizeRole(role) {
    if (!role) return null;
    
    const normalized = String(role).toLowerCase();
    
    if (normalized === 'user' || normalized === 'human') {
      return 'user';
    }
    if (normalized === 'assistant' || normalized === 'ai' || normalized === 'bot' || 
        normalized === 'antigravity' || normalized === 'model' || normalized === 'agent') {
      return 'assistant';
    }
    if (normalized === 'system') {
      return 'system';
    }
    
    return null;
  }

  /**
   * Extracts content from message object
   * @param {Object} msg - Raw message object
   * @returns {string|null}
   * @private
   */
  _extractContent(msg) {
    let content = msg.content !== undefined && msg.content !== null ? msg.content :
                  msg.text !== undefined && msg.text !== null ? msg.text :
                  msg.message !== undefined && msg.message !== null ? msg.message :
                  undefined;

    if (Array.isArray(content)) {
      content = content
        .map(block => {
          if (typeof block === 'string') return block;
          if (block.type === 'text') return block.text || '';
          if (block.type === 'code') {
            const lang = block.language || '';
            const codeContent = block.code !== undefined ? block.code : (block.text || '');
            return `\`\`\`${lang}\n${codeContent}\n\`\`\``;
          }
          return block.text || block.content || '';
        })
        .join('\n');
    }

    if (typeof content !== 'string') {
      return content === undefined || content === null ? null : String(content);
    }

    return content;
  }

  /**
   * Parses a date from various formats
   * @param {*} value - Date value
   * @returns {Date|null}
   * @private
   */
  _parseDate(value) {
    if (!value) return null;
    
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    
    if (typeof value === 'number') {
      const ts = value > 1e12 ? value : value * 1000;
      const date = new Date(ts);
      return isNaN(date.getTime()) ? null : date;
    }
    
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  }

  /**
   * Generates a title from the first user message
   * @param {ChatMessage[]} messages - Message array
   * @returns {string|null}
   * @private
   */
  _generateTitleFromMessages(messages) {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage || !firstUserMessage.content) {
      return null;
    }

    const content = firstUserMessage.content.trim();
    if (content.length <= 50) {
      return content;
    }
    return content.slice(0, 47) + '...';
  }

  /**
   * Reads a specific session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<ChatSession|null>}
   */
  async readSession(sessionId) {
    const rawSessionId = sessionId.startsWith('antigravity-') 
      ? sessionId.slice(12) 
      : sessionId;

    if (!this.storageExists()) {
      return null;
    }

    try {
      const workspaceFolders = fs.readdirSync(this.storagePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folderName of workspaceFolders) {
        const folderPath = path.join(this.storagePath, folderName);
        const dbPath = path.join(folderPath, 'state.vscdb');

        if (!fs.existsSync(dbPath)) continue;

        const workspacePath = this._getWorkspacePath(folderPath, folderName);

        try {
          const chatData = await this._queryDatabase(dbPath);
          
          if (chatData) {
            const sessions = this._parseChatData(chatData, workspacePath, folderName);
            const session = sessions.find(s => 
              s.id === sessionId || 
              s.id === `antigravity-${rawSessionId}` ||
              s.id.includes(rawSessionId)
            );
            
            if (session) return session;
          }
        } catch (e) {
          // Continue searching
        }
      }
    } catch (e) {
      console.error(`[AntigravityReader] Error reading session ${sessionId}:`, e.message);
    }

    return null;
  }

  /**
   * Returns paths to watch for file changes
   * @returns {string[]}
   */
  getWatchPaths() {
    if (!this.storageExists()) {
      return [];
    }
    
    return [
      path.join(this.storagePath, '**', 'state.vscdb')
    ];
  }

  /**
   * Handles file change event
   * @param {string} filePath - Path to changed file
   * @returns {Promise<ChatSession[]>}
   */
  async onFileChange(filePath) {
    if (!filePath.startsWith(this.storagePath) || !filePath.endsWith('state.vscdb')) {
      return [];
    }

    const relativePath = path.relative(this.storagePath, filePath);
    const folderName = relativePath.split(path.sep)[0];
    const folderPath = path.join(this.storagePath, folderName);
    const workspacePath = this._getWorkspacePath(folderPath, folderName);

    try {
      const chatData = await this._queryDatabase(filePath);
      
      if (chatData) {
        return this._parseChatData(chatData, workspacePath, folderName);
      }
    } catch (e) {
      console.warn(`[AntigravityReader] Error handling file change ${filePath}:`, e.message);
    }

    return [];
  }
}

module.exports = { AntigravityReader, DEFAULT_ANTIGRAVITY_STORAGE_PATH, ANTIGRAVITY_CHAT_KEYS };

/**
 * Cursor Chat History Reader
 * 
 * Reads AI chat history from Cursor IDE's SQLite storage.
 * Cursor stores chat sessions in state.vscdb SQLite databases within workspace folders.
 * 
 * Storage location: ~/Library/Application Support/Cursor/User/workspaceStorage/
 * 
 * Structure:
 * - Each workspace has a folder with a hash-based name
 * - Each folder contains state.vscdb SQLite database
 * - Chat data is stored in ItemTable with specific keys:
 *   - 'aiService.prompts' - AI prompts/conversations
 *   - 'workbench.panel.aichat.view.aichat.chatdata' - Chat panel data
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ChatSession, ChatMessage } = require('../models');

/**
 * Default storage path for Cursor chat data
 */
const DEFAULT_CURSOR_STORAGE_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Cursor',
  'User',
  'workspaceStorage'
);

/**
 * Keys used to store chat data in Cursor's SQLite database
 */
const CURSOR_CHAT_KEYS = [
  'aiService.prompts',
  'workbench.panel.aichat.view.aichat.chatdata'
];

class CursorReader {
  /**
   * @param {Object} options - Reader options
   * @param {string} [options.storagePath] - Override default storage path (useful for testing)
   */
  constructor(options = {}) {
    this.name = 'cursor';
    this.storagePath = options.storagePath || DEFAULT_CURSOR_STORAGE_PATH;
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
        console.error('[CursorReader] Failed to load better-sqlite3:', e.message);
        throw new Error('better-sqlite3 is required for Cursor chat reading');
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

    // Check if storage directory exists
    if (!this.storageExists()) {
      console.warn(`[CursorReader] Storage directory not found: ${this.storagePath}`);
      return sessions;
    }

    try {
      // List all workspace folders
      const workspaceFolders = fs.readdirSync(this.storagePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      // Process each workspace folder
      for (const folderName of workspaceFolders) {
        try {
          const workspaceSessions = await this._scanWorkspaceFolder(folderName);
          sessions.push(...workspaceSessions);
        } catch (e) {
          console.warn(`[CursorReader] Error scanning workspace folder ${folderName}:`, e.message);
        }
      }
    } catch (e) {
      console.error(`[CursorReader] Error scanning storage directory:`, e.message);
    }

    return sessions;
  }

  /**
   * Scans a single workspace folder for sessions
   * @param {string} folderName - Workspace folder name (hash-based)
   * @returns {Promise<ChatSession[]>}
   * @private
   */
  async _scanWorkspaceFolder(folderName) {
    const sessions = [];
    const folderPath = path.join(this.storagePath, folderName);
    const dbPath = path.join(folderPath, 'state.vscdb');

    // Check if state.vscdb exists
    if (!fs.existsSync(dbPath)) {
      return sessions;
    }

    // Try to read workspace.json for workspace path
    const workspacePath = this._getWorkspacePath(folderPath, folderName);

    try {
      const chatData = await this._queryDatabase(dbPath);
      
      if (chatData) {
        const parsedSessions = this._parseChatData(chatData, workspacePath, folderName);
        sessions.push(...parsedSessions);
      }
    } catch (e) {
      // Handle locked or corrupted database
      if (e.code === 'SQLITE_BUSY' || e.message.includes('locked')) {
        console.warn(`[CursorReader] Database locked, skipping: ${dbPath}`);
      } else if (e.message.includes('corrupt') || e.message.includes('malformed')) {
        console.error(`[CursorReader] Database corrupted, skipping: ${dbPath}`);
      } else {
        console.warn(`[CursorReader] Error reading database ${dbPath}:`, e.message);
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
          // Remove file:// prefix if present
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
        prompts: null,
        chatData: null
      };

      // Query for each chat key
      for (const key of CURSOR_CHAT_KEYS) {
        try {
          const row = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key);
          if (row && row.value) {
            if (key === 'aiService.prompts') {
              result.prompts = row.value;
            } else {
              result.chatData = row.value;
            }
          }
        } catch (e) {
          // Key might not exist, continue
        }
      }

      return (result.prompts || result.chatData) ? result : null;
    } finally {
      if (db) {
        try {
          db.close();
        } catch (e) {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Parses chat data from Cursor format into ChatSessions
   * @param {Object} chatData - Raw chat data from database
   * @param {string} workspacePath - Workspace path
   * @param {string} folderName - Folder name for ID generation
   * @returns {ChatSession[]}
   * @private
   */
  _parseChatData(chatData, workspacePath, folderName) {
    const sessions = [];

    // Parse prompts data
    if (chatData.prompts) {
      try {
        const promptsSessions = this._parsePromptsData(chatData.prompts, workspacePath, folderName);
        sessions.push(...promptsSessions);
      } catch (e) {
        console.warn(`[CursorReader] Error parsing prompts data:`, e.message);
      }
    }

    // Parse chat panel data
    if (chatData.chatData) {
      try {
        const chatSessions = this._parseChatPanelData(chatData.chatData, workspacePath, folderName);
        sessions.push(...chatSessions);
      } catch (e) {
        console.warn(`[CursorReader] Error parsing chat panel data:`, e.message);
      }
    }

    return sessions;
  }

  /**
   * Parses aiService.prompts data
   * @param {string} promptsJson - JSON string of prompts data
   * @param {string} workspacePath - Workspace path
   * @param {string} folderName - Folder name
   * @returns {ChatSession[]}
   * @private
   */
  _parsePromptsData(promptsJson, workspacePath, folderName) {
    const sessions = [];
    
    try {
      const data = typeof promptsJson === 'string' ? JSON.parse(promptsJson) : promptsJson;
      
      // Handle array of conversations
      if (Array.isArray(data)) {
        data.forEach((conv, index) => {
          const session = this._parseConversation(conv, workspacePath, folderName, `prompts-${index}`);
          if (session) {
            sessions.push(session);
          }
        });
      } else if (data && typeof data === 'object') {
        // Handle object with conversations property
        const conversations = data.conversations || data.chats || [data];
        conversations.forEach((conv, index) => {
          const session = this._parseConversation(conv, workspacePath, folderName, `prompts-${index}`);
          if (session) {
            sessions.push(session);
          }
        });
      }
    } catch (e) {
      console.warn(`[CursorReader] Failed to parse prompts JSON:`, e.message);
    }

    return sessions;
  }

  /**
   * Parses workbench.panel.aichat.view.aichat.chatdata
   * @param {string} chatJson - JSON string of chat data
   * @param {string} workspacePath - Workspace path
   * @param {string} folderName - Folder name
   * @returns {ChatSession[]}
   * @private
   */
  _parseChatPanelData(chatJson, workspacePath, folderName) {
    const sessions = [];
    
    try {
      const data = typeof chatJson === 'string' ? JSON.parse(chatJson) : chatJson;
      
      // Handle various chat data structures
      if (Array.isArray(data)) {
        data.forEach((conv, index) => {
          const session = this._parseConversation(conv, workspacePath, folderName, `chat-${index}`);
          if (session) {
            sessions.push(session);
          }
        });
      } else if (data && typeof data === 'object') {
        // Handle tabs structure (Cursor uses tabs for multiple chats)
        if (data.tabs && Array.isArray(data.tabs)) {
          data.tabs.forEach((tab, index) => {
            const session = this._parseConversation(tab, workspacePath, folderName, `tab-${index}`);
            if (session) {
              sessions.push(session);
            }
          });
        } else {
          // Single conversation
          const session = this._parseConversation(data, workspacePath, folderName, 'chat-0');
          if (session) {
            sessions.push(session);
          }
        }
      }
    } catch (e) {
      console.warn(`[CursorReader] Failed to parse chat panel JSON:`, e.message);
    }

    return sessions;
  }

  /**
   * Parses a single conversation into a ChatSession
   * @param {Object} conv - Conversation data
   * @param {string} workspacePath - Workspace path
   * @param {string} folderName - Folder name
   * @param {string} idSuffix - Suffix for session ID
   * @returns {ChatSession|null}
   * @private
   */
  _parseConversation(conv, workspacePath, folderName, idSuffix) {
    if (!conv || typeof conv !== 'object') {
      return null;
    }

    // Extract messages from various possible structures
    const rawMessages = conv.messages || conv.history || conv.conversation || 
                        conv.bubbles || conv.turns || [];
    
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return null;
    }

    const messages = this._parseMessages(rawMessages);
    
    if (messages.length === 0) {
      return null;
    }

    // Generate session ID
    const sessionId = conv.id || conv.sessionId || conv.chatId || 
                      `${folderName}-${idSuffix}`;

    // Determine title
    const title = conv.title || conv.name || 
                  this._generateTitleFromMessages(messages) ||
                  'Untitled Cursor Chat';

    // Determine dates
    const dateCreated = this._parseDate(conv.createdAt || conv.timestamp || conv.date) || new Date();
    const lastActivity = messages.length > 0 
      ? messages[messages.length - 1].timestamp 
      : dateCreated;

    return new ChatSession({
      id: `cursor-${sessionId}`,
      title: title,
      sourceIDE: 'cursor',
      workspacePath: workspacePath,
      dateCreated: dateCreated,
      lastActivity: lastActivity,
      messageCount: messages.length,
      messages: messages
    });
  }

  /**
   * Parses message array from Cursor format
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
   * Parses a single message from Cursor format
   * @param {Object} msg - Raw message data
   * @param {number} index - Message index
   * @returns {ChatMessage|null}
   * @private
   */
  _parseMessage(msg, index) {
    if (!msg) return null;

    // Cursor messages may have different structures
    const role = this._normalizeRole(msg.role || msg.type || msg.sender);
    const content = this._extractContent(msg);

    // Role is required, but content can be empty string
    if (!role || content === null) {
      return null;
    }

    return new ChatMessage({
      id: msg.id || msg.messageId || `msg-${index}`,
      role: role,
      content: content,
      timestamp: this._parseDate(msg.timestamp || msg.createdAt || msg.date) || new Date(),
      metadata: {
        model: msg.model || msg.modelName,
        toolCalls: msg.toolCalls || msg.tool_calls || msg.functionCalls
      }
    });
  }

  /**
   * Normalizes role string to standard format
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
        normalized === 'cursor' || normalized === 'model') {
      return 'assistant';
    }
    if (normalized === 'system') {
      return 'system';
    }
    
    return null;
  }

  /**
   * Extracts content from message object, preserving code blocks
   * @param {Object} msg - Raw message object
   * @returns {string|null}
   * @private
   */
  _extractContent(msg) {
    // Try various content field names
    let content = msg.content !== undefined && msg.content !== null ? msg.content :
                  msg.text !== undefined && msg.text !== null ? msg.text :
                  msg.message !== undefined && msg.message !== null ? msg.message :
                  msg.body !== undefined && msg.body !== null ? msg.body :
                  undefined;

    // Handle array content (some formats use arrays of content blocks)
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

    // Ensure content is a string (empty string is valid)
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
      // Handle Unix timestamps (seconds or milliseconds)
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

    // Take first 50 characters of first user message
    const content = firstUserMessage.content.trim();
    if (content.length <= 50) {
      return content;
    }
    return content.slice(0, 47) + '...';
  }

  /**
   * Reads a specific session by ID
   * @param {string} sessionId - Session ID (with or without 'cursor-' prefix)
   * @returns {Promise<ChatSession|null>}
   */
  async readSession(sessionId) {
    // Remove 'cursor-' prefix if present
    const rawSessionId = sessionId.startsWith('cursor-') 
      ? sessionId.slice(7) 
      : sessionId;

    if (!this.storageExists()) {
      console.warn(`[CursorReader] Storage directory not found: ${this.storagePath}`);
      return null;
    }

    try {
      // Search through all workspace folders
      const workspaceFolders = fs.readdirSync(this.storagePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folderName of workspaceFolders) {
        const folderPath = path.join(this.storagePath, folderName);
        const dbPath = path.join(folderPath, 'state.vscdb');

        if (!fs.existsSync(dbPath)) {
          continue;
        }

        const workspacePath = this._getWorkspacePath(folderPath, folderName);

        try {
          const chatData = await this._queryDatabase(dbPath);
          
          if (chatData) {
            const sessions = this._parseChatData(chatData, workspacePath, folderName);
            const session = sessions.find(s => 
              s.id === sessionId || 
              s.id === `cursor-${rawSessionId}` ||
              s.id.includes(rawSessionId)
            );
            
            if (session) {
              return session;
            }
          }
        } catch (e) {
          // Continue searching
        }
      }
    } catch (e) {
      console.error(`[CursorReader] Error reading session ${sessionId}:`, e.message);
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
    // Only handle state.vscdb files in our storage path
    if (!filePath.startsWith(this.storagePath) || !filePath.endsWith('state.vscdb')) {
      return [];
    }

    // Extract folder name from path
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
      console.warn(`[CursorReader] Error handling file change ${filePath}:`, e.message);
    }

    return [];
  }
}

module.exports = { CursorReader, DEFAULT_CURSOR_STORAGE_PATH, CURSOR_CHAT_KEYS };

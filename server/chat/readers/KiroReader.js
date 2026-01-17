/**
 * Kiro Chat History Reader
 * 
 * Reads AI chat history from Kiro IDE's storage location.
 * Kiro stores chat sessions as JSON files in workspace-specific folders.
 * 
 * Storage location: ~/Library/Application Support/Kiro/User/globalStorage/kiro.kiroagent/workspace-sessions/
 * 
 * Structure:
 * - Each workspace has a folder named with base64-encoded workspace path
 * - Each folder contains sessions.json with session metadata
 * - Individual session files contain the full conversation history
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ChatSession, ChatMessage } = require('../models');
const { safeDecodeWorkspacePath } = require('../utils');

/**
 * Default storage path for Kiro chat data
 */
const DEFAULT_KIRO_STORAGE_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Kiro',
  'User',
  'globalStorage',
  'kiro.kiroagent',
  'workspace-sessions'
);

class KiroReader {
  /**
   * @param {Object} options - Reader options
   * @param {string} [options.storagePath] - Override default storage path (useful for testing)
   */
  constructor(options = {}) {
    this.name = 'kiro';
    this.storagePath = options.storagePath || DEFAULT_KIRO_STORAGE_PATH;
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
      console.warn(`[KiroReader] Storage directory not found: ${this.storagePath}`);
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
          console.warn(`[KiroReader] Error scanning workspace folder ${folderName}:`, e.message);
        }
      }
    } catch (e) {
      console.error(`[KiroReader] Error scanning storage directory:`, e.message);
    }

    return sessions;
  }

  /**
   * Scans a single workspace folder for sessions
   * @param {string} folderName - Base64-encoded workspace folder name
   * @returns {Promise<ChatSession[]>}
   * @private
   */
  async _scanWorkspaceFolder(folderName) {
    const sessions = [];
    const folderPath = path.join(this.storagePath, folderName);

    // Decode workspace path from folder name
    const workspacePath = safeDecodeWorkspacePath(folderName) || folderName;

    // Look for sessions.json
    const sessionsFilePath = path.join(folderPath, 'sessions.json');
    if (!fs.existsSync(sessionsFilePath)) {
      // No sessions.json, try to find individual session files
      return this._scanSessionFiles(folderPath, workspacePath);
    }

    try {
      const sessionsData = JSON.parse(fs.readFileSync(sessionsFilePath, 'utf-8'));
      
      // sessions.json may contain an array of session metadata
      const sessionList = Array.isArray(sessionsData) ? sessionsData : 
                          sessionsData.sessions ? sessionsData.sessions : [];

      for (const sessionMeta of sessionList) {
        try {
          const session = this._createSessionFromMeta(sessionMeta, workspacePath, folderPath);
          if (session) {
            sessions.push(session);
          }
        } catch (e) {
          console.warn(`[KiroReader] Error parsing session metadata:`, e.message);
        }
      }
    } catch (e) {
      console.warn(`[KiroReader] Error reading sessions.json:`, e.message);
      // Fall back to scanning individual files
      return this._scanSessionFiles(folderPath, workspacePath);
    }

    return sessions;
  }

  /**
   * Scans for individual session JSON files in a folder
   * @param {string} folderPath - Path to workspace folder
   * @param {string} workspacePath - Decoded workspace path
   * @returns {Promise<ChatSession[]>}
   * @private
   */
  async _scanSessionFiles(folderPath, workspacePath) {
    const sessions = [];

    try {
      const files = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.json') && f !== 'sessions.json');

      for (const file of files) {
        try {
          const filePath = path.join(folderPath, file);
          const session = await this._readSessionFile(filePath, workspacePath);
          if (session) {
            sessions.push(session);
          }
        } catch (e) {
          console.warn(`[KiroReader] Error reading session file ${file}:`, e.message);
        }
      }
    } catch (e) {
      console.warn(`[KiroReader] Error scanning session files:`, e.message);
    }

    return sessions;
  }

  /**
   * Creates a ChatSession from session metadata
   * @param {Object} meta - Session metadata from sessions.json
   * @param {string} workspacePath - Workspace path
   * @param {string} folderPath - Path to workspace folder
   * @returns {ChatSession|null}
   * @private
   */
  _createSessionFromMeta(meta, workspacePath, folderPath) {
    if (!meta || !meta.sessionId) {
      return null;
    }

    // Parse dates - Kiro stores timestamps as strings
    const dateCreated = this._parseDate(meta.dateCreated || meta.createdAt);
    const lastActivity = this._parseDate(meta.lastActivity || meta.updatedAt || meta.dateCreated);

    return new ChatSession({
      id: `kiro-${meta.sessionId}`,
      title: meta.title || meta.name || 'Untitled Session',
      sourceIDE: 'kiro',
      workspacePath: workspacePath,
      dateCreated: dateCreated,
      lastActivity: lastActivity,
      messageCount: meta.messageCount || 0,
      messages: [] // Messages loaded on demand via readSession()
    });
  }

  /**
   * Parses a date value that may be a string timestamp, number, or Date
   * @param {string|number|Date} value - Date value to parse
   * @returns {Date}
   * @private
   */
  _parseDate(value) {
    if (!value) return new Date();
    
    // If it's already a Date
    if (value instanceof Date) return value;
    
    // If it's a string that looks like a timestamp (all digits)
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return new Date(parseInt(value, 10));
    }
    
    // If it's a number (timestamp)
    if (typeof value === 'number') {
      return new Date(value);
    }
    
    // Try parsing as ISO string or other date format
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /**
   * Reads a specific session by ID
   * @param {string} sessionId - Session ID (with or without 'kiro-' prefix)
   * @returns {Promise<ChatSession|null>}
   */
  async readSession(sessionId) {
    // Remove 'kiro-' prefix if present
    const rawSessionId = sessionId.startsWith('kiro-') 
      ? sessionId.slice(5) 
      : sessionId;

    if (!this.storageExists()) {
      console.warn(`[KiroReader] Storage directory not found: ${this.storagePath}`);
      return null;
    }

    try {
      // Search through all workspace folders
      const workspaceFolders = fs.readdirSync(this.storagePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folderName of workspaceFolders) {
        const folderPath = path.join(this.storagePath, folderName);
        const workspacePath = safeDecodeWorkspacePath(folderName) || folderName;

        // Try to find session file directly
        const sessionFilePath = path.join(folderPath, `${rawSessionId}.json`);
        if (fs.existsSync(sessionFilePath)) {
          return this._readSessionFile(sessionFilePath, workspacePath);
        }

        // Check sessions.json for session location
        const sessionsFilePath = path.join(folderPath, 'sessions.json');
        if (fs.existsSync(sessionsFilePath)) {
          try {
            const sessionsData = JSON.parse(fs.readFileSync(sessionsFilePath, 'utf-8'));
            const sessionList = Array.isArray(sessionsData) ? sessionsData : 
                                sessionsData.sessions ? sessionsData.sessions : [];
            
            const sessionMeta = sessionList.find(s => s.sessionId === rawSessionId);
            if (sessionMeta) {
              // Try to find the session file
              const possiblePaths = [
                path.join(folderPath, `${rawSessionId}.json`),
                path.join(folderPath, sessionMeta.fileName || `${rawSessionId}.json`)
              ];

              for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                  return this._readSessionFile(possiblePath, workspacePath);
                }
              }
            }
          } catch (e) {
            // Continue searching
          }
        }
      }
    } catch (e) {
      console.error(`[KiroReader] Error reading session ${sessionId}:`, e.message);
    }

    return null;
  }

  /**
   * Reads and parses a session JSON file
   * @param {string} filePath - Path to session file
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<ChatSession|null>}
   * @private
   */
  async _readSessionFile(filePath, workspacePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      return this._parseSessionData(data, workspacePath, filePath);
    } catch (e) {
      console.warn(`[KiroReader] Error reading session file ${filePath}:`, e.message);
      return null;
    }
  }

  /**
   * Parses session data from JSON into a ChatSession
   * @param {Object} data - Raw session data
   * @param {string} workspacePath - Workspace path
   * @param {string} filePath - Source file path (for ID generation)
   * @returns {ChatSession}
   * @private
   */
  _parseSessionData(data, workspacePath, filePath) {
    // Extract session ID from data or filename
    const sessionId = data.sessionId || data.id || 
                      path.basename(filePath, '.json');

    // Extract messages from history array
    const messages = this._parseMessages(data.history || data.messages || []);

    // Determine title
    const title = data.title || data.name || 
                  this._generateTitleFromMessages(messages) ||
                  'Untitled Session';

    // Determine dates using the date parser
    const dateCreated = this._parseDate(data.dateCreated || data.createdAt || data.timestamp);
    const lastActivity = messages.length > 0 
      ? messages[messages.length - 1].timestamp 
      : dateCreated;

    return new ChatSession({
      id: `kiro-${sessionId}`,
      title: title,
      sourceIDE: 'kiro',
      workspacePath: workspacePath,
      dateCreated: dateCreated,
      lastActivity: lastActivity,
      messageCount: messages.length,
      messages: messages
    });
  }

  /**
   * Parses message array from Kiro format
   * @param {Array} history - Raw message history
   * @returns {ChatMessage[]}
   * @private
   */
  _parseMessages(history) {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .map((item, index) => {
        // Kiro format: history items may have nested 'message' object
        const msg = item.message || item;
        return this._parseMessage(msg, index);
      })
      .filter(msg => msg !== null);
  }

  /**
   * Parses a single message from Kiro format
   * @param {Object} msg - Raw message data
   * @param {number} index - Message index (for ID generation)
   * @returns {ChatMessage|null}
   * @private
   */
  _parseMessage(msg, index) {
    if (!msg) return null;

    // Kiro messages may have different structures
    // Common fields: role, content, text, message
    const role = this._normalizeRole(msg.role || msg.type);
    const content = this._extractContent(msg);

    // Role is required, but content can be empty string
    if (!role || content === null) {
      return null;
    }

    return new ChatMessage({
      id: msg.id || `msg-${index}`,
      role: role,
      content: content,
      timestamp: msg.timestamp || msg.createdAt || new Date(),
      metadata: {
        model: msg.model,
        toolCalls: msg.toolCalls || msg.tool_calls
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
    
    const normalized = role.toLowerCase();
    
    if (normalized === 'user' || normalized === 'human') {
      return 'user';
    }
    if (normalized === 'assistant' || normalized === 'ai' || normalized === 'bot') {
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
    // Try various content field names (check for undefined/null, not falsy)
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
          if (block.type === 'text') return block.text;
          if (block.type === 'code') {
            const lang = block.language || '';
            // Use code field if defined (even if empty), otherwise fall back to text
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
   * Returns paths to watch for file changes
   * @returns {string[]}
   */
  getWatchPaths() {
    if (!this.storageExists()) {
      return [];
    }
    
    return [
      path.join(this.storagePath, '**', '*.json')
    ];
  }

  /**
   * Handles file change event
   * @param {string} filePath - Path to changed file
   * @returns {Promise<ChatSession|null>}
   */
  async onFileChange(filePath) {
    // Ignore sessions.json changes (metadata only)
    if (path.basename(filePath) === 'sessions.json') {
      return null;
    }

    // Only handle JSON files in our storage path
    if (!filePath.startsWith(this.storagePath) || !filePath.endsWith('.json')) {
      return null;
    }

    // Extract workspace path from folder structure
    const relativePath = path.relative(this.storagePath, filePath);
    const folderName = relativePath.split(path.sep)[0];
    const workspacePath = safeDecodeWorkspacePath(folderName) || folderName;

    return this._readSessionFile(filePath, workspacePath);
  }
}

module.exports = { KiroReader, DEFAULT_KIRO_STORAGE_PATH };

/**
 * Chat Data Models for TerminalWON AI Chat Integration
 * 
 * These models represent chat sessions and messages from various AI-powered IDEs
 * (Kiro, Cursor, etc.) and provide validation and serialization helpers.
 */

/**
 * Validates that a value is a non-empty string
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {boolean}
 */
function isNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  return true;
}

/**
 * Validates that a value is a valid Date or ISO date string
 * @param {*} value - Value to validate
 * @returns {boolean}
 */
function isValidDate(value) {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

/**
 * ChatMessage represents an individual message within a chat session
 */
class ChatMessage {
  /**
   * @param {Object} data - Message data
   * @param {string} data.id - Unique message identifier
   * @param {string} data.role - Message role ('user' | 'assistant' | 'system')
   * @param {string} data.content - Message content (may include markdown/code)
   * @param {Date|string} data.timestamp - When message was sent
   * @param {Object} [data.metadata] - Optional metadata
   */
  constructor(data) {
    this.id = data.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.role = data.role;
    this.content = data.content;
    this.timestamp = data.timestamp instanceof Date 
      ? data.timestamp 
      : new Date(data.timestamp || Date.now());
    this.metadata = data.metadata || {};
  }

  /**
   * Validates that the message has all required fields
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    const errors = [];
    
    if (!isNonEmptyString(this.role, 'role')) {
      errors.push('role is required and must be a non-empty string');
    } else if (!['user', 'assistant', 'system'].includes(this.role)) {
      errors.push('role must be one of: user, assistant, system');
    }
    
    if (typeof this.content !== 'string') {
      errors.push('content is required and must be a string');
    }
    
    if (!isValidDate(this.timestamp)) {
      errors.push('timestamp must be a valid date');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Serializes the message for WebSocket transmission
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      timestamp: this.timestamp instanceof Date 
        ? this.timestamp.toISOString() 
        : this.timestamp,
      metadata: this.metadata
    };
  }

  /**
   * Creates a ChatMessage from a plain object
   * @param {Object} obj - Plain object
   * @returns {ChatMessage}
   */
  static fromJSON(obj) {
    return new ChatMessage({
      id: obj.id,
      role: obj.role,
      content: obj.content,
      timestamp: obj.timestamp,
      metadata: obj.metadata
    });
  }
}

/**
 * ChatSession represents a single conversation thread between a user and an AI assistant
 */
class ChatSession {
  /**
   * @param {Object} data - Session data
   * @param {string} data.id - Unique session identifier
   * @param {string} data.title - Session title or first message preview
   * @param {string} data.sourceIDE - Source IDE ('kiro' | 'cursor' | etc.)
   * @param {string} data.workspacePath - Path to the workspace
   * @param {string} [data.workspaceName] - Friendly name of workspace
   * @param {Date|string} data.dateCreated - When session was created
   * @param {Date|string} [data.lastActivity] - Last message timestamp
   * @param {number} [data.messageCount] - Total messages in session
   * @param {ChatMessage[]} [data.messages] - Full message history
   */
  constructor(data) {
    this.id = data.id || `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.title = data.title || 'Untitled Session';
    this.sourceIDE = data.sourceIDE;
    this.workspacePath = data.workspacePath || '';
    this.workspaceName = data.workspaceName || this._extractWorkspaceName(this.workspacePath);
    this.dateCreated = data.dateCreated instanceof Date 
      ? data.dateCreated 
      : new Date(data.dateCreated || Date.now());
    this.lastActivity = data.lastActivity instanceof Date 
      ? data.lastActivity 
      : new Date(data.lastActivity || this.dateCreated);
    this.messageCount = data.messageCount || (data.messages ? data.messages.length : 0);
    this.messages = (data.messages || []).map(msg => 
      msg instanceof ChatMessage ? msg : new ChatMessage(msg)
    );
  }

  /**
   * Extracts workspace name from path
   * @param {string} path - Workspace path
   * @returns {string}
   */
  _extractWorkspaceName(path) {
    if (!path) return 'Unknown Workspace';
    const parts = path.split('/').filter(p => p.length > 0);
    return parts[parts.length - 1] || 'Unknown Workspace';
  }

  /**
   * Validates that the session has all required fields
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    const errors = [];
    
    if (!isNonEmptyString(this.id, 'id')) {
      errors.push('id is required and must be a non-empty string');
    }
    
    if (!isNonEmptyString(this.sourceIDE, 'sourceIDE')) {
      errors.push('sourceIDE is required and must be a non-empty string');
    }
    
    if (!isValidDate(this.dateCreated)) {
      errors.push('dateCreated must be a valid date');
    }
    
    // Validate all messages if present
    this.messages.forEach((msg, index) => {
      const msgValidation = msg.validate();
      if (!msgValidation.valid) {
        errors.push(`messages[${index}]: ${msgValidation.errors.join(', ')}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Serializes the session for WebSocket transmission (list view - no messages)
   * @returns {Object}
   */
  toListJSON() {
    return {
      id: this.id,
      title: this.title,
      sourceIDE: this.sourceIDE,
      workspacePath: this.workspacePath,
      workspaceName: this.workspaceName,
      dateCreated: this.dateCreated instanceof Date 
        ? this.dateCreated.toISOString() 
        : this.dateCreated,
      lastActivity: this.lastActivity instanceof Date 
        ? this.lastActivity.toISOString() 
        : this.lastActivity,
      messageCount: this.messageCount
    };
  }

  /**
   * Serializes the session for WebSocket transmission (detail view - with messages)
   * @returns {Object}
   */
  toJSON() {
    return {
      ...this.toListJSON(),
      messages: this.messages.map(msg => msg.toJSON())
    };
  }

  /**
   * Creates a ChatSession from a plain object
   * @param {Object} obj - Plain object
   * @returns {ChatSession}
   */
  static fromJSON(obj) {
    return new ChatSession({
      id: obj.id,
      title: obj.title,
      sourceIDE: obj.sourceIDE,
      workspacePath: obj.workspacePath,
      workspaceName: obj.workspaceName,
      dateCreated: obj.dateCreated,
      lastActivity: obj.lastActivity,
      messageCount: obj.messageCount,
      messages: (obj.messages || []).map(msg => ChatMessage.fromJSON(msg))
    });
  }

  /**
   * Adds a message to the session
   * @param {ChatMessage|Object} message - Message to add
   */
  addMessage(message) {
    const msg = message instanceof ChatMessage ? message : new ChatMessage(message);
    this.messages.push(msg);
    this.messageCount = this.messages.length;
    this.lastActivity = msg.timestamp;
  }
}

module.exports = {
  ChatMessage,
  ChatSession,
  isNonEmptyString,
  isValidDate
};

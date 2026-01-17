/**
 * Authentication Manager
 * 
 * Handles user authentication for the cloud version of TerminalWON.
 * Supports API keys and JWT tokens.
 */

const crypto = require('crypto');

class AuthManager {
  constructor(options = {}) {
    this.secretKey = options.secretKey || process.env.AUTH_SECRET || this.generateSecret();
    this.apiKeys = new Map(); // apiKey -> userId
    this.sessions = new Map(); // sessionId -> { userId, expiresAt }
    this.users = new Map(); // userId -> { email, apiKeys, createdAt }
    
    // Token expiration (24 hours by default)
    this.tokenExpiration = options.tokenExpiration || 24 * 60 * 60 * 1000;
  }

  /**
   * Generate a random secret key
   */
  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate an API key for a user
   */
  generateApiKey(userId) {
    const apiKey = `twon_${crypto.randomBytes(24).toString('hex')}`;
    this.apiKeys.set(apiKey, userId);
    
    // Add to user's API keys
    const user = this.users.get(userId);
    if (user) {
      user.apiKeys = user.apiKeys || [];
      user.apiKeys.push(apiKey);
    }
    
    return apiKey;
  }

  /**
   * Validate an API key
   */
  validateApiKey(apiKey) {
    if (!apiKey) return null;
    
    // For open source / local mode, accept any key
    if (process.env.AUTH_MODE === 'local' || !process.env.AUTH_MODE) {
      return { userId: 'local-user', mode: 'local' };
    }
    
    const userId = this.apiKeys.get(apiKey);
    if (!userId) return null;
    
    return { userId, mode: 'cloud' };
  }

  /**
   * Create a session token (JWT-like)
   */
  createSessionToken(userId) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + this.tokenExpiration;
    
    const payload = {
      sessionId,
      userId,
      expiresAt
    };
    
    // Simple HMAC signature
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    this.sessions.set(sessionId, { userId, expiresAt });
    
    // Return base64 encoded token
    const token = Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64');
    return token;
  }

  /**
   * Validate a session token
   */
  validateSessionToken(token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const { sessionId, userId, expiresAt, signature } = decoded;
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(JSON.stringify({ sessionId, userId, expiresAt }))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return null;
      }
      
      // Check expiration
      if (Date.now() > expiresAt) {
        this.sessions.delete(sessionId);
        return null;
      }
      
      // Verify session exists
      const session = this.sessions.get(sessionId);
      if (!session || session.userId !== userId) {
        return null;
      }
      
      return { userId, sessionId };
    } catch (e) {
      return null;
    }
  }

  /**
   * Revoke a session
   */
  revokeSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Revoke an API key
   */
  revokeApiKey(apiKey) {
    const userId = this.apiKeys.get(apiKey);
    if (userId) {
      this.apiKeys.delete(apiKey);
      
      // Remove from user's API keys
      const user = this.users.get(userId);
      if (user && user.apiKeys) {
        user.apiKeys = user.apiKeys.filter(k => k !== apiKey);
      }
    }
  }

  /**
   * Create a user (for cloud mode)
   */
  createUser(email) {
    const userId = crypto.randomBytes(8).toString('hex');
    
    this.users.set(userId, {
      email,
      apiKeys: [],
      createdAt: new Date()
    });
    
    return userId;
  }

  /**
   * Get user by ID
   */
  getUser(userId) {
    return this.users.get(userId);
  }

  /**
   * Authenticate a WebSocket connection
   */
  authenticateWebSocket(message) {
    const { apiKey, token, tool } = message.payload || {};
    
    // Try API key first
    if (apiKey) {
      const result = this.validateApiKey(apiKey);
      if (result) {
        return { ...result, tool };
      }
    }
    
    // Try session token
    if (token) {
      const result = this.validateSessionToken(token);
      if (result) {
        return { ...result, tool };
      }
    }
    
    // For local mode, allow anonymous connections
    if (process.env.AUTH_MODE === 'local' || !process.env.AUTH_MODE) {
      return { userId: 'anonymous', mode: 'local', tool };
    }
    
    return null;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Singleton instance
let instance = null;

function getAuthManager(options) {
  if (!instance) {
    instance = new AuthManager(options);
  }
  return instance;
}

module.exports = { AuthManager, getAuthManager };

/**
 * Utility functions for TerminalWON AI Chat Integration
 */

/**
 * Encodes a workspace path to base64 for use as a folder name.
 * Handles special characters and unicode properly.
 * 
 * @param {string} workspacePath - The workspace path to encode
 * @returns {string} Base64-encoded path (URL-safe variant)
 */
function encodeWorkspacePath(workspacePath) {
  if (typeof workspacePath !== 'string') {
    throw new Error('workspacePath must be a string');
  }
  
  // Convert to UTF-8 bytes and then to base64
  const utf8Bytes = Buffer.from(workspacePath, 'utf-8');
  const base64 = utf8Bytes.toString('base64');
  
  // Make URL-safe by replacing + with - and / with _
  // Also remove padding = characters for cleaner folder names
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a base64-encoded workspace path back to the original path.
 * Handles URL-safe base64 variant and missing padding.
 * 
 * @param {string} encodedPath - The base64-encoded path
 * @returns {string} Original workspace path
 */
function decodeWorkspacePath(encodedPath) {
  if (typeof encodedPath !== 'string') {
    throw new Error('encodedPath must be a string');
  }
  
  // Restore standard base64 characters
  let base64 = encodedPath
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if needed (base64 strings should be divisible by 4)
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(paddingNeeded);
  
  // Decode from base64 to UTF-8 string
  const utf8Bytes = Buffer.from(base64, 'base64');
  return utf8Bytes.toString('utf-8');
}

/**
 * Safely decodes a workspace path, returning null if decoding fails.
 * Useful when processing folder names that may or may not be encoded.
 * 
 * @param {string} encodedPath - The potentially base64-encoded path
 * @returns {string|null} Original workspace path or null if decoding fails
 */
function safeDecodeWorkspacePath(encodedPath) {
  try {
    const decoded = decodeWorkspacePath(encodedPath);
    // Basic sanity check - decoded path should look like a path
    if (decoded && (decoded.startsWith('/') || decoded.includes('/'))) {
      return decoded;
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  encodeWorkspacePath,
  decodeWorkspacePath,
  safeDecodeWorkspacePath
};

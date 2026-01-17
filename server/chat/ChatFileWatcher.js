/**
 * Chat File Watcher for TerminalWON AI Chat Integration
 * 
 * Monitors file system changes in IDE chat storage directories
 * and triggers session re-reading when changes are detected.
 * 
 * Uses chokidar for efficient file system monitoring with debouncing
 * to handle rapid file changes.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

const path = require('path');
const EventEmitter = require('events');

// Lazy load chokidar to handle ESM module
let chokidar = null;
async function getChokidar() {
  if (!chokidar) {
    chokidar = await import('chokidar');
    chokidar = chokidar.default || chokidar;
  }
  return chokidar;
}

/**
 * Default configuration for file watching
 */
const DEFAULT_CONFIG = {
  // Debounce delay in milliseconds (wait for file writes to stabilize)
  debounceDelay: 500,
  // Polling interval for systems without native file watching
  pollInterval: 100,
  // Stability threshold - wait this long after last change before processing
  stabilityThreshold: 500,
  // Whether to use polling (more reliable but higher CPU)
  usePolling: false,
  // Ignore initial scan events
  ignoreInitial: true,
  // Persist watcher even if watched paths don't exist
  persistent: true
};

class ChatFileWatcher extends EventEmitter {
  /**
   * @param {Object} options - Watcher options
   * @param {number} [options.debounceDelay=500] - Debounce delay in ms
   * @param {number} [options.pollInterval=100] - Poll interval in ms
   * @param {number} [options.stabilityThreshold=500] - Stability threshold in ms
   * @param {boolean} [options.usePolling=false] - Use polling instead of native events
   * @param {boolean} [options.ignoreInitial=true] - Ignore initial scan events
   * @param {boolean} [options.persistent=true] - Keep process running while watching
   */
  constructor(options = {}) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...options };
    
    /** @type {chokidar.FSWatcher|null} */
    this.watcher = null;
    
    /** @type {Map<string, Object>} Path pattern -> Reader instance */
    this.pathToReader = new Map();
    
    /** @type {Map<string, NodeJS.Timeout>} File path -> debounce timer */
    this.debounceTimers = new Map();
    
    /** @type {Set<string>} Paths currently being watched */
    this.watchedPaths = new Set();
    
    /** @type {boolean} Whether the watcher is running */
    this.isRunning = false;
    
    /** @type {Function|null} Callback for session updates */
    this.onSessionUpdate = null;
  }

  /**
   * Starts watching the specified paths
   * @param {string[]} watchPaths - Glob patterns to watch
   * @param {Map<string, Object>} readers - Map of reader name to reader instance
   * @returns {Promise<void>}
   */
  async start(watchPaths, readers) {
    if (this.isRunning) {
      console.warn('[ChatFileWatcher] Watcher already running');
      return;
    }

    if (!watchPaths || watchPaths.length === 0) {
      console.warn('[ChatFileWatcher] No paths to watch');
      return;
    }

    // Build path to reader mapping
    this._buildPathToReaderMap(watchPaths, readers);

    // Configure chokidar options
    const chokidarOptions = {
      persistent: this.config.persistent,
      ignoreInitial: this.config.ignoreInitial,
      usePolling: this.config.usePolling,
      interval: this.config.pollInterval,
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold,
        pollInterval: this.config.pollInterval
      },
      // Ignore common non-chat files
      ignored: [
        /(^|[\/\\])\../, // dotfiles
        /node_modules/,
        /\.git/,
        /\.DS_Store/
      ]
    };

    try {
      const chokidarModule = await getChokidar();
      this.watcher = chokidarModule.watch(watchPaths, chokidarOptions);

      // Set up event handlers
      this.watcher.on('change', (filePath) => this._handleFileChange(filePath, 'change'));
      this.watcher.on('add', (filePath) => this._handleFileChange(filePath, 'add'));
      this.watcher.on('error', (error) => this._handleError(error));
      this.watcher.on('ready', () => this._handleReady());

      // Track watched paths
      watchPaths.forEach(p => this.watchedPaths.add(p));
      
      this.isRunning = true;
      
      console.log(`[ChatFileWatcher] Started watching ${watchPaths.length} path patterns`);
    } catch (e) {
      console.error('[ChatFileWatcher] Failed to start watcher:', e.message);
      throw e;
    }
  }

  /**
   * Builds mapping from path patterns to readers
   * @param {string[]} watchPaths - Watch paths
   * @param {Map<string, Object>} readers - Reader instances
   * @private
   */
  _buildPathToReaderMap(watchPaths, readers) {
    this.pathToReader.clear();
    
    if (!readers) return;

    for (const [name, reader] of readers) {
      if (typeof reader.getWatchPaths === 'function') {
        const readerPaths = reader.getWatchPaths();
        for (const watchPath of readerPaths) {
          this.pathToReader.set(watchPath, reader);
        }
      }
    }
  }

  /**
   * Handles file change events with debouncing
   * @param {string} filePath - Path to changed file
   * @param {string} eventType - Type of event ('change' or 'add')
   * @private
   */
  _handleFileChange(filePath, eventType) {
    // Clear existing debounce timer for this file
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this._processFileChange(filePath, eventType);
    }, this.config.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Processes a file change after debouncing
   * @param {string} filePath - Path to changed file
   * @param {string} eventType - Type of event
   * @private
   */
  async _processFileChange(filePath, eventType) {
    console.log(`[ChatFileWatcher] File ${eventType}: ${filePath}`);

    // Find the appropriate reader for this file
    const reader = this._findReaderForPath(filePath);
    
    if (!reader) {
      console.warn(`[ChatFileWatcher] No reader found for path: ${filePath}`);
      return;
    }

    try {
      // Call the reader's onFileChange method
      if (typeof reader.onFileChange === 'function') {
        const result = await reader.onFileChange(filePath);
        
        if (result) {
          // Emit event for session update
          this.emit('sessionUpdate', {
            filePath,
            eventType,
            reader: reader.name,
            session: result
          });

          // Call callback if set
          if (this.onSessionUpdate) {
            this.onSessionUpdate(result, reader.name);
          }
        }
      }
    } catch (e) {
      console.error(`[ChatFileWatcher] Error processing file change:`, e.message);
      this.emit('error', e);
    }
  }

  /**
   * Finds the appropriate reader for a file path
   * @param {string} filePath - File path to match
   * @returns {Object|null} Reader instance or null
   * @private
   */
  _findReaderForPath(filePath) {
    // Check each reader's storage path
    for (const [watchPattern, reader] of this.pathToReader) {
      // Extract base path from glob pattern
      const basePath = watchPattern.split('**')[0].replace(/[\/\\]$/, '');
      
      if (filePath.startsWith(basePath)) {
        return reader;
      }
    }
    
    return null;
  }

  /**
   * Handles watcher ready event
   * @private
   */
  _handleReady() {
    console.log('[ChatFileWatcher] Initial scan complete, watching for changes');
    this.emit('ready');
  }

  /**
   * Handles watcher errors
   * @param {Error} error - Error object
   * @private
   */
  _handleError(error) {
    console.error('[ChatFileWatcher] Watcher error:', error.message);
    this.emit('error', error);
  }

  /**
   * Stops the file watcher
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close the watcher
    if (this.watcher) {
      try {
        await this.watcher.close();
      } catch (e) {
        console.warn('[ChatFileWatcher] Error closing watcher:', e.message);
      }
      this.watcher = null;
    }

    this.watchedPaths.clear();
    this.pathToReader.clear();
    this.isRunning = false;

    console.log('[ChatFileWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * Adds additional paths to watch
   * @param {string[]} paths - New paths to watch
   * @param {Object} reader - Reader for these paths
   */
  addPaths(paths, reader) {
    if (!this.watcher || !this.isRunning) {
      console.warn('[ChatFileWatcher] Cannot add paths - watcher not running');
      return;
    }

    for (const watchPath of paths) {
      if (!this.watchedPaths.has(watchPath)) {
        this.watcher.add(watchPath);
        this.watchedPaths.add(watchPath);
        this.pathToReader.set(watchPath, reader);
      }
    }
  }

  /**
   * Removes paths from watching
   * @param {string[]} paths - Paths to stop watching
   */
  removePaths(paths) {
    if (!this.watcher || !this.isRunning) {
      return;
    }

    for (const watchPath of paths) {
      if (this.watchedPaths.has(watchPath)) {
        this.watcher.unwatch(watchPath);
        this.watchedPaths.delete(watchPath);
        this.pathToReader.delete(watchPath);
      }
    }
  }

  /**
   * Sets the callback for session updates
   * @param {Function} callback - Callback function(session, readerName)
   */
  setSessionUpdateCallback(callback) {
    this.onSessionUpdate = callback;
  }

  /**
   * Gets the current status of the watcher
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      watchedPathCount: this.watchedPaths.size,
      watchedPaths: Array.from(this.watchedPaths),
      pendingDebounces: this.debounceTimers.size
    };
  }

  /**
   * Checks if the watcher is currently running
   * @returns {boolean}
   */
  isWatching() {
    return this.isRunning;
  }
}

module.exports = { ChatFileWatcher, DEFAULT_CONFIG };

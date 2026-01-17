// TerminalWON Mobile App Configuration

// Get the local IP address for development
// In production, this would be your actual hub server URL
const getLocalIP = () => {
  // For development, you'll need to replace this with your computer's IP address
  // You can find it by running: ifconfig | grep "inet " | grep -v 127.0.0.1
  // Or on Windows: ipconfig
  
  // Default to localhost for simulator/emulator
  if (__DEV__) {
    // Replace this IP with your computer's actual IP address on your WiFi network
    // Example: return 'ws://192.168.1.100:3001';
    return 'ws://localhost:3002';
  }
  
  // Production hub URL
  return 'wss://hub.terminalwon.com';
};

export const config = {
  // Hub server configuration
  hubUrl: getLocalIP(),
  apiKey: 'test-key-123',
  
  // Connection settings
  reconnectInterval: 5000, // 5 seconds
  connectionTimeout: 10000, // 10 seconds
  
  // App settings
  maxTerminalOutputLines: 1000,
  refreshInterval: 2000, // 2 seconds
  
  // Development settings
  isDevelopment: __DEV__,
  enableDebugLogs: __DEV__,
};

// Helper function to get the correct WebSocket URL
export const getHubUrl = () => {
  if (__DEV__) {
    console.log('🔧 Development mode - using local hub:', config.hubUrl);
  }
  return config.hubUrl;
};

// Helper function for logging in development
export const debugLog = (message: string, ...args: any[]) => {
  if (config.enableDebugLogs) {
    console.log(`[TerminalWON] ${message}`, ...args);
  }
};
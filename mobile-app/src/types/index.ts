export interface Terminal {
  id: string;
  sessionId: string;
  name: string;
  cwd: string;
  tool: 'vscode' | 'cursor' | 'claude-code' | 'other';
  status: 'active' | 'idle' | 'waiting-input' | 'error' | 'closed';
  createdAt: Date;
  lastActivity: Date;
  userId: string;
}

export interface TerminalOutput {
  id: string;
  terminalId: string;
  content: string;
  timestamp: Date;
  type: 'stdout' | 'stderr' | 'system';
}

export interface Command {
  id: string;
  terminalId: string;
  command: string;
  timestamp: Date;
  executedBy: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface AIConversation {
  id: string;
  terminalId: string;
  messages: AIMessage[];
  tool: string;
  context: Record<string, any>;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'admin' | 'member' | 'viewer';
  user: User;
  joinedAt: Date;
}

export interface ActivityItem {
  id: string;
  type: 'command' | 'error' | 'ai_message' | 'team_activity';
  title: string;
  description: string;
  timestamp: Date;
  user: User;
  terminal?: Terminal;
  status?: 'success' | 'error' | 'warning' | 'info';
}

export enum WSEventType {
  TERMINAL_CREATED = 'terminal.created',
  TERMINAL_OUTPUT = 'terminal.output',
  TERMINAL_CLOSED = 'terminal.closed',
  INPUT_REQUIRED = 'terminal.input_required',
  AI_MESSAGE = 'ai.message',
  EXECUTE_COMMAND = 'command.execute',
  SEND_INPUT = 'command.input',
  KILL_PROCESS = 'command.kill',
  PING = 'ping',
  PONG = 'pong',
  AUTH = 'auth',
  ERROR = 'error',
}

export interface WSMessage<T = any> {
  type: WSEventType;
  payload: T;
  timestamp: Date;
  messageId: string;
}
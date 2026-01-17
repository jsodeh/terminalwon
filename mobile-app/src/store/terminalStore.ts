import { create } from 'zustand';
import { Terminal, TerminalOutput, Command } from '../types';

interface TerminalState {
  terminals: Terminal[];
  activeTerminal: Terminal | null;
  terminalOutputs: Record<string, TerminalOutput[]>;
  commands: Command[];
  isConnected: boolean;
  
  // Actions
  setTerminals: (terminals: Terminal[]) => void;
  addTerminal: (terminal: Terminal) => void;
  updateTerminal: (id: string, updates: Partial<Terminal>) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (terminal: Terminal | null) => void;
  addTerminalOutput: (terminalId: string, output: TerminalOutput) => void;
  addCommand: (command: Command) => void;
  setConnected: (connected: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  activeTerminal: null,
  terminalOutputs: {},
  commands: [],
  isConnected: false,

  setTerminals: (terminals) => set({ terminals }),
  
  addTerminal: (terminal) => set((state) => ({
    terminals: [...state.terminals, terminal],
  })),
  
  updateTerminal: (id, updates) => set((state) => ({
    terminals: state.terminals.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ),
    activeTerminal: state.activeTerminal?.id === id 
      ? { ...state.activeTerminal, ...updates }
      : state.activeTerminal,
  })),
  
  removeTerminal: (id) => set((state) => ({
    terminals: state.terminals.filter(t => t.id !== id),
    activeTerminal: state.activeTerminal?.id === id ? null : state.activeTerminal,
  })),
  
  setActiveTerminal: (terminal) => set({ activeTerminal: terminal }),
  
  addTerminalOutput: (terminalId, output) => set((state) => ({
    terminalOutputs: {
      ...state.terminalOutputs,
      [terminalId]: [...(state.terminalOutputs[terminalId] || []), output],
    },
  })),
  
  addCommand: (command) => set((state) => ({
    commands: [...state.commands, command],
  })),
  
  setConnected: (connected) => set({ isConnected: connected }),
}));
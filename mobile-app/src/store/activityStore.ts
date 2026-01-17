import { create } from 'zustand';
import { ActivityItem } from '../types';

interface ActivityState {
  activities: ActivityItem[];
  filter: 'all' | 'commands' | 'errors' | 'ai' | 'team';
  
  // Actions
  setActivities: (activities: ActivityItem[]) => void;
  addActivity: (activity: ActivityItem) => void;
  setFilter: (filter: ActivityState['filter']) => void;
  getFilteredActivities: () => ActivityItem[];
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  filter: 'all',

  setActivities: (activities) => set({ activities }),
  
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities],
  })),
  
  setFilter: (filter) => set({ filter }),
  
  getFilteredActivities: () => {
    const { activities, filter } = get();
    
    if (filter === 'all') return activities;
    
    return activities.filter(activity => {
      switch (filter) {
        case 'commands':
          return activity.type === 'command';
        case 'errors':
          return activity.status === 'error';
        case 'ai':
          return activity.type === 'ai_message';
        case 'team':
          return activity.type === 'team_activity';
        default:
          return true;
      }
    });
  },
}));
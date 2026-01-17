import { create } from 'zustand';
import { colors } from '../constants/theme';

interface ThemeState {
  isDark: boolean;
  colors: typeof colors.light | typeof colors.dark;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  colors: colors.light,
  toggleTheme: () => {
    const { isDark } = get();
    set({
      isDark: !isDark,
      colors: !isDark ? colors.dark : colors.light,
    });
  },
  setTheme: (isDark: boolean) => {
    set({
      isDark,
      colors: isDark ? colors.dark : colors.light,
    });
  },
}));
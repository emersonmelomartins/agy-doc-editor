import { create } from 'zustand';
import { applyThemeTokens, type ThemeName } from '../config/theme.ts';

type Theme = ThemeName;

interface ThemeState {
  theme: Theme;
  initialized: boolean;
  initTheme: () => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  initialized: false,

  initTheme: () => {
    if (get().initialized || typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const theme = savedTheme || 'dark';

    document.documentElement.setAttribute('data-theme', theme);
    applyThemeTokens(theme);
    set({ theme, initialized: true });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    applyThemeTokens(nextTheme);
    localStorage.setItem('theme', nextTheme);
    set({ theme: nextTheme });
  },
}));

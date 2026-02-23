export type ThemeName = 'light' | 'dark';

type ThemeTokens = Record<`--${string}`, string>;

const sharedTokens: ThemeTokens = {
  '--font-sans': "'Manrope', system-ui, sans-serif",
  '--font-mono': "'Space Mono', monospace",
  '--primary': '#14b8a6',
  '--primary-dark': '#0f766e',
  '--primary-light': '#5eead4',
  '--primary-glow': 'rgba(20, 184, 166, 0.16)',
  '--bg-sheet': '#ffffff',
  '--text-sheet': '#1f2937',
  '--green': '#22c55e',
  '--yellow': '#eab308',
  '--red': '#ef4444',
  '--blue': '#3b82f6',
  '--orange': '#f97316',
  '--radius-sm': '6px',
  '--radius-md': '12px',
  '--radius-lg': '18px',
  '--radius-xl': '24px',
};

const darkTokens: ThemeTokens = {
  '--bg': '#091019',
  '--bg-card': '#101b27',
  '--bg-elevated': '#142433',
  '--bg-hover': '#1c3042',
  '--border': 'rgba(255, 255, 255, 0.07)',
  '--border-focus': 'rgba(20, 184, 166, 0.45)',
  '--text-primary': '#e8f1f7',
  '--text-secondary': '#9db3c7',
  '--text-muted': '#6f889d',
  '--shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.4)',
  '--shadow-md': '0 4px 16px rgba(0, 0, 0, 0.4)',
  '--shadow-lg': '0 8px 32px rgba(0, 0, 0, 0.5)',
  '--shadow-glow': '0 0 16px rgba(20, 184, 166, 0.16)',
};

const lightTokens: ThemeTokens = {
  '--bg': '#f5f8fc',
  '--bg-card': '#ffffff',
  '--bg-elevated': '#e8eff6',
  '--bg-hover': '#dce8f3',
  '--border': 'rgba(15, 23, 42, 0.14)',
  '--border-focus': 'rgba(20, 184, 166, 0.45)',
  '--text-primary': '#0f2233',
  '--text-secondary': '#365067',
  '--text-muted': '#5d7489',
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  '--shadow-glow': '0 0 20px rgba(20, 184, 166, 0.14)',
};

export const themePresets: Record<ThemeName, ThemeTokens> = {
  dark: {
    ...sharedTokens,
    ...darkTokens,
  },
  light: {
    ...sharedTokens,
    ...lightTokens,
  },
};

export function applyThemeTokens(theme: ThemeName): void {
  if (typeof document === 'undefined') return;
  const tokens = themePresets[theme];
  const root = document.documentElement;
  for (const [token, value] of Object.entries(tokens)) {
    root.style.setProperty(token, value);
  }
}


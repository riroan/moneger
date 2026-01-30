export const Colors = {
  dark: {
    // Background
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    bgCardHover: '#22222e',

    // Accent Colors
    accentMint: '#4ade80',
    accentCoral: '#ff6b6b',
    accentBlue: '#60a5fa',
    accentCyan: '#06B6D4',
    accentPurple: '#a78bfa',
    accentYellow: '#fbbf24',

    // Text Colors
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',

    // Border
    border: 'rgba(255, 255, 255, 0.06)',

    // Glow
    glowMint: 'rgba(74, 222, 128, 0.15)',
    glowCoral: 'rgba(255, 107, 107, 0.15)',
  },
  light: {
    // Background
    bgPrimary: '#f8fafc',
    bgSecondary: '#f1f5f9',
    bgCard: '#ffffff',
    bgCardHover: '#f1f5f9',

    // Accent Colors
    accentMint: '#22c55e',
    accentCoral: '#ef4444',
    accentBlue: '#3b82f6',
    accentCyan: '#0891B2',
    accentPurple: '#8b5cf6',
    accentYellow: '#f59e0b',

    // Text Colors
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',

    // Border
    border: 'rgba(0, 0, 0, 0.08)',

    // Glow
    glowMint: 'rgba(34, 197, 94, 0.15)',
    glowCoral: 'rgba(239, 68, 68, 0.15)',
  },
};

export type ThemeType = 'dark' | 'light';

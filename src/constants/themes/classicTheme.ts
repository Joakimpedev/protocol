import { Platform } from 'react-native';
import { Theme } from './types';

const MONOSPACE_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const classicTheme: Theme = {
  key: 'classic',

  colors: {
    background: '#0a0a0a',
    surface: '#141414',
    surfaceLight: '#1a1a1a',

    text: '#e5e5e5',
    textSecondary: '#a0a0a0',
    textMuted: '#666666',

    accent: '#00ff00',
    accentSecondary: '#00cc00',
    accentPink: '#00cc00',
    accentCyan: '#00cc00',

    border: '#2a2a2a',
    borderLight: '#1a1a1a',

    error: '#ff4444',
    warning: '#ffaa00',
    success: '#00ff00',

    overlay: 'rgba(0, 0, 0, 0.7)',

    tabBarBackground: '#0a0a0a',
    tabBarBorder: '#2a2a2a',
    tabBarActive: '#e5e5e5',
    tabBarInactive: '#666666',
  },

  typography: {
    heading: {
      fontFamily: MONOSPACE_FONT,
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
      color: '#e5e5e5',
    },
    headingSmall: {
      fontFamily: MONOSPACE_FONT,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      color: '#e5e5e5',
    },
    body: {
      fontFamily: 'System',
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      color: '#e5e5e5',
    },
    bodySmall: {
      fontFamily: 'System',
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: '#a0a0a0',
    },
    label: {
      fontFamily: 'System',
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
      color: '#a0a0a0',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    caption: {
      fontFamily: 'System',
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 14,
      color: '#666666',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 8,
    pill: 4,
    full: 9999,
  },

  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    glow: {
      shadowColor: '#00ff00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    glowPink: {
      shadowColor: '#00ff00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    glowIntense: {
      shadowColor: '#00ff00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    glass: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },

  gradients: {
    primary: ['#00cc00', '#00ff00'],
    primaryReverse: ['#00ff00', '#00cc00'],
    surface: ['#141414', '#1a1a1a'],
    accent: ['#00cc00', '#00ff00'],
    accentAlt: ['#00ff00', '#00cc00'],
    hero: ['#00cc00', '#00ff00'],
    deep: ['#00cc00', '#006600'],
  },
};

import { Theme } from './types';

export const proTheme: Theme = {
  key: 'pro',

  colors: {
    background: '#000000',
    surface: '#111114',
    surfaceLight: '#1A1A1F',

    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',

    accent: '#A855F7',
    accentSecondary: '#C084FC',
    accentPink: '#F472B6',
    accentCyan: '#00E5FF',

    border: '#1F1F28',
    borderLight: '#1F1F2A',

    error: '#EF4444',
    warning: '#EAB308',
    success: '#22C55E',

    overlay: 'rgba(0, 0, 0, 0.7)',

    tabBarBackground: '#0A0A0F',
    tabBarBorder: '#1F1F2A',
    tabBarActive: '#C084FC',
    tabBarInactive: '#6B7280',
  },

  typography: {
    heading: {
      fontFamily: 'System',
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
      color: '#FFFFFF',
    },
    headingSmall: {
      fontFamily: 'System',
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 26,
      color: '#FFFFFF',
    },
    body: {
      fontFamily: 'System',
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      color: '#FFFFFF',
    },
    bodySmall: {
      fontFamily: 'System',
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: '#9CA3AF',
    },
    label: {
      fontFamily: 'System',
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      color: '#9CA3AF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    caption: {
      fontFamily: 'System',
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 14,
      color: '#6B7280',
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 28,
    full: 9999,
  },

  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    glow: {
      shadowColor: '#A855F7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
    glowPink: {
      shadowColor: '#F472B6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    glowIntense: {
      shadowColor: '#A855F7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 8,
    },
    glass: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  gradients: {
    primary: ['#C084FC', '#7C3AED'],
    primaryReverse: ['#7C3AED', '#C084FC'],
    surface: ['#111114', '#1A1A1F'],
    accent: ['#A855F7', '#C084FC'],
    accentAlt: ['#8B5CF6', '#C084FC'],
    hero: ['#C084FC', '#F472B6'],
    deep: ['#A855F7', '#5B21B6'],
  },
};

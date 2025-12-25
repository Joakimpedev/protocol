/**
 * Protocol Design System
 * Terminal aesthetic: dark, minimal, stoic
 */

import { Platform } from 'react-native';

// Modern monospace font - cleaner than Courier, less terminal-like
export const MONOSPACE_FONT = Platform.select({
  ios: 'Menlo', // Modern, clean monospace (cleaner than Courier)
  android: 'monospace', // Roboto Mono on Android (modern monospace)
  default: 'monospace',
});

export const colors = {
  // Background
  background: '#0a0a0a', // Dark, not pure black
  surface: '#141414', // Slightly lighter for cards/surfaces
  surfaceGreen: '#171A17',

  // Text
  text: '#e5e5e5', // Off-white, not harsh
  textSecondary: '#a0a0a0', // Muted for secondary text
  textMuted: '#666666', // Very muted
  
  // Accents
  accent: '#00ff00', // Green for checkmarks/completion
  accentSecondary: '#00cc00', // Darker green variant
  buttonAccent: '#00B800', // Green for buttons (can be different from accent)
  
  // Borders
  border: '#2a2a2a', // Subtle borders
  borderLight: '#1a1a1a', // Even more subtle
  borderGreen: '#0D360D',

  // States
  error: '#ff4444',
  warning: '#ffaa00',
  success: '#00ff00',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const typography = {
  // Monospace for headings, terminal aesthetic
  heading: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    color: colors.text,
  },
  headingSmall: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: colors.text,
  },
  
  // Clean sans-serif for body
  body: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: colors.text,
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  
  // Labels
  label: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
};

export const shadows = {
  // Minimal shadows, terminal aesthetic
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
};


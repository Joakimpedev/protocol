/**
 * Protocol V2 Design System
 * Premium dark mode — Electric Violet → Rose accent spectrum
 */

export const colorsV2 = {
  // Background
  background: '#000000',
  surface: '#111114',
  surfaceLight: '#1A1A1F',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Accents (Electric Violet → Rose spectrum)
  accentOrange: '#A855F7',    // Violet-500 — primary accent
  accentPurple: '#C084FC',    // Violet-400 — lighter accent
  accentPink: '#F472B6',      // Pink-400 — warm rose accent
  accentCyan: '#00E5FF',

  // Status
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#EF4444',

  // Borders
  border: '#1F1F28',
  borderLight: '#1F1F2A',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const gradients = {
  primary: ['#C084FC', '#7C3AED'] as [string, string],          // Violet-400 → Violet-600
  primaryReverse: ['#7C3AED', '#C084FC'] as [string, string],   // Violet-600 → Violet-400
  surface: ['#111114', '#1A1A1F'] as [string, string],
  orangeWarm: ['#A855F7', '#C084FC'] as [string, string],       // Violet-500 → Violet-400
  purpleCool: ['#8B5CF6', '#C084FC'] as [string, string],       // Violet-500 → Violet-400
  violetPink: ['#C084FC', '#F472B6'] as [string, string],       // Violet-400 → Pink-400 (hero gradient)
  pinkViolet: ['#F472B6', '#A855F7'] as [string, string],       // Pink-400 → Violet-500
  deepViolet: ['#A855F7', '#5B21B6'] as [string, string],       // Violet-500 → Violet-800
};

export const typographyV2 = {
  display: {
    fontSize: 44,
    fontWeight: '800' as const,
    lineHeight: 50,
    letterSpacing: -0.5,
    color: colorsV2.textPrimary,
  },
  hero: {
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 42,
    letterSpacing: -0.3,
    color: colorsV2.textPrimary,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    color: colorsV2.textPrimary,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    color: colorsV2.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: colorsV2.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colorsV2.textSecondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    color: colorsV2.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    color: colorsV2.textMuted,
  },
};

export const spacingV2 = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadiusV2 = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 28,
  full: 9999,
};

export const shadows = {
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
};

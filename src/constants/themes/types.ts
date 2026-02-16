import { TextStyle } from 'react-native';

export type ThemeKey = 'classic' | 'pro';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceLight: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentSecondary: string;
  accentPink: string;
  accentCyan: string;

  border: string;
  borderLight: string;

  error: string;
  warning: string;
  success: string;

  overlay: string;

  // Tab bar
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export interface ThemeTypography {
  heading: TextStyle;
  headingSmall: TextStyle;
  body: TextStyle;
  bodySmall: TextStyle;
  label: TextStyle;
  caption: TextStyle;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeBorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
  full: number;
}

export interface ThemeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ThemeShadows {
  card: ThemeShadow;
  glow: ThemeShadow;
  glowPink: ThemeShadow;
  glowIntense: ThemeShadow;
  glass: ThemeShadow;
}

export interface ThemeGradients {
  primary: [string, string];
  primaryReverse: [string, string];
  surface: [string, string];
  accent: [string, string];
  accentAlt: [string, string];
  hero: [string, string];
  deep: [string, string];
}

export interface Theme {
  key: ThemeKey;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  gradients: ThemeGradients;
}

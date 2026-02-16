import { useMemo } from 'react';
import { useThemeContext } from '../contexts/ThemeContext';
import { Theme } from '../constants/themes';

export function useTheme(): Theme {
  const { theme } = useThemeContext();
  return theme;
}

export function useThemeControl() {
  return useThemeContext();
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeKey, classicTheme, proTheme } from '../constants/themes';

const THEME_STORAGE_KEY = '@protocol_theme_key';

interface ThemeContextValue {
  theme: Theme;
  activeThemeKey: ThemeKey;
  setTheme: (key: ThemeKey) => void;
}

const themes: Record<ThemeKey, Theme> = {
  classic: classicTheme,
  pro: proTheme,
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: proTheme,
  activeThemeKey: 'pro',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeThemeKey, setActiveThemeKey] = useState<ThemeKey>('pro');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'classic' || stored === 'pro') {
        setActiveThemeKey(stored);
      }
    });
  }, []);

  const setTheme = useCallback((key: ThemeKey) => {
    setActiveThemeKey(key);
    AsyncStorage.setItem(THEME_STORAGE_KEY, key);
  }, []);

  const value: ThemeContextValue = {
    theme: themes[activeThemeKey],
    activeThemeKey,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

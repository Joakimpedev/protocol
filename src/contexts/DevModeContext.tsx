/**
 * Dev Mode Context
 * 
 * Provides dev mode state across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDevMode, setDevMode as setDevModeStorage } from '../services/devModeService';

interface DevModeContextType {
  isDevModeEnabled: boolean;
  isLoading: boolean;
  enableDevMode: () => Promise<void>;
  disableDevMode: () => Promise<void>;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load dev mode state on mount
  useEffect(() => {
    loadDevMode();
  }, []);

  const loadDevMode = async () => {
    try {
      const enabled = await getDevMode();
      setIsDevModeEnabled(enabled);
    } catch (error) {
      console.error('Error loading dev mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enableDevMode = async () => {
    try {
      await setDevModeStorage(true);
      setIsDevModeEnabled(true);
    } catch (error) {
      console.error('Error enabling dev mode:', error);
      throw error;
    }
  };

  const disableDevMode = async () => {
    try {
      await setDevModeStorage(false);
      setIsDevModeEnabled(false);
    } catch (error) {
      console.error('Error disabling dev mode:', error);
      throw error;
    }
  };

  return (
    <DevModeContext.Provider
      value={{
        isDevModeEnabled,
        isLoading,
        enableDevMode,
        disableDevMode,
      }}
    >
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode(): DevModeContextType {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
}


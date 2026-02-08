/**
 * Dev Mode Context
 * 
 * Provides dev mode state across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getDevMode, 
  setDevMode as setDevModeStorage,
  getDebugInfoEnabled,
  setDebugInfoEnabled as setDebugInfoEnabledStorage,
  getForceOnboarding,
  setForceOnboarding as setForceOnboardingStorage,
  getForceShowApp,
  setForceShowApp as setForceShowAppStorage,
  getHideDevToolsInOnboarding,
  setHideDevToolsInOnboarding as setHideDevToolsInOnboardingStorage,
} from '../services/devModeService';

interface DevModeContextType {
  isDevModeEnabled: boolean;
  isDebugInfoEnabled: boolean;
  hideDevToolsInOnboarding: boolean;
  forceShowOnboarding: boolean;
  forceShowApp: boolean;
  isLoading: boolean;
  enableDevMode: () => Promise<void>;
  disableDevMode: () => Promise<void>;
  setDebugInfoEnabled: (enabled: boolean) => Promise<void>;
  setHideDevToolsInOnboarding: (enabled: boolean) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  goToHomepage: () => Promise<void>;
  clearForceFlags: () => Promise<void>;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);
  const [isDebugInfoEnabled, setIsDebugInfoEnabled] = useState(false);
  const [hideDevToolsInOnboarding, setHideDevToolsInOnboardingState] = useState(false);
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false);
  const [forceShowApp, setForceShowApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDevMode();
  }, []);

  const loadDevMode = async () => {
    try {
      const [devMode, debugInfo, hideInOnboarding, forceOnboard, forceApp] = await Promise.all([
        getDevMode(),
        getDebugInfoEnabled(),
        getHideDevToolsInOnboarding(),
        getForceOnboarding(),
        getForceShowApp(),
      ]);
      setIsDevModeEnabled(devMode);
      setIsDebugInfoEnabled(debugInfo);
      setHideDevToolsInOnboardingState(hideInOnboarding);
      setForceShowOnboarding(forceOnboard);
      setForceShowApp(forceApp);
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
      await setDebugInfoEnabledStorage(false);
      setIsDebugInfoEnabled(false);
      await setForceOnboardingStorage(false);
      await setForceShowAppStorage(false);
      setForceShowOnboarding(false);
      setForceShowApp(false);
    } catch (error) {
      console.error('Error disabling dev mode:', error);
      throw error;
    }
  };

  const handleSetDebugInfoEnabled = async (enabled: boolean) => {
    try {
      await setDebugInfoEnabledStorage(enabled);
      setIsDebugInfoEnabled(enabled);
    } catch (error) {
      console.error('Error setting debug info:', error);
      throw error;
    }
  };

  const handleSetHideDevToolsInOnboarding = async (enabled: boolean) => {
    try {
      await setHideDevToolsInOnboardingStorage(enabled);
      setHideDevToolsInOnboardingState(enabled);
    } catch (error) {
      console.error('Error setting hide dev tools in onboarding:', error);
      throw error;
    }
  };

  const resetOnboarding = async () => {
    try {
      await setForceOnboardingStorage(true);
      await setForceShowAppStorage(false);
      setForceShowOnboarding(true);
      setForceShowApp(false);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      throw error;
    }
  };

  const goToHomepage = async () => {
    try {
      await setForceOnboardingStorage(false);
      await setForceShowAppStorage(true);
      setForceShowOnboarding(false);
      setForceShowApp(true);
    } catch (error) {
      console.error('Error going to homepage:', error);
      throw error;
    }
  };

  const clearForceFlags = async () => {
    try {
      await setForceOnboardingStorage(false);
      await setForceShowAppStorage(false);
      setForceShowOnboarding(false);
      setForceShowApp(false);
    } catch (error) {
      console.error('Error clearing force flags:', error);
    }
  };

  return (
    <DevModeContext.Provider
      value={{
        isDevModeEnabled,
        isDebugInfoEnabled,
        hideDevToolsInOnboarding,
        forceShowOnboarding,
        forceShowApp,
        isLoading,
        enableDevMode,
        disableDevMode,
        setDebugInfoEnabled: handleSetDebugInfoEnabled,
        setHideDevToolsInOnboarding: handleSetHideDevToolsInOnboarding,
        resetOnboarding,
        goToHomepage,
        clearForceFlags,
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


import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface OnboardingData {
  // Screen 1
  userInput?: string;
  aiCategories?: string[];
  
  // Screen 2
  selectedCategories: string[];
  
  // Screen 3
  skinType?: 'oily' | 'dry' | 'combination' | 'normal';
  budget?: 'low' | 'medium' | 'flexible';
  dailyTime?: 10 | 20 | 30;
  
  // Screen 5 (will be populated after routine generation)
  products?: Array<{
    step: string;
    ingredient: string;
    purpose: string;
    usage: string;
    examples: string[];
    state: 'pending' | 'added' | 'skipped' | 'not_received';
    productName?: string;
  }>;
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>({
    selectedCategories: [],
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const reset = () => {
    setData({ selectedCategories: [] });
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}






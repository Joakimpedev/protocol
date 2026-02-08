import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import {
  getPrimaryProblem,
  getTotalRoutineTime,
  getOnboardingContent,
} from '../utils/onboardingUtils';

/** Phase 0: 27-page personalized onboarding state (from ONBOARDING_PROMPTING_GUIDE) */
export interface OnboardingFlowState {
  selectedProblems: string[];
  primaryProblem: string | null;
  severityLevel: string | null;
  impacts: string[];
  goalSetting: string | null;
  skinType: 'oily' | 'dry' | 'combination' | 'normal' | null;
  followupAnswer: string | null;
  timeCommitment: string | null;
  budget: 'low' | 'medium' | 'flexible' | null;
  commitment: string | null;
  shoppingSelections: Record<string, string>;
  currentPage: number;
}

export interface OnboardingData extends Partial<OnboardingFlowState> {
  // Legacy: Screen 1
  userInput?: string;
  aiCategories?: string[];

  // Legacy: Screen 2
  selectedCategories: string[];

  // Legacy: Screen 3 (skinType also used by Phase 0 flow)
  skinType?: 'oily' | 'dry' | 'combination' | 'normal' | null;
  budget?: 'low' | 'medium' | 'flexible' | null;
  dailyTime?: 10 | 20 | 30;
  timeAvailability?: '10' | '20' | '30';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  hasCurrentRoutine?: boolean;

  // Legacy: Screen 5 (will be populated after routine generation)
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
  /** Set to true when user taps Continue on CommitmentScreen so RootNavigator shows homepage */
  onboardingComplete: boolean;
  setOnboardingComplete: (value: boolean) => void;
  /** Computed: primary problem from selectedProblems (highest priority) */
  primaryProblem: string | null;
  /** Computed: total routine minutes across selected problems */
  totalRoutineTime: number;
  /** Onboarding content from JSON (problems, followup_questions, impact_options, wow_users) */
  content: ReturnType<typeof getOnboardingContent>;
}

const INITIAL_FLOW_STATE: Partial<OnboardingFlowState> = {
  selectedProblems: [],
  primaryProblem: null,
  severityLevel: null,
  impacts: [],
  goalSetting: null,
  skinType: null,
  followupAnswer: null,
  timeCommitment: null,
  budget: null,
  commitment: null,
  shoppingSelections: {},
  currentPage: 1,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>({
    selectedCategories: [],
    ...INITIAL_FLOW_STATE,
  });
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const content = useMemo(() => getOnboardingContent(), []);
  const selectedProblems = data.selectedProblems ?? [];
  const primaryProblem = useMemo(
    () => getPrimaryProblem(selectedProblems, content),
    [selectedProblems, content]
  );
  const totalRoutineTime = useMemo(
    () => getTotalRoutineTime(selectedProblems, content),
    [selectedProblems, content]
  );

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      if ('selectedProblems' in updates) {
        next.primaryProblem = getPrimaryProblem(
          (updates.selectedProblems ?? prev.selectedProblems) ?? [],
          content
        );
      }
      return next;
    });
  }, [content]);

  const reset = useCallback(() => {
    setData({
      selectedCategories: [],
      ...INITIAL_FLOW_STATE,
    });
  }, []);

  const value = useMemo(
    () => ({
      data,
      updateData,
      reset,
      onboardingComplete,
      setOnboardingComplete,
      primaryProblem,
      totalRoutineTime,
      content,
    }),
    [data, onboardingComplete, primaryProblem, totalRoutineTime, content]
  );

  return (
    <OnboardingContext.Provider value={value}>
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






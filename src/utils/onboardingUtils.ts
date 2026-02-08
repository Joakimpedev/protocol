/**
 * Phase 0: Onboarding state utilities
 * Primary problem calculation, routine time, and content loading
 */

// Problem IDs from onboarding_content.json (priority order: 1=highest)
export type ProblemId =
  | 'acne'
  | 'jawline'
  | 'facial_hair'
  | 'oily_skin'
  | 'dry_skin'
  | 'blackheads'
  | 'dark_circles'
  | 'skin_texture'
  | 'hyperpigmentation';

export interface ProblemData {
  priority: number;
  requires_products: boolean;
  routine_time_minutes: number;
  [key: string]: unknown;
}

export interface OnboardingContent {
  problems: Record<string, ProblemData>;
  followup_questions: Record<string, unknown>;
  impact_options: Array<{ id: string; label: string; for_negative_path: string }>;
  wow_users: Array<unknown>;
}

// Lazy-load content to avoid require at top level in contexts
let _content: OnboardingContent | null = null;

export function getOnboardingContent(): OnboardingContent {
  if (!_content) {
    _content = require('../../onboarding_content.json') as OnboardingContent;
  }
  return _content;
}

/**
 * Calculate primary problem from selected problems.
 * Primary = highest priority (lowest priority number).
 * Used for all personalization throughout the flow.
 */
export function getPrimaryProblem(
  selectedProblems: string[],
  content?: OnboardingContent
): string | null {
  if (selectedProblems.length === 0) return null;

  const problems = content?.problems ?? getOnboardingContent().problems;
  let primary: string | null = null;
  let lowestPriority = Infinity;

  for (const problemId of selectedProblems) {
    const problem = problems[problemId];
    if (problem && typeof problem.priority === 'number' && problem.priority < lowestPriority) {
      lowestPriority = problem.priority;
      primary = problemId;
    }
  }

  return primary;
}

/**
 * Calculate total routine time in minutes across all selected problems.
 * Used for Pages 14 and 19.
 */
export function getTotalRoutineTime(
  selectedProblems: string[],
  content?: OnboardingContent
): number {
  if (selectedProblems.length === 0) return 0;

  const problems = content?.problems ?? getOnboardingContent().problems;
  let total = 0;

  for (const problemId of selectedProblems) {
    const problem = problems[problemId];
    if (problem && typeof problem.routine_time_minutes === 'number') {
      total += problem.routine_time_minutes;
    }
  }

  return total;
}

/**
 * Check if primary problem requires products (Page 12 skip logic).
 */
export function requiresProducts(primaryProblem: string | null, content?: OnboardingContent): boolean {
  if (!primaryProblem) return false;
  const problem = (content?.problems ?? getOnboardingContent().problems)[primaryProblem];
  return problem?.requires_products === true;
}

/**
 * Check if ANY of the selected problems require products.
 * Used to determine if the shopping flow should be shown.
 */
export function anyRequiresProducts(selectedProblems: string[], content?: OnboardingContent): boolean {
  if (selectedProblems.length === 0) return false;
  const problems = content?.problems ?? getOnboardingContent().problems;
  return selectedProblems.some((id) => problems[id]?.requires_products === true);
}

/** Follow-up question config for Page 9 (conditional) */
export interface Page9FollowUp {
  questionId: string;
  question: string;
  options: Array<{ value: string; label: string }>;
  storeAs: 'skinType' | 'followupAnswer';
}

const SKINCARE_SKIN_CONDITIONS = ['acne', 'blackheads', 'skin_texture', 'hyperpigmentation'];
const SKIP_IF_SKIN_TYPE_SELECTED = ['oily_skin', 'dry_skin'];

/**
 * Determine which follow-up question (if any) to show on Page 9.
 * Returns null if page should be skipped (jawline/facial_hair primary, or no conditions met).
 */
export function getPage9FollowUp(
  selectedProblems: string[],
  primaryProblem: string | null,
  content?: OnboardingContent
): Page9FollowUp | null {
  const c = content ?? getOnboardingContent();
  const followup = c.followup_questions as Record<string, {
    conditions?: string[];
    skip_if_selected?: string[];
    question: string;
    options: Array<{ value: string; label: string }>;
  }>;
  if (!followup) return null;

  // Skip Page 9 entirely if primary is jawline or facial_hair (their severity is the follow-up).
  if (primaryProblem === 'jawline' || primaryProblem === 'facial_hair') return null;

  const hasAny = (ids: string[]) => ids.some((id) => selectedProblems.includes(id));

  // 1. Skincare skin type: at least one of [acne, blackheads, skin_texture, hyperpigmentation] AND no oily_skin/dry_skin
  const skinTypeQ = followup.skincare_skin_type;
  if (skinTypeQ?.conditions && skinTypeQ?.skip_if_selected) {
    const conditionMet = hasAny(skinTypeQ.conditions);
    const skipMet = hasAny(skinTypeQ.skip_if_selected);
    if (conditionMet && !skipMet && skinTypeQ.question && skinTypeQ.options?.length) {
      return {
        questionId: 'skincare_skin_type',
        question: skinTypeQ.question,
        options: skinTypeQ.options,
        storeAs: 'skinType',
      };
    }
  }

  // 2. Dark circles cause: user selected dark_circles
  const darkCirclesQ = followup.dark_circles_cause;
  if (darkCirclesQ?.conditions && hasAny(darkCirclesQ.conditions) && darkCirclesQ.question && darkCirclesQ.options?.length) {
    return {
      questionId: 'dark_circles_cause',
      question: darkCirclesQ.question,
      options: darkCirclesQ.options,
      storeAs: 'followupAnswer',
    };
  }

  return null;
}

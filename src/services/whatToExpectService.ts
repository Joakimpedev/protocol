/**
 * What to Expect Service
 * 
 * Provides content for "What to Expect" cards based on user's concerns and week number
 * Realistic expectations, stoic tone
 */

import whatToExpectData from '../data/what_to_expect.json';
import guideBlocks from '../data/guide_blocks.json';

export interface ProblemExpectation {
  problemName: string;
  currentWeekSummary: string;
  nextWeekSummary: string | null;
}

export interface WhatToExpectContent {
  weekNumber: number;
  problems: ProblemExpectation[];
}

/**
 * Get expectation for a problem at specific week
 */
function getExpectationForProblem(problemId: string, targetWeek: number) {
  const problemData = (whatToExpectData as any).what_to_expect[problemId];
  if (!problemData) return null;

  const expectation = problemData.expectations.find((exp: any) => {
    return exp.week_start <= targetWeek && (exp.week_end === null || targetWeek <= exp.week_end);
  });

  if (!expectation) return null;

  // Get next week expectation
  const nextExpectation = problemData.expectations.find((exp: any) => {
    return exp.week_start > targetWeek;
  });

  return {
    currentWeekSummary: expectation.short_summary || expectation.description,
    nextWeekSummary: nextExpectation ? (nextExpectation.short_summary || nextExpectation.description) : null,
    problemName: (guideBlocks as any).problems.find((p: any) => p.problem_id === problemId)?.display_name || problemId
  };
}

/**
 * Get What to Expect content for a specific week and concerns
 */
export function getWhatToExpect(
  weekNumber: number,
  concerns: string[]
): WhatToExpectContent {
  if (concerns.length === 0) {
    return {
      weekNumber,
      problems: [],
    };
  }

  // Get expectations for all concerns
  const problems = concerns
    .map((concernId) => getExpectationForProblem(concernId, weekNumber))
    .filter((exp): exp is NonNullable<typeof exp> => exp !== null);

  return {
    weekNumber,
    problems: problems.map(p => ({
      problemName: p.problemName,
      currentWeekSummary: p.currentWeekSummary,
      nextWeekSummary: p.nextWeekSummary,
    })),
  };
}


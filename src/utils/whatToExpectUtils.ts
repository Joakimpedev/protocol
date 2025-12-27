import whatToExpectData from '../data/what_to_expect.json';

interface Expectation {
  week_start: number;
  week_end: number | null;
  description: string;
  short_summary: string;
}

interface ProblemExpectations {
  problem_id: string;
  protocol: string[];
  expectations: Expectation[];
}

/**
 * Gets the expectation short_summary for a given problem_id and week number
 * Returns the first expectation where week_start <= week AND (week_end is null OR week <= week_end)
 * Returns null if no expectation covers this week (does NOT return last summary)
 */
export function getExpectationForWeek(problemId: string, week: number): string | null {
  const problemData = (whatToExpectData.what_to_expect as Record<string, ProblemExpectations>)[problemId];
  
  if (!problemData || !problemData.expectations || problemData.expectations.length === 0) {
    return null;
  }

  // Find the first expectation that covers this week
  const expectation = problemData.expectations.find(
    (exp) => exp.week_start <= week && (exp.week_end === null || week <= exp.week_end)
  );

  return expectation?.short_summary || null;
}

/**
 * Gets the last available expectation for a problem
 */
function getLastExpectation(problemId: string): Expectation | null {
  const problemData = (whatToExpectData.what_to_expect as Record<string, ProblemExpectations>)[problemId];
  
  if (!problemData || !problemData.expectations || problemData.expectations.length === 0) {
    return null;
  }

  // Find the last available expectation
  // Priority: 1) week_end === null (ongoing), 2) highest week_end, 3) highest week_start
  const lastExpectation = problemData.expectations.reduce((last, current) => {
    // If current has no end (null), it's the last one
    if (current.week_end === null) {
      return current;
    }
    // If last has no end, keep it
    if (last.week_end === null) {
      return last;
    }
    // Compare by week_end (higher is later)
    if (current.week_end > last.week_end) {
      return current;
    }
    if (current.week_end < last.week_end) {
      return last;
    }
    // If week_end is equal, use the one with higher week_start
    return current.week_start > last.week_start ? current : last;
  });

  return lastExpectation;
}

/**
 * Gets the starting week of the last expectation for a problem
 */
function getLastExpectationStartWeek(problemId: string): number | null {
  const lastExp = getLastExpectation(problemId);
  if (!lastExp) return null;
  
  return lastExp.week_start;
}

/**
 * Gets expectations for multiple problems at a given week
 * Returns a combined string of all non-null expectations
 * 
 * @param problemIds - Array of problem IDs
 * @param week - Current week number
 * @param allWeeks - All weeks being displayed (to determine if this is the first week without data)
 */
export function getCombinedExpectationsForWeek(
  problemIds: string[], 
  week: number, 
  allWeeks?: number[]
): string | null {
  const expectations = problemIds
    .map((id) => {
      // First, try to get the expectation for this specific week
      const expectation = getExpectationForWeek(id, week);
      
      // If we have data for this week, use it
      if (expectation) {
        return expectation;
      }
      
      // If no expectation for this week, check if we should show the last one
      // Logic: Show the last summary at the first displayed week that is >= the last expectation's week_start
      // This ensures the last summary is shown at least once, but not repeated
      if (allWeeks) {
        const lastStartWeek = getLastExpectationStartWeek(id);
        
        // If no data exists for this problem, don't show anything
        if (lastStartWeek === null) {
          return null;
        }
        
        // Find the first week in allWeeks that is >= the last expectation's week_start
        const firstWeekAtOrAfterLastStart = allWeeks.find(w => w >= lastStartWeek);
        
        // Only show the last summary at the first week that is >= the last expectation's week_start
        if (firstWeekAtOrAfterLastStart === week) {
          const lastExp = getLastExpectation(id);
          return lastExp?.short_summary || null;
        }
      }
      
      return null;
    })
    .filter((exp): exp is string => exp !== null);

  if (expectations.length === 0) {
    return null;
  }

  // Combine expectations - if multiple, join with periods for better readability
  // Remove duplicates (in case same expectation appears for multiple categories)
  const uniqueExpectations = Array.from(new Set(expectations));
  
  if (uniqueExpectations.length === 1) {
    return uniqueExpectations[0];
  }
  
  // Remove trailing periods from each expectation (since they already have them)
  // Then join with period and space to avoid double punctuation
  const trimmedExpectations = uniqueExpectations.map(exp => exp.trim().replace(/\.+$/, ''));
  
  // Join multiple expectations with periods
  return trimmedExpectations.join('. ') + '.';
}


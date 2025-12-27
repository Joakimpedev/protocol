/**
 * Monthly Insights Service
 * Calculates monthly insights from real user data
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateDailyScore, DailyCompletion, getWeekStartDateString } from './completionService';
import { getNotificationPreferences, DEFAULT_MORNING_TIME, DEFAULT_EVENING_TIME } from './notificationService';
import { getCurrentWeekNumber } from './photoService';

export interface CorrelationInsight {
  metric: string;
  sentence: string; // e.g., "On better weeks, your consistency score was higher than on average."
  // Template and data parts for redaction support
  sentenceTemplatePrefix: string; // e.g., "On better weeks, "
  sentenceData: string; // e.g., "your consistency score was higher"
  sentenceTemplateSuffix: string; // e.g., " than on average."
  advice: string; // e.g., "When you are more consistent, it makes a difference."
  // Template and data parts for advice redaction support
  adviceTemplatePrefix: string; // e.g., "When you "
  adviceData: string; // e.g., "are more consistent"
  adviceTemplateSuffix: string; // e.g., ", it makes a difference."
  weekCount: number; // Number of "Better" or "Worse" weeks
  totalWeeks: number; // Total weeks analyzed
  // Optional: actual values (can be redacted for free users)
  betterValue?: number;
  worseValue?: number;
  baselineValue?: number;
  unit?: string;
}

export interface MonthlyInsightsData {
  hardestDay: { day: string; percentage: number } | null;
  bestDay: { day: string; percentage: number } | null;
  notificationTiming: {
    morning: {
      averageStartTime: { hour: number; minute: number };
      configuredNotificationTime: { hour: number; minute: number };
      discrepancyMinutes: number;
    } | null;
    evening: {
      averageStartTime: { hour: number; minute: number };
      configuredNotificationTime: { hour: number; minute: number };
      discrepancyMinutes: number;
    } | null;
  };
  correlationInsights: {
    whatsWorking: CorrelationInsight | null;
    whatsHurting: CorrelationInsight | null;
    message: string | null; // For edge cases
  };
  hasEnoughData: boolean; // true if 4+ weeks of data
}

/**
 * Get day name from day of week number
 */
function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

/**
 * Get week start date for a given week number based on signup date
 */
function getWeekStartDateForWeek(signupDate: string, weekNumber: number): string {
  const signup = new Date(signupDate);
  const weekStart = new Date(signup);
  weekStart.setDate(signup.getDate() + (weekNumber * 7));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

/**
 * Get week end date for a given week number
 */
function getWeekEndDateForWeek(signupDate: string, weekNumber: number): string {
  const weekStart = getWeekStartDateForWeek(signupDate, weekNumber);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd.toISOString().split('T')[0];
}

/**
 * Weekly metrics for a specific week
 */
interface WeeklyMetrics {
  weekNumber: number;
  consistency_score: number; // 0.0-10.0
  morning_completion: number; // 0-7 days
  evening_completion: number; // 0-7 days
  exercise_completion: number; // 0-7 days
  timer_skips: number;
  steps_skipped: number;
  most_skipped_step: { stepId: string; stepName: string; count: number } | null;
}

/**
 * Get weekly aggregated metrics for a specific week
 */
async function getWeeklyMetrics(
  userId: string,
  signupDate: string,
  weekNumber: number
): Promise<WeeklyMetrics | null> {
  try {
    const weekStart = getWeekStartDateForWeek(signupDate, weekNumber);
    const weekEnd = getWeekEndDateForWeek(signupDate, weekNumber);
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    const sessionCompletions: any[] = data.sessionCompletions || [];
    
    // Get all completion records from this week
    const weekCompletions = completions.filter(c => {
      return c.date >= weekStart && c.date <= weekEnd;
    });
    
    // Get session completions for this week
    const weekSessions = sessionCompletions.filter((c: any) => {
      return c.date >= weekStart && c.date <= weekEnd;
    });

    // Calculate consistency score (average daily score)
    const uniqueDays = new Set(weekCompletions.map(c => c.date));
    const dailyScores: number[] = [];
    for (const date of uniqueDays) {
      const score = await calculateDailyScore(userId, date);
      dailyScores.push(score);
    }
    const consistency_score = dailyScores.length > 0
      ? Math.round((dailyScores.reduce((sum, s) => sum + s, 0) / dailyScores.length) * 10) / 10
      : 0;

    // Calculate completion counts
    const morning_completion = weekSessions.filter((s: any) => s.morning).length;
    const evening_completion = weekSessions.filter((s: any) => s.evening).length;
    const exercise_completion = weekSessions.filter((s: any) => s.exercises).length;

    // Get skip counts
    const { 
      getTimerSkipCount, 
      getMostSkippedStep,
      getProductSkipCount,
    } = await import('./analyticsService');
    const timer_skips = await getTimerSkipCount(userId, weekStart, weekEnd);
    const steps_skipped = await getProductSkipCount(userId, weekStart, weekEnd);
    const most_skipped_step = await getMostSkippedStep(userId, weekStart, weekEnd);

    return {
      weekNumber,
      consistency_score,
      morning_completion,
      evening_completion,
      exercise_completion,
      timer_skips,
      steps_skipped,
      most_skipped_step,
    };
  } catch (error) {
    console.error(`Error getting weekly metrics for week ${weekNumber}:`, error);
    return null;
  }
}

/**
 * Calculate correlation insights
 */
async function calculateCorrelationInsights(
  userId: string,
  signupDate: string,
  skinRatings: any[]
): Promise<{
  whatsWorking: CorrelationInsight | null;
  whatsHurting: CorrelationInsight | null;
  message: string | null;
}> {
  // Get all weeks with skin ratings (excluding week 0)
  // The rating is connected to the week that finished
  const weeksWithRatings = skinRatings
    .filter((r: any) => r.week_number > 0)
    .map((r: any) => ({
      weekNumber: r.week_number,
      rating: r.skin_rating,
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber); // Sort by week number

  // Need at least 4 weeks of data
  if (weeksWithRatings.length < 4) {
    return {
      whatsWorking: null,
      whatsHurting: null,
      message: "Patterns emerge after 4 weeks.",
    };
  }

  if (weeksWithRatings.length === 0) {
    return {
      whatsWorking: null,
      whatsHurting: null,
      message: null,
    };
  }

  // Check if all weeks are "same"
  const allSame = weeksWithRatings.every(w => w.rating === 'same');
  if (allSame) {
    return {
      whatsWorking: null,
      whatsHurting: null,
      message: "Consistent results. Keep going.",
    };
  }

  // Get weekly metrics for all weeks with ratings
  const weeklyMetricsData: WeeklyMetrics[] = [];
  for (const weekRating of weeksWithRatings) {
    const metrics = await getWeeklyMetrics(userId, signupDate, weekRating.weekNumber);
    if (metrics) {
      weeklyMetricsData.push(metrics);
    }
  }

  if (weeklyMetricsData.length < 2) {
    return {
      whatsWorking: null,
      whatsHurting: null,
      message: null,
    };
  }

  // Calculate baseline (average across all weeks)
  const baseline = {
    consistency_score: weeklyMetricsData.reduce((sum, w) => sum + w.consistency_score, 0) / weeklyMetricsData.length,
    morning_completion: weeklyMetricsData.reduce((sum, w) => sum + w.morning_completion, 0) / weeklyMetricsData.length,
    evening_completion: weeklyMetricsData.reduce((sum, w) => sum + w.evening_completion, 0) / weeklyMetricsData.length,
    exercise_completion: weeklyMetricsData.reduce((sum, w) => sum + w.exercise_completion, 0) / weeklyMetricsData.length,
    timer_skips: weeklyMetricsData.reduce((sum, w) => sum + w.timer_skips, 0) / weeklyMetricsData.length,
    steps_skipped: weeklyMetricsData.reduce((sum, w) => sum + w.steps_skipped, 0) / weeklyMetricsData.length,
  };

  // Find "What's Working" - weeks with "better" ratings
  const betterWeeks = weeksWithRatings.filter(w => w.rating === 'better');
  const betterWeekNumbers = new Set(betterWeeks.map(w => w.weekNumber));
  const betterMetrics = weeklyMetricsData.filter(w => betterWeekNumbers.has(w.weekNumber));

  // Find "What's Hurting" - weeks with "worse" ratings
  const worseWeeks = weeksWithRatings.filter(w => w.rating === 'worse');
  const worseWeekNumbers = new Set(worseWeeks.map(w => w.weekNumber));
  const worseMetrics = weeklyMetricsData.filter(w => worseWeekNumbers.has(w.weekNumber));

  // Calculate averages for better weeks
  const betterAverages = betterMetrics.length > 0 ? {
    consistency_score: betterMetrics.reduce((sum, w) => sum + w.consistency_score, 0) / betterMetrics.length,
    morning_completion: betterMetrics.reduce((sum, w) => sum + w.morning_completion, 0) / betterMetrics.length,
    evening_completion: betterMetrics.reduce((sum, w) => sum + w.evening_completion, 0) / betterMetrics.length,
    exercise_completion: betterMetrics.reduce((sum, w) => sum + w.exercise_completion, 0) / betterMetrics.length,
    timer_skips: betterMetrics.reduce((sum, w) => sum + w.timer_skips, 0) / betterMetrics.length,
    steps_skipped: betterMetrics.reduce((sum, w) => sum + w.steps_skipped, 0) / betterMetrics.length,
  } : null;

  // Calculate averages for worse weeks
  const worseAverages = worseMetrics.length > 0 ? {
    consistency_score: worseMetrics.reduce((sum, w) => sum + w.consistency_score, 0) / worseMetrics.length,
    morning_completion: worseMetrics.reduce((sum, w) => sum + w.morning_completion, 0) / worseMetrics.length,
    evening_completion: worseMetrics.reduce((sum, w) => sum + w.evening_completion, 0) / worseMetrics.length,
    exercise_completion: worseMetrics.reduce((sum, w) => sum + w.exercise_completion, 0) / worseMetrics.length,
    timer_skips: worseMetrics.reduce((sum, w) => sum + w.timer_skips, 0) / worseMetrics.length,
    steps_skipped: worseMetrics.reduce((sum, w) => sum + w.steps_skipped, 0) / worseMetrics.length,
  } : null;

  // Find "What's Working" - metric with largest positive deviation
  let whatsWorking: CorrelationInsight | null = null;
  if (betterAverages && betterMetrics.length > 0) {
    const deviations: Array<{ metric: string; deviation: number; value: number }> = [];

    // Consistency score (higher = better)
    deviations.push({
      metric: 'consistency_score',
      deviation: betterAverages.consistency_score - baseline.consistency_score,
      value: betterAverages.consistency_score,
    });

    // Morning completion (higher = better)
    deviations.push({
      metric: 'morning_completion',
      deviation: betterAverages.morning_completion - baseline.morning_completion,
      value: betterAverages.morning_completion,
    });

    // Evening completion (higher = better)
    deviations.push({
      metric: 'evening_completion',
      deviation: betterAverages.evening_completion - baseline.evening_completion,
      value: betterAverages.evening_completion,
    });

    // Exercise completion (higher = better)
    deviations.push({
      metric: 'exercise_completion',
      deviation: betterAverages.exercise_completion - baseline.exercise_completion,
      value: betterAverages.exercise_completion,
    });

    // Timer skips (lower = better, so invert)
    deviations.push({
      metric: 'timer_skips',
      deviation: baseline.timer_skips - betterAverages.timer_skips, // Inverted
      value: betterAverages.timer_skips,
    });

    // Steps skipped (lower = better, so invert)
    deviations.push({
      metric: 'steps_skipped',
      deviation: baseline.steps_skipped - betterAverages.steps_skipped, // Inverted
      value: betterAverages.steps_skipped,
    });

    // Most skipped step (check if it appears in better weeks)
    const betterMostSkipped = betterMetrics
      .map(w => w.most_skipped_step)
      .filter(s => s !== null)[0] as { stepId: string; stepName: string; count: number } | undefined;
    
    if (betterMostSkipped) {
      // If this step was skipped less in better weeks, it's a positive indicator
      const baselineMostSkipped = weeklyMetricsData
        .map(w => w.most_skipped_step)
        .filter(s => s !== null && s.stepId === betterMostSkipped.stepId)
        .reduce((sum, s) => sum + (s?.count || 0), 0) / weeklyMetricsData.length;
      
      if (betterMostSkipped.count < baselineMostSkipped) {
        deviations.push({
          metric: 'most_skipped_step',
          deviation: baselineMostSkipped - betterMostSkipped.count,
          value: betterMostSkipped.count,
        });
      }
    }

    // Find metric with largest positive deviation
    // Only consider if deviation is meaningful (at least 5% difference for percentages, or 0.5 for scores)
    const meaningfulDeviations = deviations.filter(d => {
      if (d.metric === 'consistency_score') {
        return d.deviation >= 0.5; // At least 0.5 point difference
      } else if (d.metric === 'timer_skips' || d.metric === 'steps_skipped') {
        return d.deviation >= 0.5; // At least 0.5 skip difference
      } else if (d.metric === 'morning_completion' || d.metric === 'evening_completion' || d.metric === 'exercise_completion') {
        return d.deviation >= 0.5; // At least 0.5 day difference
      } else {
        return d.deviation >= 0.5; // Default threshold
      }
    });

    // Generate sentence templates for "What's Working"
    // Separated into template parts and data parts for redaction support
    const sentenceTemplates: Record<string, {
      sentenceTemplatePrefix: string;
      getSentenceData: (stepName?: string) => string;
      sentenceTemplateSuffix: string;
      adviceTemplatePrefix: string;
      getAdviceData: (stepName?: string) => string;
      adviceTemplateSuffix: string;
      getSentence: (stepName?: string) => string;
      getAdvice: (stepName?: string) => string;
    }> = {
      consistency_score: {
        sentenceTemplatePrefix: "On better weeks, you ",
        getSentenceData: () => "had higher consistency score ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "are more consistent, ",
        adviceTemplateSuffix: "you see better results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      morning_completion: {
        sentenceTemplatePrefix: "On better weeks, you ",
        getSentenceData: () => "completed your morning routine more often ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "complete your morning routine, ",
        adviceTemplateSuffix: "you see better results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      evening_completion: {
        sentenceTemplatePrefix: "On better weeks, you ",
        getSentenceData: () => "completed your evening routine more often ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "complete your evening routine, ",
        adviceTemplateSuffix: "you see better results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      exercise_completion: {
        sentenceTemplatePrefix: "On better weeks, you ",
        getSentenceData: () => "did your exercises more often ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "do your exercises, ",
        adviceTemplateSuffix: "you see better results",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      timer_skips: {
        sentenceTemplatePrefix: "On better weeks, you ",
        getSentenceData: () => "skipped fewer timers ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "don't rush through timers, ",
        adviceTemplateSuffix: "you see better results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      steps_skipped: {
        sentenceTemplatePrefix: "On better weeks, you ",
        getSentenceData: () => "skipped fewer steps ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "complete all steps, ",
        adviceTemplateSuffix: "you see better results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      most_skipped_step: {
        sentenceTemplatePrefix: "On better weeks, you ",
        getSentenceData: (stepName) => `skipped ${stepName || 'this step'} less often `,
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: (stepName) => `don't skip ${stepName || 'this step'}, `,
        adviceTemplateSuffix: "you see better results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
    };

    if (meaningfulDeviations.length === 0) {
      // No clear winner, default to consistency_score
      const consistencyDev = deviations.find(d => d.metric === 'consistency_score');
      if (consistencyDev) {
        const template = sentenceTemplates['consistency_score'];
        const stepName = undefined;
        whatsWorking = {
          metric: 'consistency_score',
          sentence: template.getSentence(stepName),
          sentenceTemplatePrefix: template.sentenceTemplatePrefix,
          sentenceData: template.getSentenceData(stepName),
          sentenceTemplateSuffix: template.sentenceTemplateSuffix,
          advice: template.getAdvice(stepName),
          adviceTemplatePrefix: template.adviceTemplatePrefix,
          adviceData: template.getAdviceData(stepName),
          adviceTemplateSuffix: template.adviceTemplateSuffix,
          weekCount: betterWeeks.length,
          totalWeeks: weeksWithRatings.length,
          betterValue: Math.round((betterAverages.consistency_score / 10) * 100),
          baselineValue: Math.round((baseline.consistency_score / 10) * 100),
          unit: "%",
        };
      }
    } else {
      const maxDeviation = meaningfulDeviations.reduce((max, d) => 
        d.deviation > max.deviation ? d : max
      , meaningfulDeviations[0]);

      const template = sentenceTemplates[maxDeviation.metric] || sentenceTemplates['consistency_score'];

      // Get formatted values for optional display
      let betterVal: number | undefined;
      let baselineVal: number | undefined;
      let unit: string | undefined;

      if (maxDeviation.metric === 'consistency_score') {
        betterVal = Math.round((betterAverages.consistency_score / 10) * 100);
        baselineVal = Math.round((baseline.consistency_score / 10) * 100);
        unit = "%";
      } else if (maxDeviation.metric === 'morning_completion') {
        betterVal = Math.round((betterAverages.morning_completion / 7) * 100);
        baselineVal = Math.round((baseline.morning_completion / 7) * 100);
        unit = "%";
      } else if (maxDeviation.metric === 'evening_completion') {
        betterVal = Math.round((betterAverages.evening_completion / 7) * 100);
        baselineVal = Math.round((baseline.evening_completion / 7) * 100);
        unit = "%";
      } else if (maxDeviation.metric === 'exercise_completion') {
        betterVal = Math.round((betterAverages.exercise_completion / 7) * 100);
        baselineVal = Math.round((baseline.exercise_completion / 7) * 100);
        unit = "%";
      } else if (maxDeviation.metric === 'timer_skips') {
        betterVal = Math.round(betterAverages.timer_skips * 10) / 10;
        baselineVal = Math.round(baseline.timer_skips * 10) / 10;
        unit = " skips/week";
      } else if (maxDeviation.metric === 'steps_skipped') {
        betterVal = Math.round(betterAverages.steps_skipped * 10) / 10;
        baselineVal = Math.round(baseline.steps_skipped * 10) / 10;
        unit = " skips/week";
      } else if (maxDeviation.metric === 'most_skipped_step') {
        const betterMostSkippedCount = betterMetrics
          .map(w => w.most_skipped_step)
          .filter(s => s !== null && s.stepId === betterMostSkipped?.stepId)
          .reduce((sum, s) => sum + (s?.count || 0), 0) / betterMetrics.length;
        const baselineMostSkippedCount = weeklyMetricsData
          .map(w => w.most_skipped_step)
          .filter(s => s !== null && s.stepId === betterMostSkipped?.stepId)
          .reduce((sum, s) => sum + (s?.count || 0), 0) / weeklyMetricsData.length;
        betterVal = Math.round(betterMostSkippedCount * 10) / 10;
        baselineVal = Math.round(baselineMostSkippedCount * 10) / 10;
        unit = " skips/week";
      }

      const stepName = maxDeviation.metric === 'most_skipped_step' ? betterMostSkipped?.stepName : undefined;

      whatsWorking = {
        metric: maxDeviation.metric,
        sentence: template.getSentence(stepName),
        sentenceTemplatePrefix: template.sentenceTemplatePrefix,
        sentenceData: template.getSentenceData(stepName),
        sentenceTemplateSuffix: template.sentenceTemplateSuffix,
        advice: template.getAdvice(stepName),
        adviceTemplatePrefix: template.adviceTemplatePrefix,
        adviceData: template.getAdviceData(stepName),
        adviceTemplateSuffix: template.adviceTemplateSuffix,
        weekCount: betterWeeks.length,
        totalWeeks: weeksWithRatings.length,
        betterValue: betterVal,
        baselineValue: baselineVal,
        unit,
      };
    }
  }

  // Find "What's Hurting" - metric with largest negative deviation
  let whatsHurting: CorrelationInsight | null = null;
  if (worseAverages && worseMetrics.length > 0) {
    const deviations: Array<{ metric: string; deviation: number; value: number }> = [];

    // Consistency score (lower = worse)
    deviations.push({
      metric: 'consistency_score',
      deviation: baseline.consistency_score - worseAverages.consistency_score, // Negative deviation
      value: worseAverages.consistency_score,
    });

    // Morning completion (lower = worse)
    deviations.push({
      metric: 'morning_completion',
      deviation: baseline.morning_completion - worseAverages.morning_completion,
      value: worseAverages.morning_completion,
    });

    // Evening completion (lower = worse)
    deviations.push({
      metric: 'evening_completion',
      deviation: baseline.evening_completion - worseAverages.evening_completion,
      value: worseAverages.evening_completion,
    });

    // Exercise completion (lower = worse)
    deviations.push({
      metric: 'exercise_completion',
      deviation: baseline.exercise_completion - worseAverages.exercise_completion,
      value: worseAverages.exercise_completion,
    });

    // Timer skips (higher = worse)
    deviations.push({
      metric: 'timer_skips',
      deviation: worseAverages.timer_skips - baseline.timer_skips, // Higher is worse
      value: worseAverages.timer_skips,
    });

    // Steps skipped (higher = worse)
    deviations.push({
      metric: 'steps_skipped',
      deviation: worseAverages.steps_skipped - baseline.steps_skipped, // Higher is worse
      value: worseAverages.steps_skipped,
    });

    // Most skipped step
    const worseMostSkipped = worseMetrics
      .map(w => w.most_skipped_step)
      .filter(s => s !== null)[0] as { stepId: string; stepName: string; count: number } | undefined;
    
    if (worseMostSkipped) {
      const baselineMostSkipped = weeklyMetricsData
        .map(w => w.most_skipped_step)
        .filter(s => s !== null && s.stepId === worseMostSkipped.stepId)
        .reduce((sum, s) => sum + (s?.count || 0), 0) / weeklyMetricsData.length;
      
      if (worseMostSkipped.count > baselineMostSkipped) {
        deviations.push({
          metric: 'most_skipped_step',
          deviation: worseMostSkipped.count - baselineMostSkipped,
          value: worseMostSkipped.count,
        });
      }
    }

    // Find metric with largest negative deviation (largest positive value means worst)
    // Only consider if deviation is meaningful
    const meaningfulDeviations = deviations.filter(d => {
      if (d.metric === 'consistency_score') {
        return d.deviation >= 0.5;
      } else if (d.metric === 'timer_skips' || d.metric === 'steps_skipped') {
        return d.deviation >= 0.5;
      } else if (d.metric === 'morning_completion' || d.metric === 'evening_completion' || d.metric === 'exercise_completion') {
        return d.deviation >= 0.5;
      } else {
        return d.deviation >= 0.5;
      }
    });

    // Generate sentence templates for "What's Hurting"
    // Separated into template parts and data parts for redaction support
    const sentenceTemplates: Record<string, {
      sentenceTemplatePrefix: string;
      getSentenceData: (stepName?: string) => string;
      sentenceTemplateSuffix: string;
      adviceTemplatePrefix: string;
      getAdviceData: (stepName?: string) => string;
      adviceTemplateSuffix: string;
      getSentence: (stepName?: string) => string;
      getAdvice: (stepName?: string) => string;
    }> = {
      consistency_score: {
        sentenceTemplatePrefix: "On worse weeks, ",
        getSentenceData: () => "your consistency score was lower ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "are not consistent, ",
        adviceTemplateSuffix: "you see worse results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      morning_completion: {
        sentenceTemplatePrefix: "On worse weeks, ",
        getSentenceData: () => "you completed your morning routine less often ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "skip your morning routine, ",
        adviceTemplateSuffix: "you see worse results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      evening_completion: {
        sentenceTemplatePrefix: "On worse weeks, ",
        getSentenceData: () => "you completed your evening routine less often ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "skip your evening routine, ",
        adviceTemplateSuffix: "you see worse results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      exercise_completion: {
        sentenceTemplatePrefix: "On worse weeks, ",
        getSentenceData: () => "you did your exercises less often ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "skip your exercises, ",
        adviceTemplateSuffix: "you see worse results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      timer_skips: {
        sentenceTemplatePrefix: "On worse weeks, ",
        getSentenceData: () => "you skipped more timers ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "rush through timers, ",
        adviceTemplateSuffix: "you see worse results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      steps_skipped: {
        sentenceTemplatePrefix: "On worse weeks, ",
        getSentenceData: () => "you skipped more steps ",
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: () => "skip steps, ",
        adviceTemplateSuffix: "you see worse results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
      most_skipped_step: {
        sentenceTemplatePrefix: "On worse weeks, ",
        getSentenceData: (stepName) => `you skipped ${stepName || 'this step'} more often `,
        sentenceTemplateSuffix: "than on average.",
        adviceTemplatePrefix: "When you ",
        getAdviceData: (stepName) => `skip ${stepName || 'this step'}, `,
        adviceTemplateSuffix: "you see worse results.",
        getSentence: function(stepName) {
          return this.sentenceTemplatePrefix + this.getSentenceData(stepName) + this.sentenceTemplateSuffix;
        },
        getAdvice: function(stepName) {
          return this.adviceTemplatePrefix + this.getAdviceData(stepName) + this.adviceTemplateSuffix;
        },
      },
    };

    if (meaningfulDeviations.length === 0) {
      // No clear winner, default to consistency_score
      const consistencyDev = deviations.find(d => d.metric === 'consistency_score');
      if (consistencyDev) {
        const template = sentenceTemplates['consistency_score'];
        const stepName = undefined;
        whatsHurting = {
          metric: 'consistency_score',
          sentence: template.getSentence(stepName),
          sentenceTemplatePrefix: template.sentenceTemplatePrefix,
          sentenceData: template.getSentenceData(stepName),
          sentenceTemplateSuffix: template.sentenceTemplateSuffix,
          advice: template.getAdvice(stepName),
          adviceTemplatePrefix: template.adviceTemplatePrefix,
          adviceData: template.getAdviceData(stepName),
          adviceTemplateSuffix: template.adviceTemplateSuffix,
          weekCount: worseWeeks.length,
          totalWeeks: weeksWithRatings.length,
          worseValue: Math.round((worseAverages.consistency_score / 10) * 100),
          baselineValue: Math.round((baseline.consistency_score / 10) * 100),
          unit: "%",
        };
      }
    } else {
      const maxDeviation = meaningfulDeviations.reduce((max, d) => 
        d.deviation > max.deviation ? d : max
      , meaningfulDeviations[0]);

      const template = sentenceTemplates[maxDeviation.metric] || sentenceTemplates['consistency_score'];

      // Get formatted values for optional display
      let worseVal: number | undefined;
      let baselineVal: number | undefined;
      let unit: string | undefined;

      if (maxDeviation.metric === 'consistency_score') {
        worseVal = Math.round((worseAverages.consistency_score / 10) * 100);
        baselineVal = Math.round((baseline.consistency_score / 10) * 100);
        unit = "%";
      } else if (maxDeviation.metric === 'morning_completion') {
        worseVal = Math.round((worseAverages.morning_completion / 7) * 100);
        baselineVal = Math.round((baseline.morning_completion / 7) * 100);
        unit = "%";
      } else if (maxDeviation.metric === 'evening_completion') {
        worseVal = Math.round((worseAverages.evening_completion / 7) * 100);
        baselineVal = Math.round((baseline.evening_completion / 7) * 100);
        unit = "%";
      } else if (maxDeviation.metric === 'exercise_completion') {
        worseVal = Math.round((worseAverages.exercise_completion / 7) * 100);
        baselineVal = Math.round((baseline.exercise_completion / 7) * 100);
        unit = "%";
      } else if (maxDeviation.metric === 'timer_skips') {
        worseVal = Math.round(worseAverages.timer_skips * 10) / 10;
        baselineVal = Math.round(baseline.timer_skips * 10) / 10;
        unit = " skips/week";
      } else if (maxDeviation.metric === 'steps_skipped') {
        worseVal = Math.round(worseAverages.steps_skipped * 10) / 10;
        baselineVal = Math.round(baseline.steps_skipped * 10) / 10;
        unit = " skips/week";
      } else if (maxDeviation.metric === 'most_skipped_step') {
        const worseMostSkippedCount = worseMetrics
          .map(w => w.most_skipped_step)
          .filter(s => s !== null && s.stepId === worseMostSkipped?.stepId)
          .reduce((sum, s) => sum + (s?.count || 0), 0) / worseMetrics.length;
        const baselineMostSkippedCount = weeklyMetricsData
          .map(w => w.most_skipped_step)
          .filter(s => s !== null && s.stepId === worseMostSkipped?.stepId)
          .reduce((sum, s) => sum + (s?.count || 0), 0) / weeklyMetricsData.length;
        worseVal = Math.round(worseMostSkippedCount * 10) / 10;
        baselineVal = Math.round(baselineMostSkippedCount * 10) / 10;
        unit = " skips/week";
      }

      const stepName = maxDeviation.metric === 'most_skipped_step' ? worseMostSkipped?.stepName : undefined;

      whatsHurting = {
        metric: maxDeviation.metric,
        sentence: template.getSentence(stepName),
        sentenceTemplatePrefix: template.sentenceTemplatePrefix,
        sentenceData: template.getSentenceData(stepName),
        sentenceTemplateSuffix: template.sentenceTemplateSuffix,
        advice: template.getAdvice(stepName),
        adviceTemplatePrefix: template.adviceTemplatePrefix,
        adviceData: template.getAdviceData(stepName),
        adviceTemplateSuffix: template.adviceTemplateSuffix,
        weekCount: worseWeeks.length,
        totalWeeks: weeksWithRatings.length,
        worseValue: worseVal,
        baselineValue: baselineVal,
        unit,
      };
    }
  }

  return {
    whatsWorking,
    whatsHurting,
    message: null,
  };
}

/**
 * Get monthly insights (last 30 days)
 */
export async function getMonthlyInsights(userId: string): Promise<MonthlyInsightsData> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    const routineStartTimes: any[] = data.routineStartTimes || [];
    const skinRatings: any[] = data.skinRatings || [];
    
    // Calculate date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    // Filter completions from last 30 days
    const last30DaysCompletions = completions.filter(c => {
      return c.date >= startDateStr && c.date <= endDateStr;
    });
    
    // Check if we have 4+ weeks of data (28+ days with any completion)
    const uniqueDays = new Set(last30DaysCompletions.map(c => c.date));
    const hasEnoughData = uniqueDays.size >= 28;
    
    // Calculate day patterns (hardest day and best day)
    const dayScores: Record<number, { total: number; count: number }> = {};
    
    // Calculate daily scores for each day in the last 30 days
    for (const completion of last30DaysCompletions) {
      const dayOfWeek = completion.day_of_week;
      const dailyScore = await calculateDailyScore(userId, completion.date);
      
      if (!dayScores[dayOfWeek]) {
        dayScores[dayOfWeek] = { total: 0, count: 0 };
      }
      dayScores[dayOfWeek].total += dailyScore;
      dayScores[dayOfWeek].count += 1;
    }
    
    // Calculate average percentage per day of week
    const dayPercentages: Array<{ day: string; percentage: number }> = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if (dayScores[dayOfWeek] && dayScores[dayOfWeek].count > 0) {
        const avgScore = dayScores[dayOfWeek].total / dayScores[dayOfWeek].count;
        const percentage = Math.round((avgScore / 10) * 100);
        dayPercentages.push({
          day: getDayName(dayOfWeek),
          percentage,
        });
      }
    }
    
    // Find hardest and best day
    let hardestDay: { day: string; percentage: number } | null = null;
    let bestDay: { day: string; percentage: number } | null = null;
    
    if (dayPercentages.length > 0) {
      hardestDay = dayPercentages.reduce((min, current) => 
        current.percentage < min.percentage ? current : min
      );
      bestDay = dayPercentages.reduce((max, current) => 
        current.percentage > max.percentage ? current : max
      );
    }
    
    // Calculate average start times for morning and evening routines
    // Convert each start time to minutes since midnight, calculate average, then convert back
    
    // Calculate average start time for morning routine
    const morningStartTimes: number[] = []; // minutes since midnight
    routineStartTimes.forEach((rt: any) => {
      if (rt.morning_start && rt.date >= startDateStr && rt.date <= endDateStr) {
        const startTime = new Date(rt.morning_start);
        const minutesSinceMidnight = startTime.getHours() * 60 + startTime.getMinutes();
        morningStartTimes.push(minutesSinceMidnight);
      }
    });
    
    // Calculate average start time for evening routine
    const eveningStartTimes: number[] = []; // minutes since midnight
    routineStartTimes.forEach((rt: any) => {
      if (rt.evening_start && rt.date >= startDateStr && rt.date <= endDateStr) {
        const startTime = new Date(rt.evening_start);
        const minutesSinceMidnight = startTime.getHours() * 60 + startTime.getMinutes();
        eveningStartTimes.push(minutesSinceMidnight);
      }
    });
    
    // Calculate average morning start time
    let morningAvgStartTime: { hour: number; minute: number } | null = null;
    if (morningStartTimes.length > 0) {
      const avgMinutes = Math.round(morningStartTimes.reduce((sum, m) => sum + m, 0) / morningStartTimes.length);
      morningAvgStartTime = {
        hour: Math.floor(avgMinutes / 60),
        minute: avgMinutes % 60,
      };
    }
    
    // Calculate average evening start time
    let eveningAvgStartTime: { hour: number; minute: number } | null = null;
    if (eveningStartTimes.length > 0) {
      const avgMinutes = Math.round(eveningStartTimes.reduce((sum, m) => sum + m, 0) / eveningStartTimes.length);
      eveningAvgStartTime = {
        hour: Math.floor(avgMinutes / 60),
        minute: avgMinutes % 60,
      };
    }
    
    // Get configured notification times
    const notificationPrefs = await getNotificationPreferences(userId);
    const morningNotifTime = notificationPrefs.morningTime || DEFAULT_MORNING_TIME;
    const eveningNotifTime = notificationPrefs.eveningTime || DEFAULT_EVENING_TIME;
    
    // Parse notification times
    const [morningNotifHour, morningNotifMin] = morningNotifTime.split(':').map(Number);
    const [eveningNotifHour, eveningNotifMin] = eveningNotifTime.split(':').map(Number);
    
    // Calculate discrepancies for morning
    let morningDiscrepancyMinutes: number | null = null;
    if (morningAvgStartTime) {
      const avgStartMinutes = morningAvgStartTime.hour * 60 + morningAvgStartTime.minute;
      const notifMinutes = morningNotifHour * 60 + morningNotifMin;
      morningDiscrepancyMinutes = Math.abs(avgStartMinutes - notifMinutes);
    }
    
    // Calculate discrepancies for evening
    // For evening routines, handle the case where start time might be early morning (next day)
    // If notification is in evening and start time is early morning, treat start time as next day
    let eveningDiscrepancyMinutes: number | null = null;
    if (eveningAvgStartTime) {
      let avgStartMinutes = eveningAvgStartTime.hour * 60 + eveningAvgStartTime.minute;
      const notifMinutes = eveningNotifHour * 60 + eveningNotifMin;
      
      // Calculate discrepancy assuming same day
      const sameDayDiscrepancy = Math.abs(avgStartMinutes - notifMinutes);
      
      // If start time is much earlier than notification (more than 12 hours difference),
      // or if notification is evening (after 6 PM) and start time is early morning (before 6 AM),
      // treat start time as next day
      const isEveningNotification = notifMinutes >= 18 * 60; // 6 PM or later
      const isEarlyMorningStart = avgStartMinutes < 6 * 60; // Before 6 AM
      
      if (sameDayDiscrepancy > 12 * 60 || (isEveningNotification && isEarlyMorningStart)) {
        // Add 24 hours (1440 minutes) to start time to treat it as next day
        avgStartMinutes += 24 * 60;
        eveningDiscrepancyMinutes = Math.abs(avgStartMinutes - notifMinutes);
      } else {
        // Use same-day calculation
        eveningDiscrepancyMinutes = sameDayDiscrepancy;
      }
    }
    
    // Calculate correlation insights
    const signupDate = data.signupDate || data.signup_date;
    const correlationInsights = signupDate 
      ? await calculateCorrelationInsights(userId, signupDate, skinRatings)
      : {
          whatsWorking: null,
          whatsHurting: null,
          message: null,
        };
    
    return {
      hardestDay,
      bestDay,
      notificationTiming: {
        morning: morningAvgStartTime !== null && morningDiscrepancyMinutes !== null
          ? {
              averageStartTime: morningAvgStartTime,
              configuredNotificationTime: { hour: morningNotifHour, minute: morningNotifMin },
              discrepancyMinutes: morningDiscrepancyMinutes,
            }
          : null,
        evening: eveningAvgStartTime !== null && eveningDiscrepancyMinutes !== null
          ? {
              averageStartTime: eveningAvgStartTime,
              configuredNotificationTime: { hour: eveningNotifHour, minute: eveningNotifMin },
              discrepancyMinutes: eveningDiscrepancyMinutes,
            }
          : null,
      },
      correlationInsights,
      hasEnoughData,
    };
  } catch (error) {
    console.error('Error getting monthly insights:', error);
    throw error;
  }
}


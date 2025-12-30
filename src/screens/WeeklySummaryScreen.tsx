/**
 * Weekly Summary Screen
 * 
 * Displays weekly consistency summary with breakdown (premium) or basic (free)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import { getWeeklySummary, WeeklySummaryData } from '../services/completionService';

export default function WeeklySummaryScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSummary();
    }
  }, [user]);

  const loadSummary = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getWeeklySummary(user.uid);
      setSummary(data);
    } catch (error) {
      console.error('Error loading weekly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>No summary data available.</Text>
      </View>
    );
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Calculate week-over-week change percentage
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Format change with arrow
  const formatChange = (current: number, previous: number): string => {
    const change = calculateChange(current, previous);
    if (change > 0) return `↑ ${change}%`;
    if (change < 0) return `↓ ${Math.abs(change)}%`;
    return '→ 0%';
  };

  // Render progress bar (converts score 0.0-10.0 to percentage 0-100 for display)
  const renderProgressBar = (score: number) => {
    const percentage = (score / 10.0) * 100;
    const filledWidth = Math.min(100, Math.max(0, percentage));
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFilled, { width: `${filledWidth}%` }]} />
        </View>
      </View>
    );
  };


  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + spacing.lg }
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Progress this week</Text>
        <Text style={styles.dateRange}>
          {formatDate(summary.weekStart)} - {formatDate(summary.weekEnd)}
        </Text>
      </View>

      {/* Overall Consistency */}
      <View style={styles.consistencyCard}>
        <Text style={styles.consistencyLabel}>Consistency Score</Text>
        <Text style={styles.consistencyScore}>
          {summary.overallConsistency.toFixed(1)} / 10
        </Text>
        <Text style={styles.consistencySubtext}>
          {summary.daysCompleted} of 7 days
        </Text>
      </View>

      {/* Free Version - Premium CTA */}
      {!isPremium && (
        <TouchableOpacity
          style={styles.premiumCTA}
          onPress={() => navigation.navigate('PremiumInsight')}
        >
          <View style={styles.premiumCTAContent}>
            <Text style={styles.premiumCTATitle}>More Insight</Text>
            <Text style={styles.premiumCTASubtitle}>
              In-depth analytics for each week and month
            </Text>
            <View style={styles.premiumCTAButton}>
              <Text style={styles.premiumCTAButtonText}>See Detailed Insight</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Premium Breakdown - Show for premium users */}
      {isPremium && (
        <>
          {/* Breakdown by Routine Type with Progress Bars */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This Week: {summary.overallConsistency.toFixed(1)} / 10</Text>
            
            {/* Morning */}
            <View style={styles.breakdownRowItem}>
              <View style={styles.breakdownRowHeader}>
                <Text style={styles.breakdownLabel}>Morning</Text>
                <View style={styles.breakdownValueContainer}>
                  <Text style={styles.breakdownValue}>{summary.breakdown.morning.toFixed(1)}</Text>
                  {summary.breakdownPreviousWeek && (
                    <Text style={styles.breakdownChange}>
                      {formatChange(summary.breakdown.morning, summary.breakdownPreviousWeek.morning)}
                    </Text>
                  )}
                </View>
              </View>
              {renderProgressBar(summary.breakdown.morning)}
            </View>

            {/* Evening */}
            <View style={styles.breakdownRowItem}>
              <View style={styles.breakdownRowHeader}>
                <Text style={styles.breakdownLabel}>Evening</Text>
                <View style={styles.breakdownValueContainer}>
                  <Text style={styles.breakdownValue}>{summary.breakdown.evening.toFixed(1)}</Text>
                  {summary.breakdownPreviousWeek && (
                    <Text style={styles.breakdownChange}>
                      {formatChange(summary.breakdown.evening, summary.breakdownPreviousWeek.evening)}
                    </Text>
                  )}
                </View>
              </View>
              {renderProgressBar(summary.breakdown.evening)}
            </View>

            {/* Exercises */}
            <View style={styles.breakdownRowItem}>
              <View style={styles.breakdownRowHeader}>
                <Text style={styles.breakdownLabel}>Exercises</Text>
                <View style={styles.breakdownValueContainer}>
                  <Text style={styles.breakdownValue}>{summary.breakdown.exercises.toFixed(1)}</Text>
                  {summary.breakdownPreviousWeek && (
                    <Text style={styles.breakdownChange}>
                      {formatChange(summary.breakdown.exercises, summary.breakdownPreviousWeek.exercises)}
                    </Text>
                  )}
                </View>
              </View>
              {renderProgressBar(summary.breakdown.exercises)}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Timer Skips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timer skips: {summary.timerSkips} this week</Text>
            <Text style={styles.timerSkipSubtext}>Products need time to work.</Text>
          </View>

          {/* Most Skipped Step */}
          {summary.mostSkippedStep && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Most skipped step: {summary.mostSkippedStep.stepName} ({summary.mostSkippedStep.count}x)
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Streaks */}
          <View style={styles.section}>
            <View style={styles.streakRow}>
              <View style={styles.streakItem}>
                <Text style={styles.streakLabel}>Current streak</Text>
                <Text style={styles.streakValue}>{summary.currentStreak}</Text>
                <Text style={styles.streakSubtext}>days</Text>
              </View>
              <View style={styles.streakItem}>
                <Text style={styles.streakLabel}>Best streak</Text>
                <Text style={styles.streakValue}>{summary.bestStreak}</Text>
                <Text style={styles.streakSubtext}>days</Text>
              </View>
            </View>
          </View>

        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  dateRange: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  consistencyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  consistencyLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  consistencyScore: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 48,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  consistencySubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
  },
  breakdownRowItem: {
    marginBottom: spacing.md,
  },
  breakdownRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  breakdownValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  breakdownChange: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  progressBarContainer: {
    marginTop: spacing.xs,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFilled: {
    height: '100%',
    backgroundColor: '#00cc00',
    borderRadius: 4,
  },
  timerSkipSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  premiumCTA: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  premiumCTAContent: {
    alignItems: 'center',
  },
  premiumCTATitle: {
    ...typography.headingSmall,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  premiumCTASubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  premiumCTAButton: {
    backgroundColor: colors.buttonAccent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 4,
    marginTop: spacing.sm,
  },
  premiumCTAButtonText: {
    ...typography.body,
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
  },
  streakLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  streakValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  streakSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  trendValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  trendArrow: {
    paddingHorizontal: spacing.md,
  },
  trendArrowText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 32,
    color: colors.text,
  },
  premiumPromptContainer: {
    marginBottom: spacing.lg,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

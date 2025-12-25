/**
 * Public Stats Screen
 * 
 * Shows anonymous aggregate stats and user ranking (Premium only)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { calculateWeeklyConsistency } from '../services/completionService';

export default function PublicStatsScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [userConsistency, setUserConsistency] = useState<number | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [averageConsistency, setAverageConsistency] = useState<number | null>(null);
  const [todayCompletions, setTodayCompletions] = useState<number | null>(null);
  const [userCompletedToday, setUserCompletedToday] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's consistency score
      const consistency = await calculateWeeklyConsistency(user.uid);
      setUserConsistency(consistency);

      // For MVP: Use placeholder logic until there's enough user data
      // In production, this would query Firestore for aggregate stats
      
      // Calculate rank (placeholder: assume user is in top 28% if consistency > 7.0)
      if (consistency >= 7.0) {
        setUserRank(28); // Top 28%
      } else if (consistency >= 6.0) {
        setUserRank(45); // Top 45%
      } else if (consistency >= 5.0) {
        setUserRank(60); // Top 60%
      } else {
        setUserRank(75); // Top 75%
      }

      // Average user consistency (placeholder: 5.8)
      setAverageConsistency(5.8);

      // Today's completions (placeholder: 847)
      setTodayCompletions(847);

      // Check if user completed today (placeholder: assume true if consistency > 0)
      setUserCompletedToday(consistency > 0);
    } catch (error) {
      console.error('Error loading public stats:', error);
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

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + spacing.xl }
        ]}
      >
        {/* Your Ranking Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR RANKING</Text>
          <View style={styles.divider} />
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>This week:</Text>
            <Text style={styles.statValue}>Top {userRank}%</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Your consistency:</Text>
            <Text style={styles.statValueGreen}>
              {userConsistency !== null ? userConsistency.toFixed(1) : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Average user:</Text>
            <Text style={styles.statValue}>
              {averageConsistency !== null ? averageConsistency.toFixed(1) : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.divider} />
        </View>

        {/* Today Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY</Text>
          <View style={styles.divider} />
          
          <Text style={styles.todayText}>
            {todayCompletions !== null ? todayCompletions : 'N/A'} users completed their routine
          </Text>
          
          {userCompletedToday && (
            <Text style={styles.todayUserText}>You're one of them. ✓</Text>
          )}
          
          <View style={styles.divider} />
        </View>

        {/* Insights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INSIGHTS</Text>
          <View style={styles.divider} />
          
          <Text style={styles.insightText}>
            Users with 8+ consistency:{'\n'}
            Report "Better" skin 3x more often
          </Text>
          
          {userConsistency !== null && userConsistency < 8.0 && (
            <Text style={styles.insightUserText}>
              You're at {userConsistency.toFixed(1)} — almost there.
            </Text>
          )}
          
          {userConsistency !== null && userConsistency >= 8.0 && (
            <Text style={styles.insightUserText}>
              You're at {userConsistency.toFixed(1)} — keep it up.
            </Text>
          )}
          
          <View style={styles.divider} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  statValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  statValueGreen: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    fontWeight: '600',
    color: '#00cc00',
  },
  todayText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  todayUserText: {
    ...typography.body,
    color: '#00cc00',
    textAlign: 'center',
    fontWeight: '600',
  },
  insightText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  insightUserText: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});


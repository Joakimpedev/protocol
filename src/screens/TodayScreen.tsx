import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import { useDevMode } from '../contexts/DevModeContext';
import { loadUserRoutine, subscribeToUserRoutine, UserRoutineData } from '../services/routineService';
import { calculateWeeklyConsistency, calculateDailyScore, getTodayDateString } from '../services/completionService';
import { buildRoutineSections, formatDuration, RoutineSection } from '../services/routineBuilder';
import { getTodaySessionCompletions, SessionCompletion } from '../services/sessionService';
import {
  getCompletedExerciseCount,
  getTotalCompletableExerciseCount,
  getEstimatedTotalExerciseDuration,
} from '../services/exerciseService';
import { getUserPreferences } from '../services/userPreferencesService';
import { useResponsive, useDeviceDebugInfo } from '../utils/responsive';

// Adjust top padding here - increase this number to move content lower
const TOP_PADDING = 120;

export default function TodayScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { isDebugInfoEnabled } = useDevMode();
  const responsive = useResponsive();
  const debugInfo = useDeviceDebugInfo();
  const [routineData, setRoutineData] = useState<UserRoutineData | null>(null);
  const [sections, setSections] = useState<RoutineSection[]>([]);
  const [sessionCompletions, setSessionCompletions] = useState<SessionCompletion | null>(null);
  const [consistencyScore, setConsistencyScore] = useState<number>(0);
  const [todayScore, setTodayScore] = useState<number>(0);
  const [exerciseCompletionCount, setExerciseCompletionCount] = useState<number>(0);
  const [totalExercises, setTotalExercises] = useState<number>(0);
  const [estimatedExerciseDuration, setEstimatedExerciseDuration] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showGlobalComparison, setShowGlobalComparison] = useState(true);

  // Calculate ranking percentage based on consistency score
  // Gradual interpolation between key points:
  // 10.0 → 7%, 7.0 → 28%, 6.0 → 45%, 5.0 → 60%, 0.0 → 100%
  const calculateRankingPercentage = (consistency: number): number => {
    if (consistency >= 10.0) return 7;
    if (consistency <= 0) return 100;
    
    // Linear interpolation between key points
    if (consistency >= 7.0) {
      // Between 10.0 and 7.0: 7% to 28%
      const ratio = (10.0 - consistency) / (10.0 - 7.0);
      return Math.round(7 + ratio * (28 - 7));
    } else if (consistency >= 6.0) {
      // Between 7.0 and 6.0: 28% to 45%
      const ratio = (7.0 - consistency) / (7.0 - 6.0);
      return Math.round(28 + ratio * (45 - 28));
    } else if (consistency >= 5.0) {
      // Between 6.0 and 5.0: 45% to 60%
      const ratio = (6.0 - consistency) / (6.0 - 5.0);
      return Math.round(45 + ratio * (60 - 45));
    } else {
      // Between 5.0 and 0.0: 60% to 100%
      const ratio = (5.0 - consistency) / 5.0;
      return Math.round(60 + ratio * (100 - 60));
    }
  };

  // Get time-based greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 18) return 'Good afternoon.';
    return 'Good evening.';
  };

  // Load routine data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Subscribe to routine data
    const unsubscribe = subscribeToUserRoutine(user.uid, (data) => {
      setRoutineData(data);
      if (data) {
        const builtSections = buildRoutineSections(data);
        setSections(builtSections);
      }
    });

    // Load initial data
    const loadData = async () => {
      try {
        const today = getTodayDateString();
        const [routine, completions, consistency, todayScoreValue, exerciseCount, totalCount, exerciseDuration, preferences] = await Promise.all([
          loadUserRoutine(user.uid),
          getTodaySessionCompletions(user.uid),
          calculateWeeklyConsistency(user.uid),
          calculateDailyScore(user.uid, today),
          getCompletedExerciseCount(user.uid),
          Promise.resolve(getTotalCompletableExerciseCount()),
          Promise.resolve(getEstimatedTotalExerciseDuration()),
          getUserPreferences(user.uid),
        ]);

        if (routine) {
          setRoutineData(routine);
          const builtSections = buildRoutineSections(routine);
          setSections(builtSections);
        }
        setSessionCompletions(completions);
        setConsistencyScore(consistency);
        setTodayScore(todayScoreValue);
        setExerciseCompletionCount(exerciseCount);
        setTotalExercises(totalCount);
        setEstimatedExerciseDuration(exerciseDuration);
        setShowGlobalComparison(preferences.showGlobalComparison);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Refresh completions when returning from session
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (user) {
        const today = getTodayDateString();
        const [completions, consistency, todayScoreValue, exerciseCount, preferences] = await Promise.all([
          getTodaySessionCompletions(user.uid),
          calculateWeeklyConsistency(user.uid),
          calculateDailyScore(user.uid, today),
          getCompletedExerciseCount(user.uid),
          getUserPreferences(user.uid),
        ]);
        setSessionCompletions(completions);
        setConsistencyScore(consistency);
        setTodayScore(todayScoreValue);
        setExerciseCompletionCount(exerciseCount);
        setShowGlobalComparison(preferences.showGlobalComparison);
        
        // Check for re-engagement notifications
        const { checkAndSendReEngagement, checkAndRescheduleWeeklySummary } = require('../services/notificationService');
        checkAndSendReEngagement(user.uid).catch(console.error);
        checkAndRescheduleWeeklySummary(user.uid).catch(console.error);
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  const handleStartSession = (section: RoutineSection) => {
    navigation.navigate('Session', { section });
  };

  const handleExercisesPress = () => {
    navigation.navigate('ExerciseHub');
  };

  const renderSectionCard = (section: RoutineSection) => {
    const isCompleted = sessionCompletions?.[section.name] || false;
    const stepCount = section.steps.length;
    const durationText = formatDuration(section.estimatedDuration);

    return (
      <TouchableOpacity
        key={section.name}
        style={[styles.card, isCompleted && styles.cardCompleted, { padding: responsive.sz(16), minHeight: responsive.sz(90) }]}
        onPress={() => handleStartSession(section)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { fontSize: responsive.font(18) }]}>
            {section.name.charAt(0).toUpperCase() + section.name.slice(1)} Routine
          </Text>
          <View style={styles.cardRightSection}>
            <View style={styles.cardInfoInline}>
              <Text style={[styles.cardInfoText, { fontSize: responsive.font(14) }]}>
                {stepCount} {stepCount === 1 ? 'step' : 'steps'}
              </Text>
              <Text style={[styles.cardInfoText, { fontSize: responsive.font(14) }]}>•</Text>
              <Text style={[styles.cardInfoText, { fontSize: responsive.font(14) }]}>{durationText}</Text>
            </View>
            <View style={[styles.checkmarkContainer, { width: responsive.sz(24) }]}>
              {isCompleted && (
                <Text style={[styles.completedCheckmark, { fontSize: responsive.font(24) }]}>✓</Text>
              )}
            </View>
          </View>
        </View>

        {!isCompleted && (
          <TouchableOpacity
            style={[styles.startButton, { padding: responsive.sz(8) }]}
            onPress={() => handleStartSession(section)}
          >
            <Text style={[styles.startButtonText, { fontSize: responsive.font(16) }]}>Start</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={[styles.completedBadge, { padding: responsive.sz(16) }]}>
            <Text style={[styles.completedBadgeText, { fontSize: responsive.font(14) }]}>Completed</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  // Dynamic styles that respond to screen width (including iPad compat mode)
  const dynamicPadding = responsive.safeHorizontalPadding;

  if (!routineData || !routineData.routineStarted) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Today</Text>
        <Text style={styles.body}>Complete onboarding to start your routine.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Debug Info Banner - Only shown when enabled in dev mode */}
      {isDebugInfoEnabled && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>
            {debugInfo.deviceInfo} | Narrow: {responsive.isNarrow ? 'YES' : 'NO'} | Pad: {dynamicPadding}px | Scale: {Math.round(responsive.scaleFactor * 100)}%
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.settingsButton, 
          { 
            right: dynamicPadding,
            width: responsive.sz(36),
            height: responsive.sz(36),
            borderRadius: responsive.sz(18),
          }
        ]}
        onPress={() => navigation.navigate('Settings')}
      >
        <Image 
          source={require('../../assets/icons/gear.png')} 
          style={[styles.settingsButtonIcon, { width: responsive.sz(22), height: responsive.sz(22) }]}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingHorizontal: dynamicPadding }]}
      >
        <View style={[
          { 
            maxWidth: responsive.contentMaxWidth, 
            alignSelf: responsive.contentAlign,
            width: '100%',
          }
        ]}>
        <View style={styles.headerContainer}>
        <Text style={[styles.greeting, { fontSize: responsive.font(24) }]}>{getGreeting()}</Text>
        
        <View style={styles.consistencyContainer}>
          <View style={styles.scoreItem}>
            <Text style={[styles.consistencyScore, { fontSize: responsive.font(28) }]}>{todayScore.toFixed(1)}</Text>
            <Text style={[styles.consistencyLabel, { fontSize: responsive.font(14) }]}>today</Text>
          </View>
          <View style={[styles.scoreDivider, { height: responsive.sz(36) }]} />
          <View style={styles.scoreItem}>
            <Text style={[styles.consistencyScore, { fontSize: responsive.font(28) }]}>{consistencyScore.toFixed(1)}</Text>
            <Text style={[styles.consistencyLabel, { fontSize: responsive.font(14) }]}>this week</Text>
          </View>
        </View>

        {isPremium && showGlobalComparison && (
          <View style={styles.rankingContainer}>
            <Text style={styles.rankingText}>
              Top {calculateRankingPercentage(consistencyScore)}% this week, compared to other users.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {sections.length === 0 ? (
        <Text style={styles.emptyState}>No routine sections available.</Text>
      ) : (
        sections.map(renderSectionCard)
      )}

      {/* Exercises Hub Link */}
      <TouchableOpacity
        style={[styles.card, sessionCompletions?.exercises && styles.cardCompleted, { padding: responsive.sz(16), minHeight: responsive.sz(90) }]}
        onPress={handleExercisesPress}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { fontSize: responsive.font(18) }]}>Exercises</Text>
          <View style={styles.cardRightSection}>
            <View style={styles.cardInfoInline}>
              <Text style={[styles.cardInfoText, { fontSize: responsive.font(14) }]}>
                {totalExercises} {totalExercises === 1 ? 'task' : 'tasks'}
              </Text>
              <Text style={[styles.cardInfoText, { fontSize: responsive.font(14) }]}>•</Text>
              <Text style={[styles.cardInfoText, { fontSize: responsive.font(14) }]}>{formatDuration(estimatedExerciseDuration)}</Text>
            </View>
            <View style={[styles.checkmarkContainer, { width: responsive.sz(24) }]}>
              {sessionCompletions?.exercises ? (
                <Text style={[styles.completedCheckmark, { fontSize: responsive.font(24) }]}>✓</Text>
              ) : (
                <Text style={[styles.arrowText, { fontSize: responsive.font(24) }]}>→</Text>
              )}
            </View>
          </View>
        </View>

        {!sessionCompletions?.exercises && (
          <TouchableOpacity
            style={[styles.startButton, { padding: responsive.sz(8) }]}
            onPress={handleExercisesPress}
          >
            <Text style={[styles.startButtonText, { fontSize: responsive.font(16) }]}>Start</Text>
          </TouchableOpacity>
        )}

        {sessionCompletions?.exercises && (
          <View style={[styles.completedBadge, { padding: responsive.sz(16) }]}>
            <Text style={[styles.completedBadgeText, { fontSize: responsive.font(14) }]}>Completed</Text>
          </View>
        )}
      </TouchableOpacity>
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
  content: {
    paddingVertical: spacing.md,
    // paddingHorizontal is set dynamically based on screen width
  },
  debugBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ff0000',
    padding: spacing.xs,
    zIndex: 9999,
  },
  debugText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: MONOSPACE_FONT,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    // right is set dynamically to match content padding
    zIndex: 1000,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonIcon: {
    width: 24,
    height: 24,
    tintColor: colors.text,
  },
  headerContainer: {
    paddingTop: TOP_PADDING,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: {
    ...typography.heading,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  consistencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  scoreItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  scoreDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  consistencyScore: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  consistencyLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    minHeight: 90,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cardTitle: {
    fontFamily: MONOSPACE_FONT,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    minWidth: 100,
    // fontSize is set dynamically via inline style
  },
  cardRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  cardInfoInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  checkmarkContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCheckmark: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    color: colors.accent,
  },
  cardInfoText: {
    fontFamily: 'System',
    color: colors.textSecondary,
    marginRight: spacing.xs,
    // fontSize is set dynamically via inline style
  },
  startButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  startButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  completedBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  completedBadgeText: {
    fontFamily: 'System',
    color: colors.accent,
    fontWeight: '500',
    // fontSize is set dynamically via inline style
  },
  emptyState: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  arrowText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    color: colors.textSecondary,
  },
  rankingContainer: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceGreen,
    borderWidth: 1,
    borderColor: colors.borderGreen,
    borderRadius: 4,
  },
  rankingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});


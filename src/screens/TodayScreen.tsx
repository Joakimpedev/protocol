import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
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

const NOTIFICATIONS_REQUESTED_KEY = '@protocol_notifications_requested';

// Adjust top padding here - increase this number to move content lower
const TOP_PADDING = 120;

export default function TodayScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
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

  const isPro = theme.key === 'pro';

  // Calculate ranking percentage based on consistency score
  const calculateRankingPercentage = (consistency: number): number => {
    if (consistency >= 10.0) return 7;
    if (consistency <= 0) return 100;

    if (consistency >= 7.0) {
      const ratio = (10.0 - consistency) / (10.0 - 7.0);
      return Math.round(7 + ratio * (28 - 7));
    } else if (consistency >= 6.0) {
      const ratio = (7.0 - consistency) / (7.0 - 6.0);
      return Math.round(28 + ratio * (45 - 28));
    } else if (consistency >= 5.0) {
      const ratio = (6.0 - consistency) / (6.0 - 5.0);
      return Math.round(45 + ratio * (60 - 45));
    } else {
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

    const unsubscribe = subscribeToUserRoutine(user.uid, (data) => {
      setRoutineData(data);
      if (data) {
        const builtSections = buildRoutineSections(data);
        setSections(builtSections);
      }
    });

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

        try {
          const hasRequestedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_REQUESTED_KEY);
          if (!hasRequestedNotifications) {
            const { initializeUserNotifications } = require('../services/notificationService');
            await initializeUserNotifications(user.uid);
            await AsyncStorage.setItem(NOTIFICATIONS_REQUESTED_KEY, 'true');
          }
        } catch (error) {
          console.error('Error initializing notifications:', error);
        }

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
          isPro ? (
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.startButtonGradient, { padding: responsive.sz(8) }]}
            >
              <Text style={[styles.startButtonTextPro, { fontSize: responsive.font(16) }]}>Start</Text>
            </LinearGradient>
          ) : (
            <TouchableOpacity
              style={[styles.startButton, { padding: responsive.sz(8) }]}
              onPress={() => handleStartSession(section)}
            >
              <Text style={[styles.startButtonText, { fontSize: responsive.font(16) }]}>Start</Text>
            </TouchableOpacity>
          )
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
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

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
          isPro ? (
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.startButtonGradient, { padding: responsive.sz(8) }]}
            >
              <Text style={[styles.startButtonTextPro, { fontSize: responsive.font(16) }]}>Start</Text>
            </LinearGradient>
          ) : (
            <TouchableOpacity
              style={[styles.startButton, { padding: responsive.sz(8) }]}
              onPress={handleExercisesPress}
            >
              <Text style={[styles.startButtonText, { fontSize: responsive.font(16) }]}>Start</Text>
            </TouchableOpacity>
          )
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

function getStyles(theme: Theme) {
  const isPro = theme.key === 'pro';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingVertical: theme.spacing.md,
    },
    debugBanner: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#ff0000',
      padding: theme.spacing.xs,
      zIndex: 9999,
    },
    debugText: {
      color: '#ffffff',
      fontSize: 10,
      fontFamily: 'System',
    },
    settingsButton: {
      position: 'absolute',
      top: 60,
      zIndex: 1000,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsButtonIcon: {
      width: 24,
      height: 24,
      tintColor: theme.colors.text,
    },
    headerContainer: {
      paddingTop: TOP_PADDING,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    greeting: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    consistencyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    scoreItem: {
      alignItems: 'center',
      minWidth: 60,
    },
    scoreDivider: {
      width: 1,
      height: 36,
      backgroundColor: theme.colors.border,
    },
    consistencyScore: {
      fontFamily: isPro ? 'System' : undefined,
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    consistencyLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      minHeight: 90,
      ...theme.shadows.card,
    },
    cardCompleted: {
      opacity: 0.7,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    cardTitle: {
      ...theme.typography.headingSmall,
      flexShrink: 1,
      minWidth: 100,
    },
    cardRightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
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
      fontSize: 24,
      color: theme.colors.accent,
      fontWeight: '700',
    },
    cardInfoText: {
      fontFamily: 'System',
      color: theme.colors.textSecondary,
      marginRight: theme.spacing.xs,
    },
    startButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    startButtonGradient: {
      borderRadius: theme.borderRadius.pill,
      padding: theme.spacing.sm,
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    startButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    startButtonTextPro: {
      ...theme.typography.body,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    completedBadge: {
      backgroundColor: isPro ? 'rgba(168, 85, 247, 0.1)' : theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    completedBadgeText: {
      fontFamily: 'System',
      color: theme.colors.accent,
      fontWeight: '500',
    },
    emptyState: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
    },
    heading: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.md,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    arrowText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
    },
    rankingContainer: {
      marginTop: theme.spacing.md,
      padding: theme.spacing.sm,
      backgroundColor: isPro ? 'rgba(168, 85, 247, 0.08)' : '#171A17',
      borderWidth: 1,
      borderColor: isPro ? 'rgba(168, 85, 247, 0.2)' : '#0D360D',
      borderRadius: theme.borderRadius.md,
    },
    rankingText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
}

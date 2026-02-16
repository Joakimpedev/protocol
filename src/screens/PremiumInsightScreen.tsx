/**
 * Premium Insight Screen
 *
 * Displays detailed premium insights for weekly summary
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Switch, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import PaywallModal from '../components/PaywallModal';
import { getWeeklySummary, WeeklySummaryData } from '../services/completionService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getMonthlyInsights, MonthlyInsightsData } from '../services/monthlyInsightsService';
import {
  getHardestDayNotificationPreferences,
  updateHardestDayNotificationPreferences,
  scheduleHardestDayNotification
} from '../services/notificationService';
import MatrixRedactedText from '../components/MatrixRedactedText';

export default function PremiumInsightScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { user } = useAuth();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [monthlyInsights, setMonthlyInsights] = useState<MonthlyInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [productsInRoutine, setProductsInRoutine] = useState<number | null>(null);
  const [exercisesInRoutine, setExercisesInRoutine] = useState<number | null>(null);

  // Monthly skip data (last 30 days)
  const [monthlyProductSkips, setMonthlyProductSkips] = useState<number>(0);
  const [monthlyTimerSkips, setMonthlyTimerSkips] = useState<number>(0);
  const [monthlyExerciseEarlyEnds, setMonthlyExerciseEarlyEnds] = useState<number>(0);
  const [monthlySkippedProducts, setMonthlySkippedProducts] = useState<Array<{
    stepId: string;
    productName: string;
    count: number;
  }>>([]);

  // Hardest day notification state
  const [hardestDayNotificationEnabled, setHardestDayNotificationEnabled] = useState(false);
  const [hardestDayNotificationTime, setHardestDayNotificationTime] = useState('09:00');
  const [savedHardestDayNotificationTime, setSavedHardestDayNotificationTime] = useState('09:00');
  const [showHardestDayTimePicker, setShowHardestDayTimePicker] = useState(false);
  const [hardestDayTimeDate, setHardestDayTimeDate] = useState(new Date());
  const [savingNotification, setSavingNotification] = useState(false);

  useEffect(() => {
    if (user) {
      loadSummary();
      loadMonthlyInsights();
      loadHardestDayNotificationPreferences();
      loadTotalProducts();
      loadMonthlySkipData();
    }
  }, [user]);

  // Reload data when screen comes into focus (e.g., after completing exercises)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadSummary();
        loadMonthlyInsights();
        loadMonthlySkipData();
      }
    }, [user])
  );

  const loadMonthlySkipData = async () => {
    if (!user) return;

    try {
      const {
        getProductSkipCountLast30Days,
        getTimerSkipCountLast30Days,
        getExerciseEarlyEndCountLast30Days,
        getSkippedProductsWithCountsLast30Days,
      } = await import('../services/analyticsService');

      const [productSkips, timerSkips, exerciseEarlyEnds, skippedProducts] = await Promise.all([
        getProductSkipCountLast30Days(user.uid),
        getTimerSkipCountLast30Days(user.uid),
        getExerciseEarlyEndCountLast30Days(user.uid),
        getSkippedProductsWithCountsLast30Days(user.uid),
      ]);

      setMonthlyProductSkips(productSkips);
      setMonthlyTimerSkips(timerSkips);
      setMonthlyExerciseEarlyEnds(exerciseEarlyEnds);
      setMonthlySkippedProducts(skippedProducts);
    } catch (error) {
      console.error('Error loading monthly skip data:', error);
    }
  };


  const loadSummary = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getWeeklySummary(user.uid);
      console.log('Loaded weekly summary:', {
        overallConsistency: data.overallConsistency,
        breakdown: data.breakdown,
        daysCompleted: data.daysCompleted,
      });
      setSummary(data);
    } catch (error) {
      console.error('Error loading weekly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyInsights = async () => {
    if (!user) return;

    try {
      const insights = await getMonthlyInsights(user.uid);
      setMonthlyInsights(insights);
    } catch (error) {
      console.error('Error loading monthly insights:', error);
      // Set null to show N/A
      setMonthlyInsights(null);
    }
  };

  const loadHardestDayNotificationPreferences = async () => {
    if (!user) return;

    try {
      const prefs = await getHardestDayNotificationPreferences(user.uid);
      setHardestDayNotificationEnabled(prefs.enabled);
      setHardestDayNotificationTime(prefs.time);
      setSavedHardestDayNotificationTime(prefs.time);

      // Initialize date picker with saved time
      const [hours, minutes] = prefs.time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setHardestDayTimeDate(date);
    } catch (error) {
      console.error('Error loading hardest day notification preferences:', error);
    }
  };

  const loadTotalProducts = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const ingredientSelections = userData.ingredientSelections || [];
        // Count total products (ingredients) - all ingredients in their plan
        setTotalProducts(ingredientSelections.length);

        // Count products actually in the routine (not skipped)
        // Products with state='added' or 'active' are in the routine
        const productsInRoutine = ingredientSelections.filter(
          (ing: any) => ing.state === 'added' || ing.state === 'active'
        ).length;
        setProductsInRoutine(productsInRoutine);

        // Count exercises in the routine (not skipped)
        const exerciseSelections = userData.exerciseSelections || [];
        const exercisesInRoutine = exerciseSelections.filter(
          (ex: any) => ex.state === 'added' || ex.state === 'active'
        ).length;
        setExercisesInRoutine(exercisesInRoutine);
      }
    } catch (error) {
      console.error('Error loading total products:', error);
      // Fallback to estimate if we can't load
      setTotalProducts(6);
      setProductsInRoutine(6);
      setExercisesInRoutine(3); // Fallback estimate
    }
  };

  // Helper to convert time string (HH:MM) to Date
  const timeStringToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Helper to convert Date to time string (HH:MM)
  const dateToTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleHardestDayNotificationToggle = async (value: boolean) => {
    // If user is not premium, show paywall
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }

    setHardestDayNotificationEnabled(value);

    if (!user) return;

    // If disabling, save immediately and cancel notifications
    if (!value) {
      try {
        setSavingNotification(true);
        await updateHardestDayNotificationPreferences(user.uid, { enabled: false });
        await scheduleHardestDayNotification(user.uid);
      } catch (error) {
        console.error('Error updating hardest day notification:', error);
        Alert.alert('Error', 'Failed to update notification settings');
        setHardestDayNotificationEnabled(true); // Revert on error
      } finally {
        setSavingNotification(false);
      }
    }
    // If enabling, just update state - user needs to save with button
  };

  const handleHardestDayTimeChange = (date: Date) => {
    // Just update the local state - don't save yet
    const timeString = dateToTimeString(date);
    setHardestDayNotificationTime(timeString);
    setHardestDayTimeDate(date);
  };

  const handleHardestDayPickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowHardestDayTimePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      // Update local state - save button will commit
      handleHardestDayTimeChange(selectedDate);
      if (Platform.OS === 'android') {
        // Close picker on Android
        setShowHardestDayTimePicker(false);
      }
    } else if (event.type === 'dismissed') {
      // User cancelled - revert to saved time
      setHardestDayTimeDate(timeStringToDate(savedHardestDayNotificationTime));
      setHardestDayNotificationTime(savedHardestDayNotificationTime);
      setShowHardestDayTimePicker(false);
    }
  };

  const handleIOSConfirmHardestDayTime = () => {
    // Just close the picker, user will click Save button
    setShowHardestDayTimePicker(false);
  };

  const handleSaveHardestDayNotification = async () => {
    if (!user) return;

    if (!hardestDayNotificationEnabled) {
      return;
    }

    setSavingNotification(true);
    try {
      await updateHardestDayNotificationPreferences(user.uid, {
        enabled: true,
        time: hardestDayNotificationTime,
      });

      await scheduleHardestDayNotification(user.uid);

      setSavedHardestDayNotificationTime(hardestDayNotificationTime);
    } catch (error) {
      console.error('Error saving hardest day notification:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    } finally {
      setSavingNotification(false);
    }
  };

  // Check if there are unsaved changes (time changed or just enabled)
  const hasUnsavedChanges = hardestDayNotificationEnabled &&
    hardestDayNotificationTime !== savedHardestDayNotificationTime;

  const renderHardestDayTimePicker = () => {
    if (Platform.OS === 'ios') {
      // iOS shows inline picker
      if (showHardestDayTimePicker) {
        return (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={hardestDayTimeDate}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={handleHardestDayPickerChange}
              textColor={theme.colors.text}
              style={styles.picker}
            />
            <View style={styles.pickerActions}>
              <TouchableOpacity
                style={[styles.pickerButton, styles.cancelButton]}
                onPress={() => {
                  setHardestDayTimeDate(timeStringToDate(savedHardestDayNotificationTime));
                  setShowHardestDayTimePicker(false);
                }}
              >
                <Text style={styles.pickerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerButton, styles.saveButton]}
                onPress={handleIOSConfirmHardestDayTime}
                disabled={savingNotification}
              >
                <Text style={styles.pickerButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      return null;
    } else {
      // Android shows modal picker
      if (showHardestDayTimePicker) {
        return (
          <DateTimePicker
            value={hardestDayTimeDate}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleHardestDayPickerChange}
          />
        );
      }
      return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.text} />
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

  // Calculate week-over-week change percentage (between scores 0.0-10.0)
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

  const overallScore = summary.overallConsistency.toFixed(1); // Score from 0.0 to 10.0

  // Format time from hour and minute
  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  // Format discrepancy in hours and minutes
  const formatDiscrepancy = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins}m`;
    }
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  // Calculate percentage likelihood based on discrepancy
  // Max 37% for 4h (240 minutes) or more
  // Linear decrease from 4h to 0h 0m
  const calculatePercentage = (discrepancyMinutes: number): number => {
    const maxDiscrepancyMinutes = 4 * 60; // 4 hours = 240 minutes
    const maxPercentage = 37;

    if (discrepancyMinutes >= maxDiscrepancyMinutes) {
      return maxPercentage;
    }

    // Linear interpolation: (discrepancy / maxDiscrepancy) * maxPercentage
    const percentage = Math.round((discrepancyMinutes / maxDiscrepancyMinutes) * maxPercentage);
    return percentage;
  };

  // Calculate skip impact analytics
  const calculateSkipImpact = () => {
    if (!summary) return null;

    const currentScore = summary.overallConsistency;
    const totalSkips = (summary.productSkips || 0) + (summary.timerSkips || 0) + (summary.exerciseEarlyEnds || 0);

    // Estimate impact: each skip type has different weight
    // Product skips: most impactful (affects routine completeness)
    // Timer skips: medium impact (waiting time, but routine still done)
    // Exercise early ends: lower impact (partial credit)
    const productSkipImpact = (summary.productSkips || 0) * 0.8; // 0.8 points per skip
    const timerSkipImpact = (summary.timerSkips || 0) * 0.3; // 0.3 points per skip
    const exerciseEarlyEndImpact = (summary.exerciseEarlyEnds || 0) * 0.2; // 0.2 points per early end

    const totalImpact = productSkipImpact + timerSkipImpact + exerciseEarlyEndImpact;
    const potentialScore = Math.min(10.0, currentScore + totalImpact);
    const improvementPoints = potentialScore - currentScore;
    const improvementPercentage = currentScore > 0
      ? Math.round((improvementPoints / currentScore) * 100)
      : Math.round((improvementPoints / 10.0) * 100);

    // Find biggest opportunity
    let biggestOpportunity = null;
    let biggestImpact = 0;

    if (productSkipImpact > biggestImpact && (summary.productSkips || 0) > 0) {
      biggestImpact = productSkipImpact;
      biggestOpportunity = {
        type: 'products',
        count: summary.productSkips,
        impact: productSkipImpact,
        message: 'Complete all products',
      };
    }

    if (timerSkipImpact > biggestImpact && (summary.timerSkips || 0) > 0) {
      biggestImpact = timerSkipImpact;
      biggestOpportunity = {
        type: 'timers',
        count: summary.timerSkips,
        impact: timerSkipImpact,
        message: 'Complete waiting periods',
      };
    }

    if (exerciseEarlyEndImpact > biggestImpact && (summary.exerciseEarlyEnds || 0) > 0) {
      biggestImpact = exerciseEarlyEndImpact;
      biggestOpportunity = {
        type: 'exercises',
        count: summary.exerciseEarlyEnds,
        impact: exerciseEarlyEndImpact,
        message: 'Complete full exercise sessions',
      };
    }

    // Calculate skip rate (skips per day)
    const daysWithActivity = summary.daysCompleted || 1;
    const skipRate = totalSkips / daysWithActivity;

    return {
      currentScore,
      potentialScore,
      improvementPoints,
      improvementPercentage,
      totalSkips,
      skipRate,
      biggestOpportunity,
      productSkipImpact,
      timerSkipImpact,
      exerciseEarlyEndImpact,
    };
  };

  const skipImpact = calculateSkipImpact();

  // Calculate time saved vs effectiveness lost
  const calculateTimeVsEffectiveness = () => {
    if (!summary) return null;

    // Constants based on research/realistic estimates
    const AVERAGE_WAITING_TIME_SECONDS = 30; // 30 seconds wait time per product application
    const AVERAGE_PRODUCT_TIME_SECONDS = 45; // 45 seconds to apply a product
    const AVERAGE_EXERCISE_DURATION_MINUTES = 12; // Average exercise duration in minutes (based on guide_blocks: 5-20 min range)

    const productSkips = summary.productSkips || 0;
    const timerSkips = summary.timerSkips || 0;
    const exerciseEarlyEnds = summary.exerciseEarlyEnds || 0;
    const daysWithActivity = summary.daysCompleted || 1;

    // Get current day of week (Monday = 1, Tuesday = 2, ..., Sunday = 7)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysInWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday (0) to 7

    // Use actual total products from user's routine, or fallback to estimate
    const actualTotalProducts = totalProducts || 6; // Fallback to 6 if not loaded yet

    // Calculate time saved (convert seconds to minutes for display)
    const waitingTimeSavedSeconds = timerSkips * AVERAGE_WAITING_TIME_SECONDS;
    const productTimeSavedSeconds = productSkips * AVERAGE_PRODUCT_TIME_SECONDS;
    // For exercises ended early, estimate time saved as 50% of average duration (assuming they did half before ending)
    const exerciseTimeSavedMinutes = exerciseEarlyEnds * (AVERAGE_EXERCISE_DURATION_MINUTES * 0.5);
    const totalTimeSavedSeconds = waitingTimeSavedSeconds + productTimeSavedSeconds;
    const totalTimeSavedMinutes = (totalTimeSavedSeconds / 60) + exerciseTimeSavedMinutes;

    // Calculate effectiveness using Linear Accumulation model (from math AI)
    // Base effectiveness per application = 10 points, Boosted (with wait) = 14 points
    // Each skipped wait = you get 10 points instead of 14 points (lose 4 points per skip)
    // Waiting is a slight boost, so the impact should be modest compared to full product skips
    const BASE_POINTS_PER_APPLICATION = 10;
    const BOOSTED_POINTS_PER_APPLICATION = 14; // 40% boost from waiting (14 vs 10)

    // For products: Use products actually in the routine (not skipped entirely)
    const actualProductsInRoutine = productsInRoutine || actualTotalProducts; // Fallback to total if not loaded

    // Calculate waiting periods using actual products in routine x days in week (based on current day)
    // Max effectiveness lost for waiting = 30% (when all waiting periods are skipped)
    // Linear calculation: (timerSkips / totalPossibleWaitingOpportunities) x 30
    // Monday = 1 day, Tuesday = 2 days, ..., Sunday = 7 days
    const totalPossibleWaitingOpportunities = actualProductsInRoutine * daysInWeek;

    // Cap timerSkips to not exceed possible opportunities
    const actualTimerSkips = Math.min(timerSkips, totalPossibleWaitingOpportunities);

    // Calculate waiting effectiveness lost: (skipped / total) x 30%
    // Example: 2 skips out of 28 = (2/28) x 30 = 2.14%
    const waitingEffectivenessLost = totalPossibleWaitingOpportunities > 0
      ? (actualTimerSkips / totalPossibleWaitingOpportunities) * 30
      : 0;

    // For products: Use products actually in the routine (not skipped entirely)
    // productSkips from weekly summary = number of times products were skipped during the week

    // Calculate product applications for the week
    // Total possible applications = products in routine x 7 days (full week)
    const totalPossibleApplications = actualProductsInRoutine * 7;

    // Actual applications = total possible - productSkips (times products were skipped)
    const actualApplications = Math.max(0, totalPossibleApplications - productSkips);

    // Products contribute points when used (with proper waiting = 14 points per application)
    // Products that are skipped entirely (not in routine) = 0 points
    // Each application = 14 points (with proper waiting)
    const productPointsEarned = actualApplications * BOOSTED_POINTS_PER_APPLICATION;
    const productPointsIdeal = actualProductsInRoutine * 7 * BOOSTED_POINTS_PER_APPLICATION;
    const productEffectiveness = productPointsIdeal > 0
      ? (productPointsEarned / productPointsIdeal) * 100
      : 100;
    const productEffectivenessLost = 100 - productEffectiveness;

    // For exercises ended early: Calculate effectiveness lost
    // Max effectiveness lost for exercises = 50% (when all exercises are ended early in the week)
    // Linear calculation: (exerciseEarlyEnds / totalPossibleExerciseSessions) x 50
    // Get exercises in routine to calculate percentage impact
    const actualExercisesInRoutine = exercisesInRoutine || 3; // Fallback to 3 if not loaded
    // Monday = 1 day, Tuesday = 2 days, ..., Sunday = 7 days
    const totalPossibleExerciseSessions = actualExercisesInRoutine * daysInWeek;

    // Cap exerciseEarlyEnds to not exceed possible sessions
    const actualExerciseEarlyEnds = Math.min(exerciseEarlyEnds, totalPossibleExerciseSessions);

    // Calculate exercise effectiveness lost: (ended early / total) x 50%
    // Example: 3 exercises x 7 days = 21 sessions, if 2 ended early = (2/21) x 50 = 4.76%
    // If all 21 ended early = (21/21) x 50 = 50%
    const exerciseEffectivenessLost = totalPossibleExerciseSessions > 0
      ? (actualExerciseEarlyEnds / totalPossibleExerciseSessions) * 50
      : 0;

    // Total effectiveness lost: Simply add waiting periods skipped + exercises ended early percentages
    const totalEffectivenessLost = waitingEffectivenessLost + exerciseEffectivenessLost;

    // Project over a month (4 weeks) - use same weekly rate
    const monthlyTimeSavedMinutes = totalTimeSavedMinutes * 4;
    const monthlyEffectivenessLost = totalEffectivenessLost; // Same rate, not multiplied

    // Format time (handles both seconds and minutes)
    const formatTimeFn = (minutes: number) => {
      if (minutes < 1) {
        // If less than 1 minute, show seconds
        const seconds = Math.round(minutes * 60);
        return `${seconds}s`;
      }
      if (minutes < 60) {
        return `${Math.round(minutes)}m`;
      }
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (mins === 0) {
        return `${hours}h`;
      }
      return `${hours}h ${mins}m`;
    };

    // Format time from seconds to minutes and seconds (e.g., "2m 30s")
    const formatTimeFromSeconds = (totalSeconds: number) => {
      if (totalSeconds < 60) {
        return `${totalSeconds}s`;
      }
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (seconds === 0) {
        return `${minutes}m`;
      }
      return `${minutes}m ${seconds}s`;
    };

    return {
      formatTime: formatTimeFn,
      formatTimeFromSeconds,
      waitingTimeSaved: waitingTimeSavedSeconds / 60, // Convert to minutes for display
      productTimeSaved: productTimeSavedSeconds / 60, // Convert to minutes for display
      exerciseTimeSaved: exerciseTimeSavedMinutes, // Already in minutes
      totalTimeSavedMinutes,
      totalTimeSavedFormatted: formatTimeFn(totalTimeSavedMinutes),
      waitingEffectivenessLost,
      productEffectivenessLost,
      exerciseEffectivenessLost,
      totalEffectivenessLost,
      monthlyTimeSavedFormatted: formatTimeFn(monthlyTimeSavedMinutes),
      monthlyEffectivenessLost,
    };
  };

  const timeVsEffectiveness = calculateTimeVsEffectiveness();

  // Calculate time saved vs effectiveness lost (last 30 days)
  const calculateTimeVsEffectiveness30Days = () => {
    // Constants based on research/realistic estimates
    const AVERAGE_WAITING_TIME_SECONDS = 30; // 30 seconds wait time per product application
    const AVERAGE_PRODUCT_TIME_SECONDS = 45; // 45 seconds to apply a product
    const AVERAGE_EXERCISE_DURATION_MINUTES = 12; // Average exercise duration in minutes

    const productSkips = monthlyProductSkips || 0;
    const timerSkips = monthlyTimerSkips || 0;
    const exerciseEarlyEnds = monthlyExerciseEarlyEnds || 0;

    // Use actual total products from user's routine, or fallback to estimate
    const actualTotalProducts = totalProducts || 6;
    const actualProductsInRoutine = productsInRoutine || actualTotalProducts;
    const actualExercisesInRoutine = exercisesInRoutine || 3;

    // Calculate time saved (convert seconds to minutes for display)
    const waitingTimeSavedSeconds = timerSkips * AVERAGE_WAITING_TIME_SECONDS;
    const productTimeSavedSeconds = productSkips * AVERAGE_PRODUCT_TIME_SECONDS;
    // For exercises ended early, estimate time saved as 50% of average duration
    const exerciseTimeSavedMinutes = exerciseEarlyEnds * (AVERAGE_EXERCISE_DURATION_MINUTES * 0.5);
    const totalTimeSavedSeconds = waitingTimeSavedSeconds + productTimeSavedSeconds;
    const totalTimeSavedMinutes = (totalTimeSavedSeconds / 60) + exerciseTimeSavedMinutes;

    // Calculate effectiveness using Linear Accumulation model
    const BASE_POINTS_PER_APPLICATION = 10;
    const BOOSTED_POINTS_PER_APPLICATION = 14; // 40% boost from waiting (14 vs 10)

    // For 30 days: Calculate waiting periods using actual products in routine x 30 days
    const totalPossibleWaitingOpportunities = actualProductsInRoutine * 30;
    const actualTimerSkips = Math.min(timerSkips, totalPossibleWaitingOpportunities);

    // Calculate waiting effectiveness lost: (skipped / total) x 30%
    const waitingEffectivenessLost = totalPossibleWaitingOpportunities > 0
      ? (actualTimerSkips / totalPossibleWaitingOpportunities) * 30
      : 0;

    // Calculate product applications for 30 days
    const totalPossibleApplications = actualProductsInRoutine * 30;
    const actualApplications = Math.max(0, totalPossibleApplications - productSkips);

    const productPointsEarned = actualApplications * BOOSTED_POINTS_PER_APPLICATION;
    const productPointsIdeal = actualProductsInRoutine * 30 * BOOSTED_POINTS_PER_APPLICATION;
    const productEffectiveness = productPointsIdeal > 0
      ? (productPointsEarned / productPointsIdeal) * 100
      : 100;
    const productEffectivenessLost = 100 - productEffectiveness;

    // For exercises ended early: Calculate effectiveness lost for 30 days
    const totalPossibleExerciseSessions = actualExercisesInRoutine * 30;
    const actualExerciseEarlyEnds = Math.min(exerciseEarlyEnds, totalPossibleExerciseSessions);

    // Calculate exercise effectiveness lost: (ended early / total) x 50%
    const exerciseEffectivenessLost = totalPossibleExerciseSessions > 0
      ? (actualExerciseEarlyEnds / totalPossibleExerciseSessions) * 50
      : 0;

    // Total effectiveness lost
    const totalEffectivenessLost = waitingEffectivenessLost + exerciseEffectivenessLost;

    // Format time (handles both seconds and minutes)
    const formatTimeFn = (minutes: number) => {
      if (minutes < 1) {
        const seconds = Math.round(minutes * 60);
        return `${seconds}s`;
      }
      if (minutes < 60) {
        return `${Math.round(minutes)}m`;
      }
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (mins === 0) {
        return `${hours}h`;
      }
      return `${hours}h ${mins}m`;
    };

    return {
      formatTime: formatTimeFn,
      waitingTimeSaved: waitingTimeSavedSeconds / 60, // Convert to minutes for display
      productTimeSaved: productTimeSavedSeconds / 60, // Convert to minutes for display
      exerciseTimeSaved: exerciseTimeSavedMinutes, // Already in minutes
      totalTimeSavedMinutes,
      totalTimeSavedFormatted: formatTimeFn(totalTimeSavedMinutes),
      waitingEffectivenessLost,
      productEffectivenessLost,
      exerciseEffectivenessLost,
      totalEffectivenessLost,
    };
  };

  const timeVsEffectiveness30Days = calculateTimeVsEffectiveness30Days();

  // Render Weekly Summary
  const renderWeekly = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Detailed Insight</Text>
      </View>

      {/* Weekly Score Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Weekly Score: {overallScore}
        </Text>

        {/* Morning */}
        <View style={styles.breakdownRowItem}>
          <View style={styles.breakdownRowHeader}>
            <Text style={styles.breakdownLabel}>Morning:</Text>
            <View style={styles.breakdownValueContainer}>
              <MatrixRedactedText value={summary.breakdown.morning.toFixed(1)} style={styles.breakdownValueGreen} />
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
            <Text style={styles.breakdownLabel}>Evening:</Text>
            <View style={styles.breakdownValueContainer}>
              <MatrixRedactedText value={summary.breakdown.evening.toFixed(1)} style={styles.breakdownValueGreen} />
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
            <Text style={styles.breakdownLabel}>Exercises:</Text>
            <View style={styles.breakdownValueContainer}>
              <MatrixRedactedText value={summary.breakdown.exercises.toFixed(1)} style={styles.breakdownValueGreen} />
              {summary.breakdownPreviousWeek && (
                <Text style={styles.breakdownChange}>
                  {formatChange(summary.breakdown.exercises, summary.breakdownPreviousWeek.exercises)}
                </Text>
              )}
            </View>
          </View>
          {renderProgressBar(summary.breakdown.exercises)}
        </View>

        {/* Streaks */}
        <View style={styles.streakContainer}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Text style={styles.streakLabel}>Current streak</Text>
              <MatrixRedactedText value={summary.currentStreak} style={styles.streakValueGreen} />
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakItem}>
              <Text style={styles.streakLabel}>Best streak</Text>
              <MatrixRedactedText value={summary.bestStreak} style={styles.streakValueGreen} />
            </View>
          </View>
        </View>
      </View>

    </>
  );

  // Render Monthly Insights
  const renderMonthly = () => {
    if (loading) {
      return (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Monthly Insights</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.body}>Loading monthly insights...</Text>
          </View>
        </>
      );
    }

    return (
      <>
        <View style={styles.header}>
          <Text style={styles.title}>Monthly Insights</Text>
        </View>

        {/* What You Have Skipped (Last 30 Days) - FIRST SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you have skipped</Text>

          <View style={styles.skipRow}>
            <Text style={styles.skipLabel}>Products skipped:</Text>
            <MatrixRedactedText value={monthlyProductSkips} style={styles.skipValueGreen} />
          </View>

          {/* List of skipped products */}
          {monthlySkippedProducts && monthlySkippedProducts.length > 0 && (
            <View style={styles.skippedProductsList}>
              {monthlySkippedProducts.map((product, index) => (
                <View key={product.stepId} style={styles.skippedProductRow}>
                  <Text style={styles.skippedProductName}>{product.productName}</Text>
                  <MatrixRedactedText value={`${product.count}x`} style={styles.skippedProductCountGreen} />
                </View>
              ))}
            </View>
          )}

          <View style={styles.skipRow}>
            <Text style={styles.skipLabel}>Waiting skipped:</Text>
            <MatrixRedactedText value={monthlyTimerSkips} style={styles.skipValueGreen} />
          </View>

          {/* Timer skip insight */}
          {monthlyTimerSkips > 0 && (
            <Text style={styles.skipInsight}>
              Waiting periods (like after applying products) help products absorb properly.
              According to studies, skipping them reduces effectiveness by approximately 25-30%.
            </Text>
          )}

          <View style={styles.skipRow}>
            <Text style={styles.skipLabel}>Exercises ended early:</Text>
            <MatrixRedactedText value={monthlyExerciseEarlyEnds} style={styles.skipValueGreen} />
          </View>

          {/* Exercise early end insight */}
          {monthlyExerciseEarlyEnds > 0 && (
            <Text style={styles.skipInsight}>
              Completing full exercise sessions gives better results.
              Partial sessions still count, but full sessions maximize progress.
            </Text>
          )}
        </View>

        {/* Time vs Effectiveness (Last 30 Days) */}
        {timeVsEffectiveness30Days && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time vs Effectiveness</Text>

            <View style={styles.timeEffectivenessCard}>
              <View style={styles.timeEffectivenessSection}>
                <Text style={styles.timeEffectivenessSubtitle}>Time Saved</Text>
                <View style={styles.timeEffectivenessRow}>
                  <View style={styles.timeEffectivenessItem}>
                    <Text style={styles.timeEffectivenessLabel}>Total</Text>
                    <Text style={styles.timeEffectivenessValue}>
                      {timeVsEffectiveness30Days.totalTimeSavedFormatted}
                    </Text>
                  </View>
                </View>
                <View style={styles.timeEffectivenessBreakdown}>
                  <View style={styles.timeEffectivenessBreakdownRow}>
                    <Text style={styles.timeEffectivenessBreakdownLabel}>Products:</Text>
                    <Text style={styles.timeEffectivenessBreakdownValue}>
                      {timeVsEffectiveness30Days.formatTime(timeVsEffectiveness30Days.productTimeSaved)}
                    </Text>
                  </View>
                  <View style={styles.timeEffectivenessBreakdownRow}>
                    <Text style={styles.timeEffectivenessBreakdownLabel}>Waiting:</Text>
                    <Text style={styles.timeEffectivenessBreakdownValue}>
                      {timeVsEffectiveness30Days.formatTime(timeVsEffectiveness30Days.waitingTimeSaved)}
                    </Text>
                  </View>
                  <View style={styles.timeEffectivenessBreakdownRow}>
                    <Text style={styles.timeEffectivenessBreakdownLabel}>Exercises:</Text>
                    <Text style={styles.timeEffectivenessBreakdownValue}>
                      {timeVsEffectiveness30Days.formatTime(timeVsEffectiveness30Days.exerciseTimeSaved)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.timeEffectivenessSection, styles.timeEffectivenessSectionLast]}>
                <Text style={styles.timeEffectivenessSubtitle}>Effectiveness Lost</Text>
                <View style={styles.timeEffectivenessRow}>
                  <View style={styles.timeEffectivenessItem}>
                    <Text style={styles.timeEffectivenessLabel}>Total</Text>
                    <Text style={styles.timeEffectivenessValueLost}>
                      {timeVsEffectiveness30Days.totalEffectivenessLost.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.timeEffectivenessBreakdown}>
                  <View style={styles.timeEffectivenessBreakdownRow}>
                    <Text style={styles.timeEffectivenessBreakdownLabel}>Products:</Text>
                    <Text style={styles.timeEffectivenessBreakdownValueLost}>
                      {timeVsEffectiveness30Days.productEffectivenessLost.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.timeEffectivenessBreakdownRow}>
                    <Text style={styles.timeEffectivenessBreakdownLabel}>Waiting:</Text>
                    <Text style={styles.timeEffectivenessBreakdownValueLost}>
                      {timeVsEffectiveness30Days.waitingEffectivenessLost.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.timeEffectivenessBreakdownRow}>
                    <Text style={styles.timeEffectivenessBreakdownLabel}>Exercises:</Text>
                    <Text style={styles.timeEffectivenessBreakdownValueLost}>
                      {timeVsEffectiveness30Days.exerciseEffectivenessLost.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.timeEffectivenessInsight}>
                Skipping steps saves time but reduces effectiveness. Finding the right balance helps maintain consistency while maximizing results.
              </Text>
            </View>
          </View>
        )}

        {!monthlyInsights ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Patterns (last 30 days)</Text>
              <View style={styles.divider} />
              <View style={styles.patternRow}>
                <Text style={styles.patternLabel}>Hardest day:</Text>
                <Text style={styles.patternValue}>N/A</Text>
              </View>
              <View style={styles.patternRow}>
                <Text style={styles.patternLabel}>Best day:</Text>
                <Text style={styles.patternValue}>N/A</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification timing</Text>
              <View style={styles.timingSubsection}>
                <View style={styles.timingRow}>
                  <Text style={styles.timingLabel}>Typical morning routine start:</Text>
                  <Text style={styles.timingValue}>N/A</Text>
                </View>
              </View>
              <View style={styles.timingSubsection}>
                <View style={styles.timingRow}>
                  <Text style={styles.timingLabel}>Typical night routine start:</Text>
                  <Text style={styles.timingValue}>N/A</Text>
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skin Progress</Text>
              <Text style={styles.body}>N/A - No skin progress data available.</Text>
            </View>
          </>
        ) : (
          <>

        {/* Correlation Insights - What's Working and What's Hurting */}
        {/* For premium users: show message if less than 4 weeks */}
        {isPremium && monthlyInsights.correlationInsights.message ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Summary</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{monthlyInsights.correlationInsights.message}</Text>
            </View>
          </View>
        ) : (
          <>
            {/* What's Working Card - Always show for free users, show if data exists for premium */}
            {(isPremium ? monthlyInsights.correlationInsights.whatsWorking : true) && (
              <View style={[styles.section, styles.insightCard]}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>WHAT'S WORKING</Text>
                </View>
                {monthlyInsights.correlationInsights.whatsWorking ? (
                  <>
                    <Text style={styles.insightSentence}>
                      {monthlyInsights.correlationInsights.whatsWorking.sentenceTemplatePrefix}
                      <MatrixRedactedText
                        value={monthlyInsights.correlationInsights.whatsWorking.sentenceData}
                        inline={true}
                        fixedLength={8}
                        addLinebreak={true}
                        style={isPremium ? undefined : styles.insightSentenceMatrix}
                      />
                      {monthlyInsights.correlationInsights.whatsWorking.sentenceTemplateSuffix}
                    </Text>
                    <Text style={styles.insightWeekCount}>
                      → {monthlyInsights.correlationInsights.whatsWorking.weekCount}/{monthlyInsights.correlationInsights.whatsWorking.totalWeeks} weeks rated "Better" when taking weekly photo.
                    </Text>
                    <Text style={styles.insightAction}>
                      {monthlyInsights.correlationInsights.whatsWorking.adviceTemplatePrefix}
                      <MatrixRedactedText
                        value={monthlyInsights.correlationInsights.whatsWorking.adviceData}
                        inline={true}
                        fixedLength={8}
                        addLinebreak={true}
                        style={isPremium ? undefined : styles.insightActionMatrix}
                      />
                      {monthlyInsights.correlationInsights.whatsWorking.adviceTemplateSuffix}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.insightSentence}>
                      On better weeks, you <MatrixRedactedText value="your consistency score was higher" inline={true} fixedLength={8} addLinebreak={true} style={styles.insightSentenceMatrix} />than on average.
                    </Text>
                    <Text style={styles.insightWeekCount}>
                      → 0/0 weeks rated "Better" when taking weekly photo.
                    </Text>
                    <Text style={styles.insightAction}>
                      When you <MatrixRedactedText value="are more consistent" inline={true} fixedLength={8} addLinebreak={true} style={styles.insightActionMatrix} />you see better results.
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* What's Hurting Card - Always show for free users, show if data exists for premium */}
            {(isPremium ? monthlyInsights.correlationInsights.whatsHurting : true) && (
              <View style={[styles.section, styles.insightCard, styles.insightCardHurting]}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>WHAT'S HURTING</Text>
                </View>
                {monthlyInsights.correlationInsights.whatsHurting ? (
                  <>
                    <Text style={styles.insightSentence}>
                      {monthlyInsights.correlationInsights.whatsHurting.sentenceTemplatePrefix}
                      <MatrixRedactedText
                        value={monthlyInsights.correlationInsights.whatsHurting.sentenceData}
                        inline={true}
                        fixedLength={8}
                        addLinebreak={true}
                        style={isPremium ? undefined : styles.insightSentenceMatrix}
                      />
                      {monthlyInsights.correlationInsights.whatsHurting.sentenceTemplateSuffix}
                    </Text>
                    <Text style={styles.insightWeekCount}>
                      → {monthlyInsights.correlationInsights.whatsHurting.weekCount}/{monthlyInsights.correlationInsights.whatsHurting.totalWeeks} weeks rated "Worse" when taking a weekly photo.
                    </Text>
                    <Text style={styles.insightAction}>
                      {monthlyInsights.correlationInsights.whatsHurting.adviceTemplatePrefix}
                      <MatrixRedactedText
                        value={monthlyInsights.correlationInsights.whatsHurting.adviceData}
                        inline={true}
                        fixedLength={8}
                        addLinebreak={true}
                        style={isPremium ? undefined : styles.insightActionMatrix}
                      />
                      {monthlyInsights.correlationInsights.whatsHurting.adviceTemplateSuffix}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.insightSentence}>
                      On worse weeks, you <MatrixRedactedText value="your consistency score was lower" inline={true} fixedLength={8} addLinebreak={true} style={styles.insightSentenceMatrix} />than on average.
                    </Text>
                    <Text style={styles.insightWeekCount}>
                      → 0/0 weeks rated "Worse" when taking a weekly photo.
                    </Text>
                    <Text style={styles.insightAction}>
                      When you <MatrixRedactedText value="are not consistent" inline={true} fixedLength={8} addLinebreak={true} style={styles.insightActionMatrix} />you see worse results.
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* No insights message - Only for premium users when no data */}
            {isPremium &&
             !monthlyInsights.correlationInsights.whatsWorking &&
             !monthlyInsights.correlationInsights.whatsHurting &&
             !monthlyInsights.correlationInsights.message && (
              <View style={styles.section}>
                <Text style={styles.body}>Not enough data to show insights yet.</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.divider} />

        {/* Hardest Day and Best Day */}
        <View style={styles.section}>
          {monthlyInsights.hardestDay ? (
            <View style={styles.patternRow}>
              <Text style={styles.patternLabel}>Hardest day:</Text>
              <MatrixRedactedText
                value={`${monthlyInsights.hardestDay.day} (${monthlyInsights.hardestDay.percentage}%)`}
                style={styles.patternValueGreen}
              />
            </View>
          ) : (
            <View style={styles.patternRow}>
              <Text style={styles.patternLabel}>Hardest day:</Text>
              <Text style={styles.patternValue}>N/A</Text>
            </View>
          )}

          {monthlyInsights.bestDay ? (
            <View style={styles.patternRow}>
              <Text style={styles.patternLabel}>Best day:</Text>
              <MatrixRedactedText
                value={`${monthlyInsights.bestDay.day} (${monthlyInsights.bestDay.percentage}%)`}
                style={styles.patternValueGreen}
              />
            </View>
          ) : (
            <View style={styles.patternRow}>
              <Text style={styles.patternLabel}>Best day:</Text>
              <Text style={styles.patternValue}>N/A</Text>
            </View>
          )}

          {/* Extra notification on hardest day */}
          <View style={styles.divider} />
          <View style={styles.hardestDayNotificationRow}>
            <Text style={styles.patternLabel}>Extra notification on hardest day</Text>
            <Switch
              value={hardestDayNotificationEnabled}
              onValueChange={handleHardestDayNotificationToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.surface}
              ios_backgroundColor={theme.colors.border}
            />
          </View>

          {hardestDayNotificationEnabled && (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  setShowHardestDayTimePicker(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.settingLabel}>Notification time</Text>
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeDisplayText}>{hardestDayNotificationTime}</Text>
                  <Text style={styles.editHint}>Tap to change</Text>
                </View>
              </TouchableOpacity>
              {renderHardestDayTimePicker()}
              {hardestDayNotificationEnabled && (
                <TouchableOpacity
                  style={[styles.saveButtonStyle, (savingNotification || !hasUnsavedChanges) && styles.saveButtonDisabled]}
                  onPress={handleSaveHardestDayNotification}
                  disabled={savingNotification || !hasUnsavedChanges}
                >
                  <Text style={styles.saveButtonText}>
                    {savingNotification ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.divider} />

        {/* Notification Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification timing</Text>

          {/* Morning Routine */}
          {monthlyInsights.notificationTiming.morning ? (
            <View style={styles.timingSubsection}>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Typical morning routine start:</Text>
                <MatrixRedactedText
                  value={formatTime(
                    monthlyInsights.notificationTiming.morning.averageStartTime.hour,
                    monthlyInsights.notificationTiming.morning.averageStartTime.minute
                  )}
                  style={styles.timingValueGreen}
                />
              </View>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Configured notification time:</Text>
                <Text style={styles.timingValue}>
                  {formatTime(
                    monthlyInsights.notificationTiming.morning.configuredNotificationTime.hour,
                    monthlyInsights.notificationTiming.morning.configuredNotificationTime.minute
                  )}
                </Text>
              </View>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Discrepancy:</Text>
                <MatrixRedactedText
                  value={formatDiscrepancy(monthlyInsights.notificationTiming.morning.discrepancyMinutes)}
                  style={styles.timingValueGreen}
                />
              </View>
              {monthlyInsights.notificationTiming.morning.discrepancyMinutes > 0 && (
                <Text style={styles.percentageText}>
                  You are{' '}
                  <MatrixRedactedText
                    value={`${calculatePercentage(monthlyInsights.notificationTiming.morning.discrepancyMinutes)}%`}
                    inline={true}
                    fixedLength={3}
                    style={styles.percentageText}
                  />
                  {' '}more likely to stick to your routine if you properly adjust your notifications.
                </Text>
              )}
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.adjustButtonText}>Adjust morning notification time</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timingSubsection}>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Typical morning routine start:</Text>
                <Text style={styles.timingValue}>N/A</Text>
              </View>
            </View>
          )}

          {/* Evening Routine */}
          {monthlyInsights.notificationTiming.evening ? (
            <View style={[styles.timingSubsection, styles.timingSubsectionLast]}>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Typical night routine start:</Text>
                <MatrixRedactedText
                  value={formatTime(
                    monthlyInsights.notificationTiming.evening.averageStartTime.hour,
                    monthlyInsights.notificationTiming.evening.averageStartTime.minute
                  )}
                  style={styles.timingValueGreen}
                />
              </View>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Configured notification time:</Text>
                <Text style={styles.timingValue}>
                  {formatTime(
                    monthlyInsights.notificationTiming.evening.configuredNotificationTime.hour,
                    monthlyInsights.notificationTiming.evening.configuredNotificationTime.minute
                  )}
                </Text>
              </View>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Discrepancy:</Text>
                <MatrixRedactedText
                  value={formatDiscrepancy(monthlyInsights.notificationTiming.evening.discrepancyMinutes)}
                  style={styles.timingValueGreen}
                />
              </View>
              {monthlyInsights.notificationTiming.evening.discrepancyMinutes > 0 && (
                <Text style={styles.percentageText}>
                  You are{' '}
                  <MatrixRedactedText
                    value={`${calculatePercentage(monthlyInsights.notificationTiming.evening.discrepancyMinutes)}%`}
                    inline={true}
                    fixedLength={3}
                    style={styles.percentageText}
                  />
                  {' '}more likely to stick to your routine if you properly adjust your notifications.
                </Text>
              )}
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.adjustButtonText}>Adjust night notification time</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timingSubsection}>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Typical night routine start:</Text>
                <Text style={styles.timingValue}>N/A</Text>
              </View>
            </View>
          )}
        </View>

          </>
        )}

      </>
    );
  };

  return (
    <View style={styles.container}>
      {!isPremium && (
        <View style={styles.stickyHeader}>
          <TouchableOpacity
            style={styles.getFullProtocolButton}
            onPress={() => setShowPaywall(true)}
          >
            <Text style={styles.getFullProtocolText}>Get Full Protocol</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          !isPremium && styles.contentContainerWithStickyHeader
        ]}
      >
        {summary && renderWeekly()}
        {renderMonthly()}
      </ScrollView>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
      alignItems: 'center',
    },
    title: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    section: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.md,
    },
    breakdownRowItem: {
      marginBottom: theme.spacing.md,
    },
    breakdownRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    breakdownLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '500',
    },
    breakdownValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    breakdownValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    breakdownValueGreen: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      fontWeight: '600',
      color: '#00cc00',
    },
    breakdownChange: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    progressBarContainer: {
      marginTop: theme.spacing.xs,
    },
    progressBarBackground: {
      height: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    progressBarFilled: {
      height: '100%',
      backgroundColor: '#00cc00',
      borderRadius: theme.borderRadius.lg,
    },
    skipRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    skipLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '500',
    },
    skipValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    skipValueGreen: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      fontWeight: '600',
      color: '#00cc00',
    },
    skippedProductsList: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    skippedProductRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    skippedProductName: {
      ...theme.typography.body,
      color: theme.colors.text,
      flex: 1,
    },
    skippedProductCount: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    skippedProductCountGreen: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: '#00cc00',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.lg,
    },
    streakContainer: {
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    streakRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    streakItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    streakDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.md,
    },
    streakLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '500',
    },
    streakValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    streakValueGreen: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 20,
      fontWeight: '600',
      color: '#00cc00',
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    skipHint: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },
    opportunityCard: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: '#00cc00',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    opportunityTitle: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    opportunityScoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    opportunityScoreItem: {
      alignItems: 'center',
      flex: 1,
    },
    opportunityScoreLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    opportunityScoreValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
    },
    opportunityScoreValuePotential: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 24,
      fontWeight: '600',
      color: '#00cc00',
    },
    opportunityArrow: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 20,
      color: theme.colors.textSecondary,
      marginHorizontal: theme.spacing.md,
    },
    opportunityMessage: {
      ...theme.typography.body,
      color: theme.colors.text,
      lineHeight: 20,
    },
    opportunityHighlight: {
      fontFamily: theme.typography.heading.fontFamily,
      color: '#00cc00',
      fontWeight: '600',
    },
    biggestOpportunityCard: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    biggestOpportunityTitle: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    biggestOpportunityMessage: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    biggestOpportunityImpact: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    biggestOpportunityHighlight: {
      fontFamily: theme.typography.heading.fontFamily,
      color: '#00cc00',
      fontWeight: '600',
    },
    skipInsight: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    skipRateCard: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    skipRateLabel: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    skipRateValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      fontWeight: '600',
      color: '#00cc00',
      marginBottom: theme.spacing.xs,
    },
    skipRateInsight: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },
    mostSkippedCard: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    mostSkippedTitle: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    mostSkippedName: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    mostSkippedCount: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    mostSkippedCountValue: {
      fontFamily: theme.typography.heading.fontFamily,
      color: '#00cc00',
      fontWeight: '600',
    },
    mostSkippedInsight: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },
    timeEffectivenessCard: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    timeEffectivenessTitle: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    timeEffectivenessSection: {
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    timeEffectivenessSectionLast: {
      borderBottomWidth: 0,
      marginBottom: 0,
      paddingBottom: 0,
    },
    timeEffectivenessSubtitle: {
      ...theme.typography.bodySmall,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    timeEffectivenessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timeEffectivenessItem: {
      flex: 1,
      alignItems: 'center',
    },
    timeEffectivenessDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.md,
    },
    timeEffectivenessLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    timeEffectivenessValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      fontWeight: '600',
      color: '#00cc00',
    },
    timeEffectivenessValueLost: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      fontWeight: '600',
      color: '#cc0000',
    },
    timeEffectivenessBreakdown: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    timeEffectivenessBreakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    timeEffectivenessBreakdownLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.text,
      fontWeight: '500',
    },
    timeEffectivenessBreakdownValues: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    timeEffectivenessBreakdownValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 14,
      color: '#00cc00',
      fontWeight: '600',
    },
    timeEffectivenessBreakdownValueLost: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 14,
      color: '#cc0000',
      fontWeight: '600',
    },
    timeEffectivenessBreakdownSeparator: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginHorizontal: theme.spacing.xs,
    },
    timeEffectivenessInsight: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
    },
    patternRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    patternLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '500',
    },
    patternValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    patternValueGreen: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: '#00cc00',
    },
    timingSubsection: {
      marginBottom: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    timingSubsectionLast: {
      borderBottomWidth: 0,
      marginBottom: 0,
    },
    timingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    timingLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '500',
    },
    timingValue: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    timingValueGreen: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: '#00cc00',
    },
    percentageText: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      fontStyle: 'italic',
    },
    adjustButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      alignSelf: 'flex-start',
      marginTop: theme.spacing.xs,
    },
    adjustButtonText: {
      ...theme.typography.bodySmall,
      color: theme.colors.text,
      fontWeight: '500',
    },
    messageCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
    messageText: {
      ...theme.typography.body,
      color: theme.colors.text,
      textAlign: 'center',
    },
    insightCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: '#00cc00', // Green border for "working"
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
    insightCardHurting: {
      borderColor: '#cc0000', // Red/muted border for "hurting"
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    insightIcon: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 20,
      fontWeight: '600',
      color: '#00cc00', // Green checkmark
      marginRight: theme.spacing.sm,
    },
    insightIconHurting: {
      color: '#cc0000', // Red X
    },
    insightTitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.text,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    insightSentence: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      lineHeight: 22,
    },
    insightWeekCount: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      fontFamily: theme.typography.heading.fontFamily,
    },
    insightAction: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      marginTop: theme.spacing.sm,
    },
    insightSentenceMatrix: {
      fontFamily: theme.typography.heading.fontFamily,
      color: '#00cc00',
    },
    insightActionMatrix: {
      fontFamily: theme.typography.heading.fontFamily,
      color: '#00cc00',
    },
    hardestDayNotificationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    settingRow: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    settingLabel: {
      ...theme.typography.body,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    timeDisplay: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timeDisplayText: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
    },
    editHint: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
    },
    pickerContainer: {
      marginTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    picker: {
      width: '100%',
      height: 200,
    },
    pickerActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    pickerButton: {
      flex: 1,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    cancelButton: {
      backgroundColor: theme.colors.background,
    },
    saveButton: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.accent,
    },
    pickerButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    saveButtonStyle: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    stickyHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    getFullProtocolButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: 'transparent',
    },
    getFullProtocolText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    contentContainerWithStickyHeader: {
      paddingTop: theme.spacing.md * 2 + theme.spacing.sm * 2 + 24 + 1, // Account for sticky header: padding (top+bottom) + button padding (top+bottom) + text line height + border
    },
  });
}

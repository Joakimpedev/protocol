/**
 * Premium Insight Screen
 * 
 * Displays detailed premium insights for weekly summary
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Switch, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import PaywallModal from '../components/PaywallModal';
import { getWeeklySummary, WeeklySummaryData } from '../services/completionService';
import { getMonthlyInsights, MonthlyInsightsData } from '../services/monthlyInsightsService';
import { 
  getHardestDayNotificationPreferences, 
  updateHardestDayNotificationPreferences,
  scheduleHardestDayNotification 
} from '../services/notificationService';
import MatrixRedactedText from '../components/MatrixRedactedText';

export default function PremiumInsightScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [monthlyInsights, setMonthlyInsights] = useState<MonthlyInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  
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
              textColor={colors.text}
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

  // Render progress bar
  const renderProgressBar = (percentage: number) => {
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
              <MatrixRedactedText value={`${summary.breakdown.morning}%`} style={styles.breakdownValueGreen} />
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
              <MatrixRedactedText value={`${summary.breakdown.evening}%`} style={styles.breakdownValueGreen} />
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
              <MatrixRedactedText value={`${summary.breakdown.exercises}%`} style={styles.breakdownValueGreen} />
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

      <View style={styles.divider} />

      {/* What You Have Skipped */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What you have skipped</Text>
        
        <View style={styles.skipRow}>
          <Text style={styles.skipLabel}>Products skipped:</Text>
          <MatrixRedactedText value={summary.productSkips || 0} style={styles.skipValueGreen} />
        </View>

        {/* List of skipped products */}
        {summary.skippedProducts && summary.skippedProducts.length > 0 && (
          <View style={styles.skippedProductsList}>
            {summary.skippedProducts.map((product, index) => (
              <View key={product.stepId} style={styles.skippedProductRow}>
                <Text style={styles.skippedProductName}>{product.productName}</Text>
                <MatrixRedactedText value={`${product.count}x`} style={styles.skippedProductCountGreen} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.skipRow}>
          <Text style={styles.skipLabel}>Waiting skipped:</Text>
          <MatrixRedactedText value={summary.timerSkips} style={styles.skipValueGreen} />
        </View>

        <View style={styles.skipRow}>
          <Text style={styles.skipLabel}>Exercises ended early:</Text>
          <MatrixRedactedText value={summary.exerciseEarlyEnds || 0} style={styles.skipValueGreen} />
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

    if (!monthlyInsights) {
      return (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Monthly Insights</Text>
          </View>
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
      );
    }

    return (
      <>
        <View style={styles.header}>
          <Text style={styles.title}>Monthly Insights</Text>
        </View>

        {/* Correlation Insights - What's Working and What's Hurting */}
        {monthlyInsights.correlationInsights.message ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Summary</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{monthlyInsights.correlationInsights.message}</Text>
            </View>
          </View>
        ) : (
          <>
            {/* What's Working Card */}
            {monthlyInsights.correlationInsights.whatsWorking && (
              <View style={[styles.section, styles.insightCard]}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>WHAT'S WORKING</Text>
                </View>
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
              </View>
            )}

            {/* What's Hurting Card */}
            {monthlyInsights.correlationInsights.whatsHurting && (
              <View style={[styles.section, styles.insightCard, styles.insightCardHurting]}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>WHAT'S HURTING</Text>
                </View>
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
              </View>
            )}

            {/* No insights message */}
            {!monthlyInsights.correlationInsights.whatsWorking && 
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
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.border}
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
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.sm,
    textAlign: 'center',
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
  breakdownValueGreen: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    fontWeight: '600',
    color: '#00cc00',
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
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  skipLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  skipValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  skipValueGreen: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    fontWeight: '600',
    color: '#00cc00',
  },
  skippedProductsList: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skippedProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  skippedProductName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  skippedProductCount: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  skippedProductCountGreen: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: '#00cc00',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  streakContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  streakLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  streakValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  streakValueGreen: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 20,
    fontWeight: '600',
    color: '#00cc00',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  skipHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  patternLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  patternValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  patternValueGreen: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: '#00cc00',
  },
  timingSubsection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timingSubsectionLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timingLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  timingValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timingValueGreen: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: '#00cc00',
  },
  percentageText: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  adjustButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  adjustButtonText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#00cc00', // Green border for "working"
    borderRadius: 4,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  insightCardHurting: {
    borderColor: '#cc0000', // Red/muted border for "hurting"
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  insightIcon: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 20,
    fontWeight: '600',
    color: '#00cc00', // Green checkmark
    marginRight: spacing.sm,
  },
  insightIconHurting: {
    color: '#cc0000', // Red X
  },
  insightTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  insightSentence: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  insightWeekCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontFamily: MONOSPACE_FONT,
  },
  insightAction: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  insightSentenceMatrix: {
    fontFamily: MONOSPACE_FONT,
    color: '#00cc00',
  },
  insightActionMatrix: {
    fontFamily: MONOSPACE_FONT,
    color: '#00cc00',
  },
  hardestDayNotificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  settingRow: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeDisplayText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  editHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  pickerContainer: {
    marginTop: spacing.md,
    paddingBottom: spacing.md,
  },
  picker: {
    width: '100%',
    height: 200,
  },
  pickerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  pickerButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    backgroundColor: colors.background,
  },
  saveButton: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  pickerButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  saveButtonStyle: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  getFullProtocolButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.buttonAccent,
    borderRadius: 4,
    backgroundColor: colors.buttonAccent,
  },
  getFullProtocolText: {
    ...typography.body,
    fontWeight: '600',
    color: '#000000',
  },
  contentContainerWithStickyHeader: {
    paddingTop: spacing.md * 2 + spacing.sm * 2 + 24 + 1, // Account for sticky header: padding (top+bottom) + button padding (top+bottom) + text line height + border
  },
});


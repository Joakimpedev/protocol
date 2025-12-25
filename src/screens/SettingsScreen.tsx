import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import PaywallModal from '../components/PaywallModal';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  refreshNotifications,
  DEFAULT_MORNING_TIME,
  DEFAULT_EVENING_TIME,
} from '../services/notificationService';
import { resetTodayCompletions, resetSkipAnalytics } from '../services/completionService';
import { getUserPreferences, updateUserPreferences } from '../services/userPreferencesService';
import { setDevPremiumMode } from '../services/subscriptionService';

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { isPremium, subscriptionStatus, refreshSubscriptionStatus } = usePremium();
  const [morningTime, setMorningTime] = useState(DEFAULT_MORNING_TIME);
  const [eveningTime, setEveningTime] = useState(DEFAULT_EVENING_TIME);
  const [savedMorningTime, setSavedMorningTime] = useState(DEFAULT_MORNING_TIME);
  const [savedEveningTime, setSavedEveningTime] = useState(DEFAULT_EVENING_TIME);
  const [saving, setSaving] = useState(false);
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);
  const [morningDate, setMorningDate] = useState(new Date());
  const [eveningDate, setEveningDate] = useState(new Date());
  const [showPaywall, setShowPaywall] = useState(false);
  const [showGlobalComparison, setShowGlobalComparison] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);

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

  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const [notificationPrefs, userPrefs] = await Promise.all([
          getNotificationPreferences(user.uid),
          getUserPreferences(user.uid),
        ]);
        
        setMorningTime(notificationPrefs.morningTime);
        setEveningTime(notificationPrefs.eveningTime);
        setSavedMorningTime(notificationPrefs.morningTime);
        setSavedEveningTime(notificationPrefs.eveningTime);
        setMorningDate(timeStringToDate(notificationPrefs.morningTime));
        setEveningDate(timeStringToDate(notificationPrefs.eveningTime));
        
        setShowGlobalComparison(userPrefs.showGlobalComparison);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, [user]);

  const handleTimeChange = async (type: 'morning' | 'evening', date: Date) => {
    if (!user) return;

    const timeString = dateToTimeString(date);
    
    setSaving(true);
    try {
      await updateNotificationPreferences(user.uid, {
        [type === 'morning' ? 'morningTime' : 'eveningTime']: timeString,
      });
      
      // Refresh notifications with new times
      await refreshNotifications(user.uid);
      
      if (type === 'morning') {
        setMorningTime(timeString);
        setSavedMorningTime(timeString);
        setMorningDate(date);
      } else {
        setEveningTime(timeString);
        setSavedEveningTime(timeString);
        setEveningDate(date);
      }
    } catch (error) {
      console.error('Error updating notification time:', error);
      Alert.alert('Error', 'Failed to update notification time');
      // Revert on error
      if (type === 'morning') {
        setMorningDate(timeStringToDate(savedMorningTime));
      } else {
        setEveningDate(timeStringToDate(savedEveningTime));
      }
    } finally {
      setSaving(false);
      setShowMorningPicker(false);
      setShowEveningPicker(false);
    }
  };

  const handlePickerChange = (event: any, selectedDate: Date | undefined, type: 'morning' | 'evening') => {
    if (Platform.OS === 'android') {
      setShowMorningPicker(false);
      setShowEveningPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      if (Platform.OS === 'android') {
        // On Android, save immediately when time is selected
        handleTimeChange(type, selectedDate);
      } else {
        // On iOS, update the date state (will save when user confirms)
        if (type === 'morning') {
          setMorningDate(selectedDate);
        } else {
          setEveningDate(selectedDate);
        }
      }
    } else if (event.type === 'dismissed') {
      // User cancelled - revert to saved time
      if (type === 'morning') {
        setMorningDate(timeStringToDate(savedMorningTime));
      } else {
        setEveningDate(timeStringToDate(savedEveningTime));
      }
      setShowMorningPicker(false);
      setShowEveningPicker(false);
    }
  };

  const handleIOSConfirm = (type: 'morning' | 'evening') => {
    if (type === 'morning') {
      handleTimeChange('morning', morningDate);
    } else {
      handleTimeChange('evening', eveningDate);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleResetToday = () => {
    Alert.alert(
      'Reset Today',
      'This will reset all exercises and routines for today. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await resetTodayCompletions(user.uid);
              Alert.alert('Success', 'Today\'s completions have been reset. Please refresh the Today screen to see changes.');
            } catch (error: any) {
              console.error('Error resetting today:', error);
              Alert.alert('Error', error.message || 'Failed to reset today\'s completions');
            }
          },
        },
      ]
    );
  };

  const handleToggleDevPremium = async (value: boolean) => {
    if (!user) return;

    try {
      await setDevPremiumMode(user.uid, value);
      // Wait a moment for Firestore to update, then refresh subscription status
      await new Promise(resolve => setTimeout(resolve, 100));
      await refreshSubscriptionStatus();
    } catch (error: any) {
      console.error('Error toggling dev premium mode:', error);
      Alert.alert('Error', error.message || 'Failed to toggle premium mode');
      // Note: Switch will remain in its original state on error since we're not controlling it
    }
  };

  const handleResetSkipAnalytics = () => {
    Alert.alert(
      'Reset Skip Analytics',
      'This will clear all skip data (product skips, timer skips, exercises ended early). Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await resetSkipAnalytics(user.uid);
              Alert.alert('Success', 'Skip analytics data has been reset.');
            } catch (error: any) {
              console.error('Error resetting skip analytics:', error);
              Alert.alert('Error', error.message || 'Failed to reset skip analytics');
            }
          },
        },
      ]
    );
  };

  const handleGlobalComparisonToggle = async (value: boolean) => {
    if (!user) return;
    
    setShowGlobalComparison(value);
    setSavingPreferences(true);
    
    try {
      await updateUserPreferences(user.uid, { showGlobalComparison: value });
    } catch (error) {
      console.error('Error updating global comparison preference:', error);
      Alert.alert('Error', 'Failed to update preference');
      setShowGlobalComparison(!value); // Revert on error
    } finally {
      setSavingPreferences(false);
    }
  };

  const formatSubscriptionStatus = (): string => {
    if (!isPremium) {
      return 'Free';
    }

    if (subscriptionStatus.expirationDate) {
      const expiration = new Date(subscriptionStatus.expirationDate);
      const now = new Date();
      
      if (expiration < now) {
        return 'Expired';
      }
      
      if (subscriptionStatus.cancellationDate && !subscriptionStatus.willRenew) {
        return `Active until ${expiration.toLocaleDateString()}`;
      }
      
      return `Active - Renews ${expiration.toLocaleDateString()}`;
    }

    return 'Active';
  };

  const renderTimePicker = (type: 'morning' | 'evening') => {
    const showPicker = type === 'morning' ? showMorningPicker : showEveningPicker;
    const date = type === 'morning' ? morningDate : eveningDate;
    
    if (Platform.OS === 'ios') {
      // iOS shows inline picker
      if (showPicker) {
        return (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={date}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={(event, selectedDate) => handlePickerChange(event, selectedDate, type)}
              textColor={colors.text}
              style={styles.picker}
            />
            <View style={styles.pickerActions}>
              <TouchableOpacity
                style={[styles.pickerButton, styles.cancelButton]}
                onPress={() => {
                  if (type === 'morning') {
                    setMorningDate(timeStringToDate(savedMorningTime));
                    setShowMorningPicker(false);
                  } else {
                    setEveningDate(timeStringToDate(savedEveningTime));
                    setShowEveningPicker(false);
                  }
                }}
              >
                <Text style={styles.pickerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerButton, styles.saveButton]}
                onPress={() => handleIOSConfirm(type)}
                disabled={saving}
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
      if (showPicker) {
        return (
          <DateTimePicker
            value={date}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={(event, selectedDate) => handlePickerChange(event, selectedDate, type)}
          />
        );
      }
      return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      {/* Notification Times Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Times</Text>
        <Text style={styles.sectionDescription}>
          Set when you want to receive routine reminders
        </Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            setShowEveningPicker(false); // Close evening picker if open
            setShowMorningPicker(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.settingLabel}>Morning routine</Text>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeDisplayText}>{morningTime}</Text>
            <Text style={styles.editHint}>Tap to change</Text>
          </View>
        </TouchableOpacity>
        {renderTimePicker('morning')}

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            setShowMorningPicker(false); // Close morning picker if open
            setShowEveningPicker(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.settingLabel}>Evening routine</Text>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeDisplayText}>{eveningTime}</Text>
            <Text style={styles.editHint}>Tap to change</Text>
          </View>
        </TouchableOpacity>
        {renderTimePicker('evening')}
      </View>

      {/* Premium Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium Status</Text>
        <TouchableOpacity
          style={styles.premiumCard}
          onPress={() => !isPremium && setShowPaywall(true)}
          activeOpacity={isPremium ? 1 : 0.7}
          disabled={isPremium}
        >
          <Text style={styles.premiumStatus}>{formatSubscriptionStatus()}</Text>
          {!isPremium && (
            <Text style={styles.premiumDescription}>
              Tap to view premium features and upgrade.
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Full Protocol Section - Only for Premium Users */}
      {isPremium && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Protocol</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingRowContent}>
              <Text style={styles.settingLabel}>Show global comparison</Text>
              <Text style={styles.settingDescription}>
                Display your ranking percentage on the Today screen
              </Text>
            </View>
            <Switch
              value={showGlobalComparison}
              onValueChange={handleGlobalComparisonToggle}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.border}
              disabled={savingPreferences}
            />
          </View>
        </View>
      )}

      {/* Dev Tools Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dev Tools</Text>
        <Text style={styles.sectionDescription}>
          Development utilities for testing
        </Text>
        <View style={styles.settingRow}>
          <View style={styles.settingRowContent}>
            <Text style={styles.settingLabel}>Premium Mode (Dev)</Text>
            <Text style={styles.settingDescription}>
              Enable premium features for testing
            </Text>
          </View>
          <Switch
            value={isPremium}
            onValueChange={handleToggleDevPremium}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
          />
        </View>
        <TouchableOpacity
          style={styles.devButton}
          onPress={handleResetToday}
        >
          <Text style={styles.devButtonText}>Reset Today's Completions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.devButton}
          onPress={handleResetSkipAnalytics}
        >
          <Text style={styles.devButtonText}>Reset Skip Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Account Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {user?.email && (
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>{user.email}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={() => {
          setShowPaywall(false);
        }}
        title="Premium"
        subtitle="Unlock all features."
        showFeatures={true}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingSmall,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  settingRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRowContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  },
  settingLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  settingValue: {
    ...typography.body,
    color: colors.textSecondary,
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
  saveButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  pickerButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  premiumCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
  },
  premiumStatus: {
    ...typography.headingSmall,
    marginBottom: spacing.xs,
  },
  premiumDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  logoutButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.error,
  },
  devButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  devButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  devButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.warning,
  },
});


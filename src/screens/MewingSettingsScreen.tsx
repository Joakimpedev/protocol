import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { getExerciseById } from '../services/exerciseService';
import { getExercisePreferences, saveExercisePreferences, MewingSettings } from '../services/exerciseService';
import {
  requestNotificationPermissions,
  scheduleMewingNotifications,
  areNotificationsEnabled,
} from '../services/notificationService';

export default function MewingSettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [exercise, setExercise] = useState<any>(null);
  const [settings, setSettings] = useState<MewingSettings>({
    mode: 'interval',
    interval: {
      hours: 2,
      startTime: '09:00',
      endTime: '21:00',
    },
    customTimes: [],
    notificationText: 'Posture.',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const mewingExercise = getExerciseById('mewing');
        setExercise(mewingExercise);

        if (user) {
          const preferences = await getExercisePreferences(user.uid);
          if (preferences.mewing) {
            setSettings(preferences.mewing);
          }
        }
      } catch (error) {
        console.error('Error loading mewing settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    // Request notification permissions if not already granted
    const hasPermission = await areNotificationsEnabled();
    if (!hasPermission) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permission required', 'Notifications are required for mewing reminders.');
        return;
      }
    }

    setSaving(true);
    try {
      await saveExercisePreferences(user.uid, { mewing: settings });
      await scheduleMewingNotifications(settings);
      Alert.alert('Settings saved', 'Mewing reminders have been scheduled.');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving mewing settings:', error);
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const validateTime = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) return false;
    
    // Ensure format is HH:mm (2 digits for hour)
    const [hours, minutes] = time.split(':');
    return hours.length === 2 && minutes.length === 2;
  };

  const formatTimeInput = (text: string): string => {
    // Remove non-numeric characters except colon
    let cleaned = text.replace(/[^\d:]/g, '');
    
    // Limit length
    if (cleaned.length > 5) {
      cleaned = cleaned.substring(0, 5);
    }
    
    // Auto-format as user types
    if (cleaned.length === 2 && !cleaned.includes(':')) {
      cleaned = cleaned + ':';
    }
    
    return cleaned;
  };

  const handleAddCustomTime = () => {
    let timeString = customTimeInput.trim();
    
    // Ensure format is HH:mm
    if (timeString.length === 4 && !timeString.includes(':')) {
      timeString = timeString.substring(0, 2) + ':' + timeString.substring(2);
    }

    if (!validateTime(timeString)) {
      Alert.alert('Invalid time', 'Please enter time in HH:mm format (e.g., 09:00, 14:30)');
      return;
    }

    if (!settings.customTimes) {
      settings.customTimes = [];
    }

    if (settings.customTimes.includes(timeString)) {
      Alert.alert('Time already added', 'This time is already in your list.');
      return;
    }

    setSettings({
      ...settings,
      customTimes: [...settings.customTimes, timeString].sort(),
    });

    setCustomTimeInput('');
  };

  const handleRemoveCustomTime = (time: string) => {
    setSettings({
      ...settings,
      customTimes: settings.customTimes?.filter(t => t !== time) || [],
    });
  };


  if (loading || !exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{exercise.display_name}</Text>

      {/* Instructions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What it improves</Text>
        <Text style={styles.bodyText}>{exercise.what_it_improves}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.bodyText}>{exercise.instructions}</Text>
      </View>

      {/* Reminder Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminder Configuration</Text>
        <Text style={styles.explanationText}>
          We will send you notifications to remind you to maintain proper tongue posture throughout the day. Configure when and how often you want to be reminded.
        </Text>

        {/* Mode Selection */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              settings.mode === 'interval' && styles.modeButtonActive,
            ]}
            onPress={() => setSettings({ ...settings, mode: 'interval' })}
          >
            <Text
              style={[
                styles.modeButtonText,
                settings.mode === 'interval' && styles.modeButtonTextActive,
              ]}
            >
              Interval mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              settings.mode === 'custom' && styles.modeButtonActive,
            ]}
            onPress={() => setSettings({ ...settings, mode: 'custom' })}
          >
            <Text
              style={[
                styles.modeButtonText,
                settings.mode === 'custom' && styles.modeButtonTextActive,
              ]}
            >
              Custom times
            </Text>
          </TouchableOpacity>
        </View>

        {/* Interval Mode */}
        {settings.mode === 'interval' && (
          <View style={styles.intervalContainer}>
            <Text style={styles.label}>Every</Text>
            <View style={styles.intervalButtons}>
              {[1, 2, 3, 4].map(hours => (
                <TouchableOpacity
                  key={hours}
                  style={[
                    styles.intervalButton,
                    settings.interval?.hours === hours && styles.intervalButtonActive,
                  ]}
                  onPress={() =>
                    setSettings({
                      ...settings,
                      interval: {
                        ...settings.interval!,
                        hours,
                      },
                    })
                  }
                >
                  <Text
                    style={[
                      styles.intervalButtonText,
                      settings.interval?.hours === hours && styles.intervalButtonTextActive,
                    ]}
                  >
                    {hours} {hours === 1 ? 'hour' : 'hours'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.label}>Between</Text>
                <TextInput
                  style={styles.timeInput}
                  value={settings.interval?.startTime || '09:00'}
                  onChangeText={(text) => {
                    const formatted = formatTimeInput(text);
                    if (validateTime(formatted) || formatted === '' || formatted.length < 5) {
                      setSettings({
                        ...settings,
                        interval: {
                          ...settings.interval!,
                          startTime: formatted || '09:00',
                        },
                      });
                    }
                  }}
                  placeholder="09:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.timeInputContainer}>
                <Text style={styles.label}>And</Text>
                <TextInput
                  style={styles.timeInput}
                  value={settings.interval?.endTime || '21:00'}
                  onChangeText={(text) => {
                    const formatted = formatTimeInput(text);
                    if (validateTime(formatted) || formatted === '' || formatted.length < 5) {
                      setSettings({
                        ...settings,
                        interval: {
                          ...settings.interval!,
                          endTime: formatted || '21:00',
                        },
                      });
                    }
                  }}
                  placeholder="21:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>
          </View>
        )}

        {/* Custom Times Mode */}
        {settings.mode === 'custom' && (
          <View style={styles.customTimesContainer}>
            {settings.customTimes && settings.customTimes.length > 0 && (
              <View style={styles.customTimesList}>
                {settings.customTimes.map((time, index) => (
                  <View key={index} style={styles.customTimeItem}>
                    <Text style={styles.customTimeText}>{time}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleRemoveCustomTime(time)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.addTimeContainer}>
              <TextInput
                style={styles.timeInput}
                value={customTimeInput}
                onChangeText={(text) => {
                  const formatted = formatTimeInput(text);
                  setCustomTimeInput(formatted);
                }}
                placeholder="HH:mm (e.g., 09:00)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={5}
              />
              <TouchableOpacity
                style={styles.addTimeButton}
                onPress={handleAddCustomTime}
              >
                <Text style={styles.addTimeButtonText}>Add time</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Custom Notification Text */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Text</Text>
        <TextInput
          style={styles.textInput}
          value={settings.notificationText}
          onChangeText={text => setSettings({ ...settings, notificationText: text })}
          placeholder="Posture."
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.previewText}>
          Preview: "{settings.notificationText || 'Posture.'}"
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingSmall,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    lineHeight: 24,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeButton: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  modeButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  intervalContainer: {
    marginTop: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  intervalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  intervalButton: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  intervalButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  intervalButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  intervalButtonTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeInput: {
    ...typography.body,
    fontFamily: MONOSPACE_FONT,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  customTimesContainer: {
    marginTop: spacing.md,
  },
  customTimesList: {
    marginBottom: spacing.md,
  },
  customTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  customTimeText: {
    ...typography.body,
    fontFamily: MONOSPACE_FONT,
    color: colors.text,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteButtonText: {
    ...typography.bodySmall,
    color: colors.error,
    textDecorationLine: 'underline',
  },
  addTimeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  addTimeButton: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  addTimeButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  textInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  previewText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  explanationText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  saveButton: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
});


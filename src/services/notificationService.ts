/**
 * Notification Service
 * Handles scheduling and managing notifications for routines, exercises, photos, and re-engagement
 */

import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MewingSettings } from './exerciseService';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const ABANDONED_CART_KEY = '@protocol_abandoned_cart_fired';

// How many daily follow-up notifications to schedule after the initial 10-min one
const ABANDONED_CART_FOLLOWUP_DAYS = 7;

// Notification copy for the abandoned cart sequence
// Index 0 = the 10 min notification, index 1+ = daily follow-ups (cycles if > array length)
const ABANDONED_CART_MESSAGES = [
  {
    title: '🔥 40% OFF - ONE TIME OFFER',
    body: 'Your protocol is ready. Get 40% off LIFETIME access before this expires.',
  },
  {
    title: '⏳ Your 40% OFF is expiring',
    body: 'Your personalized protocol is waiting. Claim 40% off lifetime access now.',
  },
  {
    title: '🚀 Still thinking about it?',
    body: 'Your custom protocol won\'t last forever. Lock in 40% off lifetime access today.',
  },
  {
    title: '💎 Last chance: 40% OFF',
    body: 'Don\'t let your protocol slip away. 40% off lifetime — one-time deal.',
  },
  {
    title: '🔥 Your 40% OFF is still available',
    body: 'Most people see results in 2 weeks. Start today with 40% off lifetime.',
  },
  {
    title: '⚡ Don\'t miss out',
    body: 'Your personalized protocol is still waiting. 40% off lifetime — claim it now.',
  },
  {
    title: '🏆 Your glow-up is one tap away',
    body: 'Lock in 40% off lifetime access. Your protocol is ready to go.',
  },
  {
    title: '🔒 Final reminder: 40% OFF',
    body: 'This is your last reminder. Get lifetime access at 40% off before it\'s gone.',
  },
];

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Default notification times
export const DEFAULT_MORNING_TIME = '08:00'; // 8:00 AM
export const DEFAULT_EVENING_TIME = '21:00'; // 9:00 PM

// Stoic quotes for re-engagement notifications
const STOIC_QUOTES = {
  day3: [
    "We suffer more in imagination than reality. - Seneca. Ready to restart?",
    "It's not what happens to you, but how you react to it that matters. - Epictetus. Begin again.",
    "The impediment to action advances action. What stands in the way becomes the way. - Marcus Aurelius",
  ],
  day7: [
    "You've built nothing in a week. Start now.",
    "Progress requires consistency. Not perfection. Begin again.",
    "A week of inaction is a week wasted. Start today.",
  ],
};

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e5e5e5',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel notifications for a specific identifier prefix
 * Note: expo-notifications doesn't support wildcard cancellation, so we cancel all and reschedule others
 * For Mewing, we'll cancel all and reschedule only the new ones
 */
export async function cancelNotificationsByIdentifier(identifier: string): Promise<void> {
  // Get all scheduled notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  // Cancel all notifications that start with the identifier
  for (const notification of scheduled) {
    if (notification.identifier.startsWith(identifier)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Schedule Mewing notifications based on settings
 */
export async function scheduleMewingNotifications(
  settings: MewingSettings
): Promise<void> {
  // Cancel existing mewing notifications
  await cancelNotificationsByIdentifier('mewing');

  if (settings.mode === 'interval') {
    await scheduleIntervalNotifications(settings);
  } else if (settings.mode === 'custom') {
    await scheduleCustomTimeNotifications(settings);
  }
}

/**
 * Schedule interval-based notifications
 */
async function scheduleIntervalNotifications(settings: MewingSettings): Promise<void> {
  if (!settings.interval) return;

  const { hours, startTime, endTime } = settings.interval;
  const notificationText = settings.notificationText || 'Posture.';

  // Parse start and end times
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startDate = new Date();
  startDate.setHours(startHour, startMin, 0, 0);

  const endDate = new Date();
  endDate.setHours(endHour, endMin, 0, 0);

  // Calculate number of notifications
  const intervalMs = hours * 60 * 60 * 1000;
  const notifications: Notifications.NotificationRequestInput[] = [];

  let currentTime = new Date(startDate);
  let notificationIndex = 0;

  while (currentTime <= endDate) {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();

    notifications.push({
      identifier: `mewing-${notificationIndex}`,
      content: {
        title: 'Mewing',
        body: notificationText,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
    });

    currentTime = new Date(currentTime.getTime() + intervalMs);
    notificationIndex++;
  }

  // Schedule all notifications
  for (const notification of notifications) {
    await Notifications.scheduleNotificationAsync(notification);
  }
}

/**
 * Schedule custom time notifications
 */
async function scheduleCustomTimeNotifications(settings: MewingSettings): Promise<void> {
  if (!settings.customTimes || settings.customTimes.length === 0) return;

  const notificationText = settings.notificationText || 'Posture.';

  for (let i = 0; i < settings.customTimes.length; i++) {
    const time = settings.customTimes[i];
    const [hour, minute] = time.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      identifier: `mewing-custom-${i}`,
      content: {
        title: 'Mewing',
        body: notificationText,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
    });
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Get notification preferences from user document
 */
export async function getNotificationPreferences(userId: string): Promise<{
  morningTime: string;
  eveningTime: string;
}> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        morningTime: DEFAULT_MORNING_TIME,
        eveningTime: DEFAULT_EVENING_TIME,
      };
    }
    
    const data = userDoc.data();
    return {
      morningTime: data.notificationMorningTime || DEFAULT_MORNING_TIME,
      eveningTime: data.notificationEveningTime || DEFAULT_EVENING_TIME,
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      morningTime: DEFAULT_MORNING_TIME,
      eveningTime: DEFAULT_EVENING_TIME,
    };
  }
}

/**
 * Update notification preferences in Firestore
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: { morningTime?: string; eveningTime?: string }
): Promise<void> {
  try {
    const updates: any = {};
    if (preferences.morningTime) {
      updates.notificationMorningTime = preferences.morningTime;
    }
    if (preferences.eveningTime) {
      updates.notificationEveningTime = preferences.eveningTime;
    }
    
    await updateDoc(doc(db, 'users', userId), updates);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

/**
 * Schedule routine reminder notifications (morning and evening)
 */
export async function scheduleRoutineReminders(userId: string): Promise<void> {
  try {
    // Cancel existing routine reminders
    await cancelNotificationsByIdentifier('routine-morning');
    await cancelNotificationsByIdentifier('routine-evening');
    
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      return;
    }

    const preferences = await getNotificationPreferences(userId);
    
    // Parse morning time
    const [morningHour, morningMin] = preferences.morningTime.split(':').map(Number);
    
    // Parse evening time
    const [eveningHour, eveningMin] = preferences.eveningTime.split(':').map(Number);
    
    // Get routine data to calculate duration
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return;
    }
    
    const data = userDoc.data();
    
    // Use buildRoutineSections to properly calculate duration
    // Import at the top if needed, but for now we'll use a simpler approach
    // Calculate morning routine duration from sections
    let morningDurationMinutes = 5; // Default fallback
    
    try {
      const { buildRoutineSections } = require('./routineBuilder');
      const routineData = {
        routineStarted: data.routineStarted || false,
        ingredientSelections: data.ingredientSelections || [],
        exerciseSelections: data.exerciseSelections || [],
      };
      
      const sections = buildRoutineSections(routineData);
      const morningSection = sections.find((s: any) => s.name === 'morning');
      
      if (morningSection) {
        // Convert seconds to minutes (rounded)
        morningDurationMinutes = Math.round(morningSection.estimatedDuration / 60);
      }
    } catch (error) {
      // Fallback to simple calculation
      const morningIngredients = (data.ingredientSelections || []).filter(
        (ing: any) => ing.state === 'added' || ing.state === 'active'
      ).length;
      morningDurationMinutes = Math.max(5, Math.round(morningIngredients * 1.5));
    }
    
    // Schedule morning routine reminder
    await Notifications.scheduleNotificationAsync({
      identifier: 'routine-morning',
      content: {
        title: 'Morning routine',
        body: `Routine ready. ${morningDurationMinutes} minutes.`,
        sound: true,
        data: { type: 'routine-morning', screen: 'Today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: morningHour,
        minute: morningMin,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
    });
    
    // Schedule evening routine reminder
    await Notifications.scheduleNotificationAsync({
      identifier: 'routine-evening',
      content: {
        title: 'Evening routine',
        body: 'Routine ready.',
        sound: true,
        data: { type: 'routine-evening', screen: 'Today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: eveningHour,
        minute: eveningMin,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
    });
  } catch (error) {
    console.error('Error scheduling routine reminders:', error);
  }
}

/**
 * Schedule weekly photo reminder based on signup day
 */
export async function scheduleWeeklyPhotoReminder(userId: string): Promise<void> {
  try {
    // Cancel existing photo reminder
    await cancelNotificationsByIdentifier('weekly-photo');
    
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return;
    }
    
    const data = userDoc.data();
    const photoDay = data.photoDay; // e.g., "monday", "tuesday", etc.
    
    if (!photoDay) {
      return;
    }
    
    // Map day name to weekday number (expo-notifications expects 1-7: 1 = Sunday, 7 = Saturday)
    const dayMap: { [key: string]: number } = {
      'sunday': 1,
      'monday': 2,
      'tuesday': 3,
      'wednesday': 4,
      'thursday': 5,
      'friday': 6,
      'saturday': 7,
    };
    
    const weekday = dayMap[photoDay.toLowerCase()];
    if (weekday === undefined) {
      return;
    }
    
    // Schedule weekly notification (10 AM on the photo day)
    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly-photo',
      content: {
        title: 'Weekly photo',
        body: 'Same spot. Same lighting.',
        sound: true,
        data: { type: 'weekly-photo', screen: 'Progress' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: 10,
        minute: 0,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
    });
  } catch (error) {
    console.error('Error scheduling weekly photo reminder:', error);
  }
}

/**
 * Get last activity date from user's completion data
 */
async function getLastActivityDate(userId: string): Promise<Date | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    
    const data = userDoc.data();
    const completions = data.dailyCompletions || [];
    
    if (completions.length === 0) {
      // Check signup date as fallback
      if (data.signupDate) {
        return new Date(data.signupDate);
      }
      return null;
    }
    
    // Find the most recent completion date
    const dates = completions
      .filter((c: any) => c.allCompleted === true)
      .map((c: any) => new Date(c.date))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime());
    
    return dates.length > 0 ? dates[0] : null;
  } catch (error) {
    console.error('Error getting last activity date:', error);
    return null;
  }
}

/**
 * Calculate days since last activity
 */
function getDaysSinceActivity(lastActivityDate: Date | null): number {
  if (!lastActivityDate) {
    return 0;
  }
  
  const now = new Date();
  const diffTime = now.getTime() - lastActivityDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if re-engagement notification should be sent and send it immediately if needed
 * This is called when the app opens or when checking for inactivity
 */
export async function checkAndSendReEngagement(userId: string): Promise<void> {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return;
    }
    
    const data = userDoc.data();
    
    // Check if we've already sent Day 3 or Day 7 notifications
    const lastReengageSent = data.lastReengageNotificationDay || 0;
    
    const lastActivity = await getLastActivityDate(userId);
    const daysSinceActivity = getDaysSinceActivity(lastActivity);
    
    // Only send if we haven't sent this notification before and it's the right day
    if (daysSinceActivity === 3 && lastReengageSent < 3) {
      const quote = STOIC_QUOTES.day3[Math.floor(Math.random() * STOIC_QUOTES.day3.length)];
      
      // Send notification immediately
      await Notifications.scheduleNotificationAsync({
        identifier: `reengage-day3-${Date.now()}`,
        content: {
          title: 'Protocol',
          body: quote,
          sound: true,
          data: { type: 'reengage', screen: 'Today' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5, // Send in 5 seconds (small delay to ensure it goes through)
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
      });
      
      // Mark that we've sent Day 3 notification
      await updateDoc(doc(db, 'users', userId), {
        lastReengageNotificationDay: 3,
      });
    } else if (daysSinceActivity === 7 && lastReengageSent < 7) {
      const quote = STOIC_QUOTES.day7[Math.floor(Math.random() * STOIC_QUOTES.day7.length)];
      
      // Send notification immediately
      await Notifications.scheduleNotificationAsync({
        identifier: `reengage-day7-${Date.now()}`,
        content: {
          title: 'Protocol',
          body: quote,
          sound: true,
          data: { type: 'reengage', screen: 'Today' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5, // Send in 5 seconds
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
      });
      
      // Mark that we've sent Day 7 notification
      await updateDoc(doc(db, 'users', userId), {
        lastReengageNotificationDay: 7,
      });
    }
    
    // Reset re-engagement tracking if user becomes active again (days since activity < 3)
    if (daysSinceActivity < 3 && lastReengageSent > 0) {
      await updateDoc(doc(db, 'users', userId), {
        lastReengageNotificationDay: 0,
      });
    }
  } catch (error) {
    console.error('Error checking re-engagement:', error);
  }
}

/**
 * @deprecated Use checkAndSendReEngagement instead
 * Keep for backwards compatibility but redirects to new function
 */
export async function checkAndScheduleReEngagement(userId: string): Promise<void> {
  await checkAndSendReEngagement(userId);
}

/**
 * Get the end of the current week (Sunday) as a date
 * Week starts on Monday, ends on Sunday (based on completionService logic)
 */
function getWeekEndDate(): Date {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // Week ends on Sunday (day 0)
  // If today is Sunday, week ends today (or we're at the start of next week)
  // Otherwise, calculate days until next Sunday
  let daysUntilSunday;
  if (day === 0) {
    // If it's Sunday, schedule for next Sunday (end of this week if early, or next week)
    daysUntilSunday = 7;
  } else {
    daysUntilSunday = 7 - day;
  }
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + daysUntilSunday);
  weekEnd.setHours(23, 0, 0, 0); // 11 PM on Sunday
  return weekEnd;
}

/**
 * Schedule weekly summary notification for end of week
 * This schedules a notification for the end of the current week (Sunday 11 PM)
 * Should be rescheduled after notification fires or when app opens
 */
export async function scheduleWeeklySummaryNotification(userId: string): Promise<void> {
  try {
    // Cancel existing weekly summary
    await cancelNotificationsByIdentifier('weekly-summary');
    
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      return;
    }

    const weekEnd = getWeekEndDate();
    const now = new Date();
    
    // Only schedule if week end is in the future
    if (weekEnd.getTime() <= now.getTime()) {
      // If week has already ended, schedule for next week
      weekEnd.setDate(weekEnd.getDate() + 7);
    }
    
    // Calculate seconds until week end
    const secondsUntilWeekEnd = Math.floor((weekEnd.getTime() - now.getTime()) / 1000);
    
    // Only schedule if it's more than 1 hour away (avoid scheduling immediate notifications)
    if (secondsUntilWeekEnd < 3600) {
      return;
    }
    
    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly-summary',
      content: {
        title: 'Week complete',
        body: 'Your weekly summary is done. Let\'s see how you did.',
        sound: true,
        data: { type: 'weekly-summary', screen: 'Progress', summaryScreen: 'WeeklySummary' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilWeekEnd,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
    });
  } catch (error) {
    console.error('Error scheduling weekly summary notification:', error);
  }
}

/**
 * Check if weekly summary notification needs to be rescheduled
 * This should be called when app opens to ensure notification is always scheduled
 * Reschedules if no notification exists or if the week has ended
 */
export async function checkAndRescheduleWeeklySummary(userId: string): Promise<void> {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      return;
    }

    // Check if we have a scheduled weekly summary notification
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const hasWeeklySummary = scheduled.some(n => n.identifier === 'weekly-summary');
    
    // Get the week end date to check if we need to reschedule
    const weekEnd = getWeekEndDate();
    const now = new Date();
    
    // If no notification exists, or if the week has already ended, reschedule
    if (!hasWeeklySummary || weekEnd.getTime() <= now.getTime()) {
      await scheduleWeeklySummaryNotification(userId);
    }
  } catch (error) {
    console.error('Error checking weekly summary notification:', error);
  }
}

/**
 * Initialize all notifications for a user (called when routine starts)
 */
export async function initializeUserNotifications(userId: string): Promise<void> {
  try {
    const enabled = await requestNotificationPermissions();
    if (!enabled) {
      return;
    }
    
    // Schedule routine reminders
    await scheduleRoutineReminders(userId);
    
    // Schedule weekly photo reminder
    await scheduleWeeklyPhotoReminder(userId);
    
    // Schedule weekly summary notification
    await scheduleWeeklySummaryNotification(userId);
    
    // Note: Re-engagement is checked when app opens, not scheduled in advance
  } catch (error) {
    console.error('Error initializing user notifications:', error);
  }
}

/**
 * Refresh notification schedules (called when notification preferences change)
 */
export async function refreshNotifications(userId: string): Promise<void> {
  try {
    await scheduleRoutineReminders(userId);
    await scheduleWeeklyPhotoReminder(userId);
    await scheduleWeeklySummaryNotification(userId);
    await scheduleHardestDayNotification(userId);
  } catch (error) {
    console.error('Error refreshing notifications:', error);
  }
}

/**
 * Get hardest day notification preferences from user document
 */
export async function getHardestDayNotificationPreferences(userId: string): Promise<{
  enabled: boolean;
  time: string;
}> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        enabled: false,
        time: '09:00',
      };
    }
    
    const data = userDoc.data();
    return {
      enabled: data.hardestDayNotificationEnabled || false,
      time: data.hardestDayNotificationTime || '09:00',
    };
  } catch (error) {
    console.error('Error getting hardest day notification preferences:', error);
    return {
      enabled: false,
      time: '09:00',
    };
  }
}

/**
 * Update hardest day notification preferences in Firestore
 */
export async function updateHardestDayNotificationPreferences(
  userId: string,
  preferences: { enabled?: boolean; time?: string }
): Promise<void> {
  try {
    const updates: any = {};
    if (preferences.enabled !== undefined) {
      updates.hardestDayNotificationEnabled = preferences.enabled;
    }
    if (preferences.time) {
      updates.hardestDayNotificationTime = preferences.time;
    }
    
    await updateDoc(doc(db, 'users', userId), updates);
  } catch (error) {
    console.error('Error updating hardest day notification preferences:', error);
    throw error;
  }
}

// Notification messages for hardest day (rotate through variations)
const HARDEST_DAY_MESSAGES = [
  "This is your hardest day of the week. Get it done.",
  "Your toughest day is today. Show up.",
  "This day is your challenge. Complete it.",
  "Hardest day ahead. You've got this.",
];

/**
 * Schedule weekly notification for hardest day
 */
export async function scheduleHardestDayNotification(userId: string): Promise<void> {
  try {
    // Cancel existing hardest day notifications
    await cancelNotificationsByIdentifier('hardest-day');
    
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      return;
    }

    const preferences = await getHardestDayNotificationPreferences(userId);
    if (!preferences.enabled) {
      return;
    }

    // Get hardest day from monthly insights
    const { getMonthlyInsights } = require('./monthlyInsightsService');
    const insights = await getMonthlyInsights(userId);
    
    if (!insights.hardestDay) {
      return;
    }

    // Map day name to weekday number (expo-notifications expects 1-7: 1 = Sunday, 7 = Saturday)
    const dayMap: { [key: string]: number } = {
      'sunday': 1,
      'monday': 2,
      'tuesday': 3,
      'wednesday': 4,
      'thursday': 5,
      'friday': 6,
      'saturday': 7,
    };
    
    const weekday = dayMap[insights.hardestDay.day.toLowerCase()];
    if (weekday === undefined) {
      return;
    }

    // Parse notification time
    const [hour, minute] = preferences.time.split(':').map(Number);
    
    // Randomly select a message variation each time we schedule (provides variety over time)
    const messageIndex = Math.floor(Math.random() * HARDEST_DAY_MESSAGES.length);
    const message = HARDEST_DAY_MESSAGES[messageIndex];
    
    // Schedule weekly notification on hardest day
    await Notifications.scheduleNotificationAsync({
      identifier: 'hardest-day',
      content: {
        title: 'Protocol',
        body: message,
        sound: true,
        data: { type: 'hardest-day', screen: 'Today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
    });
  } catch (error) {
    console.error('Error scheduling hardest day notification:', error);
  }
}

/**
 * Notify friends when a user completes their routine
 * Called when user completes their full routine for the day
 * 
 * Uses Firestore to trigger notifications on friends' devices
 */
export async function notifyFriendsOfCompletion(userId: string): Promise<void> {
  try {
    console.log(`[notifyFriendsOfCompletion] Called for userId: ${userId}`);

    // Get user's info for notification
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.log(`User ${userId} document not found`);
      return;
    }
    const userData = userDoc.data();
    const userName = userData.displayName || userData.email || 'A friend';

    // Get all friends
    const friendsRef = collection(db, 'friendConnections');
    const q = query(
      friendsRef,
      where('userId', '==', userId),
      where('status', '==', 'accepted')
    );
    
    const querySnapshot = await getDocs(q);
    const friendIds: string[] = [];

    for (const docSnap of querySnapshot.docs) {
      const connection = docSnap.data();
      const friendId = connection.friendId;
      
      // Safety check: never include self in friend list
      if (friendId !== userId) {
        friendIds.push(friendId);
      } else {
        console.warn(`Found self-connection in friendConnections for userId: ${userId}`);
      }
    }

    if (friendIds.length === 0) {
      console.log(`No friends to notify for userId: ${userId}`);
      return;
    }

    console.log(`Notifying ${friendIds.length} friends about ${userName}'s completion (userId: ${userId})`);

    // Write completion event to Firestore for each friend
    // Friends' devices will listen to these and show local notifications
    const today = new Date().toISOString().split('T')[0];
    const completionRef = collection(db, 'friendCompletions');
    
    for (const friendId of friendIds) {
      try {
        // Safety check: never send notification to the person who completed
        if (friendId === userId) {
          console.warn(`Skipping notification to self (userId: ${userId})`);
          continue;
        }

        // Check if friend has muted this user
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (!friendDoc.exists()) {
          continue;
        }

        const friendData = friendDoc.data();
        const mutedFriends = friendData.mutedFriends || [];
        
        // Skip if friend has muted this user
        if (mutedFriends.includes(userId)) {
          console.log(`Friend ${friendId} has muted user ${userId}`);
          continue;
        }

        // Create a completion notification document
        // Friends will listen to these documents and show notifications
        const completionDocId = `${userId}_${friendId}_${today}`;
        await setDoc(doc(completionRef, completionDocId), {
          userId, // Person who completed
          friendId, // Person to notify
          userName,
          date: today,
          createdAt: new Date().toISOString(),
          notified: false, // Will be set to true when friend's device processes it
        }, { merge: true });
        
        console.log(`Created completion notification document for friend ${friendId}`);
      } catch (error) {
        console.error(`Error creating completion notification for friend ${friendId}:`, error);
        // Continue with other friends even if one fails
      }
    }
    
    console.log(`[notifyFriendsOfCompletion] Completed for userId: ${userId}`);
  } catch (error) {
    console.error('Error notifying friends of completion:', error);
  }
}

/**
 * Listen for friend completion notifications and show local notifications
 * Should be called when app starts or when user logs in
 */
export function listenForFriendCompletions(
  currentUserId: string,
  onNotification: (userName: string, friendId: string) => void
): () => void {
  console.log(`[listenForFriendCompletions] Setting up listener for userId: ${currentUserId}`);
  
  const completionRef = collection(db, 'friendCompletions');
  const q = query(
    completionRef,
    where('friendId', '==', currentUserId),
    where('notified', '==', false)
  );

  return onSnapshot(q, async (snapshot) => {
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const completionUserId = data.userId;
      const friendId = data.friendId;
      const userName = data.userName || 'A friend';
      
      // Safety check
      if (friendId !== currentUserId) {
        console.warn(`Completion notification friendId mismatch: expected ${currentUserId}, got ${friendId}`);
        continue;
      }
      
      if (completionUserId === currentUserId) {
        console.warn(`Skipping self-completion notification`);
        continue;
      }

      // Check if user has muted this friend
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const mutedFriends = userData.mutedFriends || [];
          if (mutedFriends.includes(completionUserId)) {
            console.log(`User has muted ${completionUserId}, skipping notification`);
            // Mark as notified anyway so we don't keep checking
            await updateDoc(doc(completionRef, docSnap.id), { notified: true });
            continue;
          }
        }
      } catch (error) {
        console.error('Error checking mute status:', error);
      }

      // Check if notifications are enabled
      const enabled = await areNotificationsEnabled();
      if (!enabled) {
        console.log('Notifications not enabled, skipping');
        // Mark as notified anyway
        await updateDoc(doc(completionRef, docSnap.id), { notified: true });
        continue;
      }

      // Show local notification
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `friend-completion-${completionUserId}-${currentUserId}-${Date.now()}`,
          content: {
            title: 'Friend completed routine',
            body: `${userName} completed their routine today.`,
            sound: true,
            data: { type: 'friend-completion', friendId: completionUserId, screen: 'Social' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            ...(Platform.OS === 'android' && { channelId: 'default' }),
          },
        });
        
        console.log(`Showed notification for ${userName}'s completion`);
        
        // Call callback if provided
        if (onNotification) {
          onNotification(userName, completionUserId);
        }
        
        // Mark as notified
        await updateDoc(doc(completionRef, docSnap.id), { notified: true });
      } catch (error) {
        console.error('Error showing friend completion notification:', error);
      }
    }
  }, (error) => {
    console.error('Error listening for friend completions:', error);
  });
}

/**
 * Schedule the full abandoned cart notification sequence in one batch.
 *
 * - Notification 0: fires after 10 minutes
 * - Notification 1: fires 24 h after the 10-min one (~24 h 10 min from now)
 * - Notification 2: fires 24 h after that (~48 h 10 min from now)
 * - ... up to ABANDONED_CART_FOLLOWUP_DAYS daily follow-ups
 *
 * All are scheduled upfront so they fire even if the user never opens the app.
 * One-time guard: once the batch is scheduled it won't re-schedule.
 * Cancelled on purchase via cancelAbandonedCartNotification().
 */
export async function scheduleAbandonedCartNotification(): Promise<void> {
  try {
    // One-time guard — don't re-schedule if already queued
    const alreadyScheduled = await AsyncStorage.getItem(ABANDONED_CART_KEY);
    if (alreadyScheduled === 'true') {
      console.log('[AbandonedCart] Already scheduled, skipping');
      return;
    }

    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      console.log('[AbandonedCart] Notifications not enabled, skipping');
      return;
    }

    // Mark as scheduled immediately
    await AsyncStorage.setItem(ABANDONED_CART_KEY, 'true');

    const TEN_MINUTES = 600;
    const TWENTY_FOUR_HOURS = 86400;

    // Schedule notification 0: 10 minutes from now
    const firstMessage = ABANDONED_CART_MESSAGES[0];
    await Notifications.scheduleNotificationAsync({
      identifier: 'abandoned-cart-0',
      content: {
        title: firstMessage.title,
        body: firstMessage.body,
        sound: true,
        data: { type: 'abandoned-cart' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: TEN_MINUTES,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
    });
    console.log('[AbandonedCart] Scheduled #0 at 10 minutes');

    // Schedule follow-ups: each 24h after the previous, starting 24h after the 10-min one
    for (let i = 1; i <= ABANDONED_CART_FOLLOWUP_DAYS; i++) {
      const delaySeconds = TEN_MINUTES + (TWENTY_FOUR_HOURS * i);
      const messageIndex = i % ABANDONED_CART_MESSAGES.length;
      const message = ABANDONED_CART_MESSAGES[messageIndex];

      await Notifications.scheduleNotificationAsync({
        identifier: `abandoned-cart-${i}`,
        content: {
          title: message.title,
          body: message.body,
          sound: true,
          data: { type: 'abandoned-cart' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
      });
      console.log(`[AbandonedCart] Scheduled #${i} at ${Math.round(delaySeconds / 3600)}h`);
    }

    console.log(`[AbandonedCart] Full sequence scheduled: 1 + ${ABANDONED_CART_FOLLOWUP_DAYS} follow-ups`);
  } catch (error) {
    console.error('[AbandonedCart] Error scheduling notification:', error);
  }
}

/**
 * Cancel all abandoned cart notifications.
 * Called when user purchases or joins a room.
 * Keeps the guard flag set so still-mounted paywall screens cannot re-schedule.
 */
export async function cancelAbandonedCartNotification(): Promise<void> {
  try {
    // Ensure the guard is set so no screen can re-schedule after a purchase
    await AsyncStorage.setItem(ABANDONED_CART_KEY, 'true');

    // Cancel all notifications in the sequence
    for (let i = 0; i <= ABANDONED_CART_FOLLOWUP_DAYS; i++) {
      try {
        await Notifications.cancelScheduledNotificationAsync(`abandoned-cart-${i}`);
      } catch {
        // Ignore if this one doesn't exist
      }
    }
    console.log('[AbandonedCart] All notifications cancelled');
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Check if abandoned cart notification has already been fired at least once
 */
export async function hasAbandonedCartFired(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ABANDONED_CART_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Set the "40% Off" home screen quick action (long-press app icon)
 */
export function setAbandonedCartQuickAction(): void {
  try {
    QuickActions.setItems([
      {
        id: 'abandoned-cart-offer',
        title: '40% Off Lifetime',
        subtitle: 'One-time offer — claim now',
        icon: Platform.OS === 'ios' ? 'symbol:flame.fill' : undefined,
        params: { type: 'abandoned-cart' },
      },
    ]);
    console.log('[AbandonedCart] Quick action set');
  } catch (error) {
    console.warn('[AbandonedCart] Failed to set quick action:', error);
  }
}

/**
 * Remove the abandoned cart quick action (after purchase/room join)
 */
export function clearAbandonedCartQuickAction(): void {
  try {
    QuickActions.setItems([]);
    console.log('[AbandonedCart] Quick action cleared');
  } catch (error) {
    // Ignore
  }
}

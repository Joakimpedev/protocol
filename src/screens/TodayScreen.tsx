import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SectionList,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import { useDevMode } from '../contexts/DevModeContext';
import { loadUserRoutine, subscribeToUserRoutine, UserRoutineData } from '../services/routineService';
import { getTodayDateString } from '../services/completionService';
import { buildRoutineSections, RoutineSection, RoutineStep } from '../services/routineBuilder';
import { getTodaySessionCompletions, SessionCompletion, markSessionCompleted } from '../services/sessionService';
import { getTodayExerciseCompletions } from '../services/exerciseService';
import { markStepCompleted } from '../services/completionService';
import { getUserXPData, getLevelDefinition, UserXPData, awardXP, XP_AMOUNTS, calculateLevel } from '../services/xpService';
import { getUserSelectedHabits, getHabitCompletions, completeHabit, uncompleteHabit, getCustomHabits, CustomHabit } from '../services/dailyTaskService';
import { DAILY_HABITS, DailyHabit } from '../data/daily_habits';
import { useResponsive } from '../utils/responsive';
import VillageDisplay from '../components/VillageDisplay';
import LevelUpOverlay from '../components/LevelUpOverlay';
import XPPopup from '../components/XPPopup';
import DailyProgressBar from '../components/DailyProgressBar';
import DailyTaskItem from '../components/DailyTaskItem';
import RoutineAccordion from '../components/RoutineAccordion';
import StreakBadge from '../components/StreakBadge';
import { getVillageChoices, getVillagePosition } from '../services/villageService';
import { usePostHog } from 'posthog-react-native';

const NOTIFICATIONS_REQUESTED_KEY = '@protocol_notifications_requested';

interface TaskItem {
  id: string;
  name: string;
  icon?: string;
  iconColor?: string;
  type: 'habit' | 'pending_product';
  category: 'morning' | 'evening' | 'anytime';
  completed: boolean;
  subtitle?: string;
  routineStep?: RoutineStep;
}

export default function TodayScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { isDebugInfoEnabled } = useDevMode();
  const posthog = usePostHog();
  const responsive = useResponsive();

  const [routineData, setRoutineData] = useState<UserRoutineData | null>(null);
  const [sections, setSections] = useState<RoutineSection[]>([]);
  const [sessionCompletions, setSessionCompletions] = useState<SessionCompletion | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [exerciseCompletions, setExerciseCompletions] = useState<Record<string, boolean>>({});
  const [xpData, setXpData] = useState<UserXPData>({ total: 0, level: 1, lastLevelUp: null, history: [] });
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [customHabits, setCustomHabits] = useState<CustomHabit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<string[]>([]);
  const [villageChoices, setVillageChoices] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  // Daily XP tracking — base from history on load, delta from optimistic updates
  const [dailyXPBase, setDailyXPBase] = useState(0);
  const [dailyXPDelta, setDailyXPDelta] = useState(0);

  // Level-up overlay state
  const [levelUpState, setLevelUpState] = useState<{
    active: boolean;
    newLevel: number;
    currentChoices: number[];
  } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // XP popup overlay state — array so multiple popups can stack
  const [xpPopups, setXpPopups] = useState<Array<{ key: number; amount: number; position: { x: number; y: number } }>>([]);
  const xpPopupKeyRef = useRef(0);
  const screenWidth = Dimensions.get('window').width;

  const handleXPEarned = useCallback((amount: number, position: { x: number; y: number }) => {
    xpPopupKeyRef.current += 1;
    // If position is at (0,0) fallback to screen center
    const safePos = (position.x === 0 && position.y === 0)
      ? { x: screenWidth / 2, y: 200 }
      : position;
    const newPopup = { key: xpPopupKeyRef.current, amount, position: safePos };
    setXpPopups(prev => [...prev, newPopup]);
  }, [screenWidth]);

  const handleXPPopupComplete = useCallback((key: number) => {
    setXpPopups(prev => prev.filter(p => p.key !== key));
  }, []);

  const isPro = theme.key === 'pro';

  // Load all data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserRoutine(user.uid, (data) => {
      setRoutineData(data);
      if (data) {
        setSections(buildRoutineSections(data));
      }
    });

    loadAllData();
    return () => unsubscribe();
  }, [user]);

  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) loadAllData();
    });
    return unsubscribe;
  }, [navigation, user]);

  const loadAllData = async () => {
    if (!user) return;
    try {
      const today = getTodayDateString();
      const [
        routine,
        completions,
        xp,
        habits,
        habitDone,
        exCompletions,
        customs,
        vChoices,
      ] = await Promise.all([
        loadUserRoutine(user.uid),
        getTodaySessionCompletions(user.uid),
        getUserXPData(user.uid),
        getUserSelectedHabits(user.uid),
        getHabitCompletions(user.uid),
        getTodayExerciseCompletions(user.uid),
        getCustomHabits(user.uid),
        getVillageChoices(user.uid),
      ]);

      if (routine) {
        setRoutineData(routine);
        setSections(buildRoutineSections(routine));

        // Get completed steps from daily completions
        const { getTodayCompletedSteps } = await import('../services/completionService');
        const steps = await getTodayCompletedSteps(user.uid);
        setCompletedStepIds(steps);
      }

      // Load streak from Firestore stats
      const { doc: firestoreDoc, getDoc: firestoreGetDoc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('../config/firebase');
      const userDocSnap = await firestoreGetDoc(firestoreDoc(firestoreDb, 'users', user.uid));
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setStreak(userData.stats?.current_streak || 0);
      }

      setSessionCompletions(completions);
      setXpData(xp);
      // Calculate today's XP from history
      const todayStr = today;
      const todayXP = (xp.history || [])
        .filter(entry => entry.timestamp && entry.timestamp.startsWith(todayStr))
        .reduce((sum, entry) => sum + entry.amount, 0);
      setDailyXPBase(todayXP);
      setDailyXPDelta(0);
      setSelectedHabits(habits);
      setCustomHabits(customs);
      setHabitCompletions(habitDone);
      setExerciseCompletions(exCompletions);
      setVillageChoices(vChoices);

      // Notifications initialization
      try {
        const hasRequestedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_REQUESTED_KEY);
        if (!hasRequestedNotifications) {
          const { initializeUserNotifications } = require('../services/notificationService');
          await initializeUserNotifications(user.uid);
          await AsyncStorage.setItem(NOTIFICATIONS_REQUESTED_KEY, 'true');
        }
      } catch (e) {
        console.error('Error initializing notifications:', e);
      }

      const { checkAndSendReEngagement, checkAndRescheduleWeeklySummary } = require('../services/notificationService');
      checkAndSendReEngagement(user.uid).catch(console.error);
      checkAndRescheduleWeeklySummary(user.uid).catch(console.error);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build unified task list
  const buildTaskList = useCallback((): { morning: TaskItem[]; anytime: TaskItem[]; evening: TaskItem[]; shopping: TaskItem[] } => {
    const morningTasks: TaskItem[] = [];
    const anytimeTasks: TaskItem[] = [];
    const eveningTasks: TaskItem[] = [];
    const shoppingTasks: TaskItem[] = [];

    // Pending products go to their own shopping section (not anytime, not counted toward daily XP)
    sections.forEach((section) => {
      section.steps.forEach((step) => {
        if (step.isPending) {
          shoppingTasks.push({
            id: `pending_${step.id}`,
            name: `Get ${step.displayName}`,
            icon: '\u{1F6D2}',
            type: 'pending_product',
            category: 'anytime',
            completed: false,
            routineStep: step,
          });
        }
      });
    });

    // Exercises are now part of routine sections (handled by RoutineAccordion + SessionScreen)

    // Add selected habits (built-in + custom)
    const activeBuiltIn = DAILY_HABITS.filter(h => selectedHabits.includes(h.id));
    const activeCustom = customHabits.filter(h => selectedHabits.includes(h.id));
    const allHabits: DailyHabit[] = [...activeBuiltIn, ...activeCustom];
    allHabits.forEach((habit) => {
      const task: TaskItem = {
        id: `habit_${habit.id}`,
        name: habit.name,
        icon: habit.icon,
        iconColor: habit.iconColor,
        type: 'habit',
        category: habit.category,
        completed: habitCompletions.includes(habit.id),
      };
      if (habit.category === 'morning') morningTasks.push(task);
      else if (habit.category === 'evening') eveningTasks.push(task);
      else anytimeTasks.push(task);
    });

    return { morning: morningTasks, anytime: anytimeTasks, evening: eveningTasks, shopping: shoppingTasks };
  }, [sections, completedStepIds, selectedHabits, customHabits, habitCompletions, routineData]);

  const taskLists = buildTaskList();
  const allTasks = [...taskLists.morning, ...taskLists.anytime, ...taskLists.evening];
  const dailyTasks = allTasks.filter(t => t.type !== 'pending_product');

  // Count skincare steps from sections (rendered by RoutineAccordion, not in taskLists)
  const skincareSteps = sections.flatMap(s => s.steps.filter(step => !step.isPending));
  const skincareCompletedCount = skincareSteps.filter(s => completedStepIds.includes(s.id)).length;

  const completedCount = dailyTasks.filter(t => t.completed).length + skincareCompletedCount;
  const totalCount = dailyTasks.length + skincareSteps.length;

  // Daily XP goal: sum of XP available from all tasks/steps today
  const dailyXPGoal = useMemo(() => {
    let goal = 0;
    // Habits: 10 XP each
    goal += dailyTasks.length * 10;
    // Skincare/exercise steps
    skincareSteps.forEach(step => {
      if (step.type === 'exercise' && step.exercise?.default_sets) {
        const sets = step.exercise.default_sets;
        goal += sets * Math.ceil(15 / sets);
      } else {
        goal += 10;
      }
    });
    return goal;
  }, [dailyTasks.length, skincareSteps]);
  const dailyXP = dailyXPBase + dailyXPDelta;

  const levelDef = getLevelDefinition(xpData.level);

  // Handle task toggle
  const handleToggleTask = async (task: TaskItem) => {
    if (!user) return;

    // Pending products are not toggleable — tap navigates to protocol tab
    if (task.type === 'pending_product') {
      navigation.navigate('Protocol');
      return;
    }

    if (task.type === 'habit') {
      const habitId = task.id.replace('habit_', '');
      if (task.completed) {
        await uncompleteHabit(user.uid, habitId);
        setHabitCompletions(prev => prev.filter(id => id !== habitId));
      } else {
        await completeHabit(user.uid, habitId);
        setHabitCompletions(prev => [...prev, habitId]);
        optimisticXPUpdate(10);
      }
    }
  };

  // Optimistically update XP state (instant bar update, no Firestore round-trip)
  const optimisticXPUpdate = useCallback((amount: number) => {
    setXpData(prev => {
      const newTotal = Math.max(0, prev.total + amount);
      const newLevel = calculateLevel(newTotal);
      if (newLevel > prev.level) {
        // Track level-up in PostHog
        // village_image: 1 = pure wisdom, N = pure power (matches image file numbering)
        const villageImage = getVillagePosition(villageChoices) + 1;
        posthog?.capture('protocol_level_up', {
          level: newLevel,
          level_name: getLevelDefinition(newLevel).name,
          village_image: villageImage,
          total_xp: newTotal,
        });

        // Scroll to top, then activate overlay after scroll settles
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setTimeout(() => {
          setLevelUpState({
            active: true,
            newLevel,
            currentChoices: villageChoices,
          });
        }, 500);
        // DON'T update level yet — will be updated at choice time (behind the blur)
        return { ...prev, total: newTotal };
      }
      return { ...prev, total: newTotal, level: newLevel };
    });
    // Also update daily XP tracker instantly
    setDailyXPDelta(prev => prev + amount);
  }, [villageChoices, posthog]);

  // Called at flash peak — update choices + level so VillageDisplay updates behind blur
  const handleLevelUpChoiceMade = useCallback((choice: 0 | 1) => {
    setVillageChoices(prev => [...prev, choice]);
    if (levelUpState) {
      setXpData(prev => ({ ...prev, level: levelUpState.newLevel }));
    }
  }, [levelUpState]);

  // Called after fade-out completes — unmount overlay (VillageDisplay already shows new level)
  const handleLevelUpDismiss = useCallback(() => {
    // For levels 6+ (no choice), apply the deferred level now
    if (levelUpState) {
      setXpData(prev => ({ ...prev, level: Math.max(prev.level, levelUpState.newLevel) }));
    }
    setLevelUpState(null);
  }, [levelUpState]);

  // Accordion inline session handlers
  // xpAmount is set for exercise sets (micro XP per set). undefined = normal step (10 XP via markStepCompleted).
  const handleRoutineStepComplete = async (stepId: string, xpAmount?: number) => {
    if (!user) return;
    const alreadyCompleted = completedStepIds.includes(stepId);

    if (xpAmount !== undefined) {
      // Exercise micro XP: only award if the exercise hasn't been completed today
      if (!alreadyCompleted) {
        optimisticXPUpdate(xpAmount);
        awardXP(user.uid, xpAmount, 'exercise_set').catch(console.error);
      }
    } else {
      // Normal step: only award XP if not already completed today
      if (!alreadyCompleted) {
        optimisticXPUpdate(10);
        markStepCompleted(user.uid, stepId, 'ingredient').catch(console.error);
        setCompletedStepIds(prev => [...prev, stepId]);
      }
    }
  };

  const handleRoutineSkipWait = async () => {
    if (!user) return;
    // Deduct 5 XP for skipping wait — instant update
    optimisticXPUpdate(XP_AMOUNTS.SKIP_WAIT_PENALTY);
    awardXP(user.uid, XP_AMOUNTS.SKIP_WAIT_PENALTY, 'skip_wait_penalty').catch(console.error);
  };

  const handleRoutineSessionComplete = async (stepIds: string[]) => {
    if (!user) return;
    // Immediately mark all steps as completed locally so redoing won't award XP again
    setCompletedStepIds(prev => {
      const newIds = stepIds.filter(id => !prev.includes(id));
      return newIds.length > 0 ? [...prev, ...newIds] : prev;
    });
    const section = sections.find(s => s.steps.some(step => stepIds.includes(step.id)));
    if (section) {
      await markSessionCompleted(user.uid, section.name, stepIds);
    }
    setTimeout(() => loadAllData(), 500);
  };

  const handleTaskLongPress = (task: TaskItem) => {
    // No-op for habits
  };

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleAddHabits = () => {
    navigation.navigate('HabitPicker');
  };

  // Find routine sections for accordion
  const morningSection = sections.find(s => s.name === 'morning');
  const eveningSection = sections.find(s => s.name === 'evening');

  const renderSection = (title: string, sectionKey: string, tasks: TaskItem[]) => {
    const routineSection = sectionKey === 'morning' ? morningSection : sectionKey === 'evening' ? eveningSection : null;
    const hasRoutine = routineSection && routineSection.steps.filter(s => !s.isPending).length > 0;

    if (tasks.length === 0 && !hasRoutine && sectionKey !== 'anytime') return null;

    const isCollapsed = collapsedSections[sectionKey];
    // Include skincare steps in section counts
    const routineSteps = hasRoutine ? routineSection!.steps.filter(s => !s.isPending) : [];
    const routineCompleted = routineSteps.filter(s => completedStepIds.includes(s.id)).length;
    const sectionCompleted = tasks.filter(t => t.completed).length + routineCompleted;
    const sectionTotal = tasks.length + routineSteps.length;

    return (
      <View style={styles.section} key={sectionKey}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionCount}>
              {sectionCompleted}/{sectionTotal}
            </Text>
          </View>
          <Text style={styles.sectionArrow}>{isCollapsed ? '+' : '\u2212'}</Text>
        </TouchableOpacity>

        {!isCollapsed && (
          <View style={styles.sectionContent}>
            {/* Routine accordion first for morning/evening */}
            {hasRoutine && (
              <RoutineAccordion
                title={sectionKey === 'morning' ? 'Morning Routine' : 'Evening Routine'}
                icon={sectionKey === 'morning' ? 'weather-sunset-up' : 'moon-waning-crescent'}
                section={routineSection!}
                completedStepIds={completedStepIds}
                onStepComplete={handleRoutineStepComplete}
                onSkipWait={handleRoutineSkipWait}
                onSessionComplete={handleRoutineSessionComplete}
                onXPEarned={handleXPEarned}
              />
            )}
            {/* Habit / exercise tasks */}
            {tasks.map((task) => (
              <DailyTaskItem
                key={task.id}
                id={task.id}
                name={task.name}
                icon={task.icon}
                iconColor={task.iconColor}
                completed={task.completed}
                subtitle={task.subtitle}
                xpAmount={10}
                onToggle={() => handleToggleTask(task)}
                onLongPress={() => handleTaskLongPress(task)}
                onXPEarned={handleXPEarned}
              />
            ))}
            {sectionKey !== 'anytime' && tasks.length === 0 && !hasRoutine && (
              <Text style={styles.emptySection}>No tasks yet</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  if (!routineData || !routineData.routineStarted) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Today</Text>
        <Text style={styles.body}>Complete onboarding to start your routine.</Text>
      </View>
    );
  }

  const dynamicPadding = responsive.safeHorizontalPadding;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingHorizontal: dynamicPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: responsive.contentMaxWidth, alignSelf: responsive.contentAlign as any, width: '100%' }}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <StreakBadge streak={streak} />
            <Text style={styles.appTitle}>Today</Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Image
                source={require('../../assets/icons/gear.png')}
                style={[styles.settingsIcon, { tintColor: theme.colors.text }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Village Display */}
          <VillageDisplay level={xpData.level} levelName={levelDef.name} choices={villageChoices} />

          {/* Daily Progress Container */}
          <View style={styles.progressContainer}>
            <DailyProgressBar dailyXP={dailyXP} dailyGoal={dailyXPGoal} />
          </View>

          {/* Task Sections */}
          {renderSection('MORNING ROUTINE', 'morning', taskLists.morning)}
          {renderSection('ANYTIME', 'anytime', taskLists.anytime)}
          {renderSection('EVENING ROUTINE', 'evening', taskLists.evening)}

          {/* Shopping List — pending products, separate from daily progress */}
          {taskLists.shopping.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection('shopping')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>SHOPPING LIST</Text>
                  <Text style={styles.sectionCount}>
                    {taskLists.shopping.length} {taskLists.shopping.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
                <Text style={styles.sectionArrow}>{collapsedSections['shopping'] ? '+' : '\u2212'}</Text>
              </TouchableOpacity>

              {!collapsedSections['shopping'] && (
                <View style={styles.sectionContent}>
                  <Text style={styles.shoppingHint}>
                    These don't count toward today's progress, get them when you can!
                  </Text>
                  {taskLists.shopping.map((task) => (
                    <DailyTaskItem
                      key={task.id}
                      id={task.id}
                      name={task.name}
                      icon={task.icon}
                      iconColor={task.iconColor}
                      completed={task.completed}
                      subtitle={task.subtitle}
                      xpAmount={0}
                      onToggle={() => handleToggleTask(task)}
                      onLongPress={() => handleTaskLongPress(task)}
                      onXPEarned={handleXPEarned}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Add Habits Button */}
          <TouchableOpacity
            style={styles.addHabitsButton}
            onPress={handleAddHabits}
          >
            <Text style={styles.addHabitsText}>+ Add daily habits</Text>
          </TouchableOpacity>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* XP Popup Overlay — rendered at screen level so it's never clipped */}
      {xpPopups.length > 0 && (
        <View style={styles.xpOverlay} pointerEvents="none">
          {xpPopups.map(popup => (
            <XPPopup
              key={popup.key}
              amount={popup.amount}
              visible={true}
              position={popup.position}
              onComplete={() => handleXPPopupComplete(popup.key)}
            />
          ))}
        </View>
      )}

      {/* Level-up overlay — in-place animation */}
      {levelUpState?.active && (
        <LevelUpOverlay
          newLevel={levelUpState.newLevel}
          currentChoices={levelUpState.currentChoices}
          onChoiceMade={handleLevelUpChoiceMade}
          onDismiss={handleLevelUpDismiss}
        />
      )}
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
      paddingTop: 60,
      paddingBottom: 20,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingTop: 8,
    },
    appTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    settingsButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsIcon: {
      width: 20,
      height: 20,
    },
    progressContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 16,
    },
    section: {
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: theme.colors.textSecondary,
    },
    sectionCount: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    sectionArrow: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    sectionContent: {
      // tasks render here
    },
    emptySection: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 12,
    },
    shoppingHint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      paddingHorizontal: 4,
      paddingBottom: 8,
      fontStyle: 'italic',
    },
    addHabitsButton: {
      alignItems: 'center',
      paddingVertical: 14,
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    addHabitsText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    xpOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
      elevation: 9999,
      pointerEvents: 'none' as any,
    },
    heading: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.md,
      marginTop: 100,
      textAlign: 'center',
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
}

/**
 * RoutineAccordion
 * Compact inline interactive session card for morning/evening routines.
 * Collapsed: single tappable row with progress.
 * Expanded: compact card with step-by-step interactive session.
 *
 * Features:
 * - Ghost pending product reminders (no instructions, just "get this")
 * - Exercise set counter with micro XP per set
 * - Skip wait penalty (-5 XP)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  Animated,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { RoutineSection, RoutineStep, formatDuration } from '../services/routineBuilder';
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RoutineAccordionProps {
  title: string;
  icon: string;
  section: RoutineSection;
  completedStepIds: string[];
  onStepComplete: (stepId: string, xpAmount?: number) => void;
  onSkipWait: () => void;
  onSessionComplete: (stepIds: string[]) => void;
  /** Called when XP is earned, with amount and screen position for the flying popup */
  onXPEarned?: (amount: number, position: { x: number; y: number }) => void;
}

/** Calculate XP per set for an exercise. Start with 15, divide by sets, round up. */
function getExerciseSetXP(totalSets: number): number {
  if (totalSets <= 0) return 15;
  return Math.ceil(15 / totalSets);
}

export default function RoutineAccordion({
  title,
  icon,
  section,
  completedStepIds,
  onStepComplete,
  onSkipWait,
  onSessionComplete,
  onXPEarned,
}: RoutineAccordionProps) {
  const theme = useTheme();
  const isPro = theme.key === 'pro';
  const accentColor = isPro ? '#A855F7' : '#22C55E';

  const [expanded, setExpanded] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitTimerSeconds, setWaitTimerSeconds] = useState<number | null>(null);
  // Exercise set tracking
  const [currentSet, setCurrentSet] = useState(0);

  const waitTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wrapperRef = useRef<View>(null);

  // Include ALL steps (active + pending) in the flow
  const allSteps = section.steps;
  const activeSteps = allSteps.filter(s => !s.isPending);
  const completedCount = activeSteps.filter(s => completedStepIds.includes(s.id)).length;
  const totalCount = activeSteps.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  // Calculate total XP: 10 per ingredient/base step, 15 per exercise (actually sets*ceil(15/sets))
  const totalXP = activeSteps.reduce((sum, step) => {
    if (step.type === 'exercise' && step.exercise?.default_sets) {
      const sets = step.exercise.default_sets;
      return sum + sets * getExerciseSetXP(sets);
    }
    return sum + 10;
  }, 0);

  const currentStep: RoutineStep | undefined = allSteps[currentStepIndex];
  const isLastStep = currentStepIndex === allSteps.length - 1;

  // Is current step an exercise with sets?
  const isExerciseWithSets = currentStep?.type === 'exercise' && (currentStep.exercise?.default_sets || 0) > 0;
  const exerciseTotalSets = isExerciseWithSets ? (currentStep!.exercise.default_sets || 20) : 0;
  const exerciseXpPerSet = isExerciseWithSets ? getExerciseSetXP(exerciseTotalSets) : 0;
  const isLastSet = currentSet >= exerciseTotalSets - 1;

  // Hold/release info for cycling exercises
  const variation = currentStep?.exercise?.todayVariation;
  const holdSec = variation?.hold_seconds || 0;
  const releaseSec = variation?.release_seconds || 0;

  useEffect(() => {
    return () => {
      if (waitTimerIntervalRef.current) clearInterval(waitTimerIntervalRef.current);
    };
  }, []);

  // Pulse animation for wait timer
  useEffect(() => {
    if (isWaiting) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isWaiting]);

  // Jump to first incomplete step on expand, reset set counter
  useEffect(() => {
    if (expanded) {
      const firstIncomplete = allSteps.findIndex(s =>
        !s.isPending && !completedStepIds.includes(s.id)
      );
      // If all active complete, start from 0 (will show pending ghosts or completed state)
      setCurrentStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      setCurrentSet(0);
    }
  }, [expanded]);

  // Reset set counter when step changes
  useEffect(() => {
    setCurrentSet(0);
  }, [currentStepIndex]);

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
    setIsWaiting(false);
    setWaitTimerSeconds(null);
    if (waitTimerIntervalRef.current) {
      clearInterval(waitTimerIntervalRef.current);
      waitTimerIntervalRef.current = null;
    }
  }, []);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${secs}s`;
  };

  const handleNextStep = useCallback(() => {
    if (isLastStep) {
      handleSessionDone();
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsWaiting(false);
      setWaitTimerSeconds(null);
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [isLastStep]);

  const fireXPEarned = useCallback((amount: number) => {
    if (!onXPEarned) return;
    let fired = false;
    // Try to measure wrapper position for accurate placement
    if (wrapperRef.current && (wrapperRef.current as any).measureInWindow) {
      (wrapperRef.current as any).measureInWindow((x: number, y: number, w: number) => {
        fired = true;
        onXPEarned(amount, { x: x + w / 2, y });
      });
    }
    // Fallback: fire with (0,0) — TodayScreen will center it on screen
    if (!fired) {
      onXPEarned(amount, { x: 0, y: 0 });
    }
  }, [onXPEarned]);

  const handleStepDone = useCallback(() => {
    if (!currentStep) return;
    const alreadyDone = completedStepIds.includes(currentStep.id);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // For exercises with sets, handle set-by-set
    if (isExerciseWithSets) {
      // Only award XP if not already completed today (redo protection)
      if (!alreadyDone) {
        fireXPEarned(exerciseXpPerSet);
        onStepComplete(currentStep.id, exerciseXpPerSet);
      }

      if (isLastSet) {
        // All sets done — move to next step
        const waitTime = currentStep.session.wait_after_seconds;
        if (waitTime > 0 && !isLastStep) {
          startWaitTimer(waitTime);
        } else {
          handleNextStep();
        }
      } else {
        // Next set
        setCurrentSet(prev => prev + 1);
      }
      return;
    }

    // Normal step (ingredient/base_step) — only award XP if not already completed
    if (!alreadyDone) {
      fireXPEarned(10);
    }
    onStepComplete(currentStep.id);

    const waitTime = currentStep.session.wait_after_seconds;
    if (waitTime > 0 && !isLastStep) {
      startWaitTimer(waitTime);
    } else {
      handleNextStep();
    }
  }, [currentStep, isLastStep, isExerciseWithSets, exerciseXpPerSet, isLastSet, onStepComplete, handleNextStep, fireXPEarned, completedStepIds]);

  const startWaitTimer = (waitTime: number) => {
    setIsWaiting(true);
    setWaitTimerSeconds(waitTime);
    waitTimerIntervalRef.current = setInterval(() => {
      setWaitTimerSeconds(prev => {
        if (prev === null || prev <= 1) {
          if (waitTimerIntervalRef.current) clearInterval(waitTimerIntervalRef.current);
          handleNextStep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSkipWait = () => {
    if (waitTimerIntervalRef.current) {
      clearInterval(waitTimerIntervalRef.current);
      waitTimerIntervalRef.current = null;
    }
    setIsWaiting(false);
    setWaitTimerSeconds(null);
    // Only penalize if this is the first time doing the routine today
    const isRedo = allComplete;
    if (!isRedo) {
      fireXPEarned(-5);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      onSkipWait();
    }
    handleNextStep();
  };

  const handleSkipStep = () => {
    handleNextStep();
  };

  // Pending step: just acknowledge and continue
  const handlePendingOk = () => {
    handleNextStep();
  };

  const handleSessionDone = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Note: the last step's onStepComplete + fireXPEarned already fired from handleStepDone,
    // so we do NOT call them again here to avoid double XP/popup.
    const allStepIds = activeSteps.map(s => s.id);
    await onSessionComplete(allStepIds);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(false);
    setCurrentStepIndex(0);
    setIsWaiting(false);
    setWaitTimerSeconds(null);
  };

  // --- Progress dots (includes ghost dots for pending) ---
  const renderProgressDots = () => (
    <View style={styles.dotsRow}>
      {allSteps.map((step, i) => {
        const isPending = step.isPending;
        const done = !isPending && completedStepIds.includes(step.id);
        const isCurrent = i === currentStepIndex;
        return (
          <View
            key={step.id}
            style={[
              styles.dot,
              {
                backgroundColor: isPending
                  ? theme.colors.border
                  : done
                    ? accentColor
                    : isCurrent ? accentColor : theme.colors.border,
                opacity: isPending ? 0.2 : done ? 1 : isCurrent ? 0.5 : 0.3,
                width: isCurrent ? 16 : 8,
                borderStyle: isPending ? 'dashed' : 'solid',
              },
            ]}
          />
        );
      })}
    </View>
  );

  // --- Header row ---
  const renderHeader = () => (
    <TouchableOpacity
      style={[
        styles.headerRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: allComplete ? accentColor : theme.colors.border,
          opacity: allComplete ? 0.7 : 1,
          borderBottomLeftRadius: expanded ? 0 : 12,
          borderBottomRightRadius: expanded ? 0 : 12,
        },
      ]}
      onPress={toggleExpand}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#C084FC" />
      </View>
      <View style={styles.titleContainer}>
        <Text
          style={[styles.title, { color: allComplete ? theme.colors.textSecondary : theme.colors.text }]}
          numberOfLines={1}
        >
          {allComplete ? '\u2713 ' : ''}{title}
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          {totalCount} steps{section.estimatedDuration > 0 ? ` \u00B7 ~${formatDuration(section.estimatedDuration)}` : ''}
        </Text>
      </View>
      <View style={styles.badges}>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.border }]}>
          <Text style={[styles.countText, { color: theme.colors.text }]}>{completedCount}/{totalCount}</Text>
        </View>
        <Text style={[styles.xpBadge, { opacity: allComplete ? 0.4 : 0.6 }]}>+{totalXP} XP</Text>
      </View>
      <MaterialCommunityIcons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={theme.colors.textSecondary}
        style={{ marginLeft: 4 }}
      />
    </TouchableOpacity>
  );

  // --- Expanded card ---
  const renderExpandedCard = () => {
    if (!currentStep) return null;

    // ===== Wait timer =====
    if (isWaiting && waitTimerSeconds !== null) {
      return (
        <Animated.View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, transform: [{ scale: pulseAnim }] }]}>
          {/* XP penalty popup */}
          {renderProgressDots()}
          <MaterialCommunityIcons name="timer-sand" size={28} color={accentColor} style={{ marginBottom: 6 }} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Let it absorb</Text>
          <Text style={[styles.timerText, { color: accentColor }]}>{formatTimer(waitTimerSeconds)}</Text>
          <Text style={[styles.cardHint, { color: theme.colors.textSecondary }]}>Waiting improves absorption</Text>
          <TouchableOpacity style={[styles.skipWaitBtn, { borderColor: '#EF4444' }]} onPress={handleSkipWait}>
            <Text style={styles.skipWaitText}>Skip wait (-5 XP)</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // ===== Pending product ghost step =====
    if (currentStep.isPending) {
      return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {renderProgressDots()}
          <View style={[styles.ghostBadge, { borderColor: theme.colors.border }]}>
            <MaterialCommunityIcons name="cart-outline" size={20} color={theme.colors.textSecondary} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>{currentStep.displayName}</Text>
          <Text style={[styles.ghostText, { color: theme.colors.textSecondary }]}>
            This product belongs in your routine here.{'\n'}
            Get it to unlock this step and earn +10 XP.
          </Text>
          <TouchableOpacity
            style={[styles.okButton, { borderColor: theme.colors.border }]}
            onPress={handlePendingOk}
          >
            <Text style={[styles.okButtonText, { color: theme.colors.text }]}>OK</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ===== Exercise with sets =====
    if (isExerciseWithSets) {
      const totalExXP = exerciseTotalSets * exerciseXpPerSet;
      return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {renderProgressDots()}

          {/* Step name */}
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{currentStep.displayName}</Text>

          {/* Set counter - big and prominent */}
          <View style={[styles.setCounter, { borderColor: accentColor }]}>
            <Text style={[styles.setLabel, { color: theme.colors.textSecondary }]}>SET</Text>
            <Text style={[styles.setNumber, { color: accentColor }]}>{currentSet + 1}</Text>
            <Text style={[styles.setTotal, { color: theme.colors.textSecondary }]}>of {exerciseTotalSets}</Text>
          </View>

          {/* Hold/release info for cycling exercises */}
          {holdSec > 0 && (
            <View style={styles.holdRow}>
              <View style={[styles.holdChip, { backgroundColor: accentColor + '20' }]}>
                <Text style={[styles.holdChipText, { color: accentColor }]}>Hold {holdSec}s</Text>
              </View>
              {releaseSec > 0 && (
                <View style={[styles.holdChip, { backgroundColor: theme.colors.border }]}>
                  <Text style={[styles.holdChipText, { color: theme.colors.textSecondary }]}>Release {releaseSec}s</Text>
                </View>
              )}
            </View>
          )}

          {/* Compact instructions */}
          <View style={[styles.instructionBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Text style={[styles.instructionText, { color: theme.colors.text }]} numberOfLines={3}>
              {currentStep.session.action}
            </Text>
          </View>

          {/* Tip */}
          {currentStep.session.tip && (
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {currentStep.session.tip}
            </Text>
          )}

          {/* Meta: XP per set + total */}
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { borderColor: theme.colors.border }]}>
              <Text style={[styles.metaChipText, { color: '#A855F7' }]}>+{exerciseXpPerSet} XP/set</Text>
            </View>
            <View style={[styles.metaChip, { borderColor: theme.colors.border }]}>
              <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{totalExXP} XP total</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.skipButton, { borderColor: theme.colors.border }]} onPress={handleSkipStep}>
              <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneButton, { backgroundColor: accentColor }]} onPress={handleStepDone} activeOpacity={0.8}>
              <Text style={styles.doneButtonText}>
                {isLastSet ? (isLastStep ? 'Finish' : 'Last Set') : 'Set Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ===== Normal step (ingredient / base_step / exercise without sets) =====
    const isContinuousExercise = currentStep.type === 'exercise' && currentStep.session.is_continuous;
    const durationSec = currentStep.session.duration_seconds;

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {renderProgressDots()}

        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{currentStep.displayName}</Text>
        {currentStep.productName && (
          <Text style={[styles.cardProduct, { color: theme.colors.textSecondary }]}>{currentStep.productName}</Text>
        )}

        {/* Prominent duration display for continuous exercises */}
        {isContinuousExercise && durationSec != null && durationSec > 0 && (
          <View style={[styles.durationBadge, { borderColor: accentColor }]}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={accentColor} />
            <Text style={[styles.durationBadgeText, { color: accentColor }]}>
              {formatDuration(durationSec)}
            </Text>
          </View>
        )}

        <View style={[styles.instructionBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <Text style={[styles.instructionText, { color: theme.colors.text }]} numberOfLines={4}>
            {currentStep.session.action}
          </Text>
        </View>

        {currentStep.session.tip && (
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {currentStep.session.tip}
          </Text>
        )}

        <View style={styles.metaRow}>
          {!isContinuousExercise && durationSec != null && durationSec > 0 && (
            <View style={[styles.metaChip, { borderColor: theme.colors.border }]}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>
                ~{formatDuration(durationSec)}
              </Text>
            </View>
          )}
          <View style={[styles.metaChip, { borderColor: theme.colors.border }]}>
            <Text style={[styles.metaChipText, { color: '#A855F7' }]}>+10 XP</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.skipButton, { borderColor: theme.colors.border }]} onPress={handleSkipStep}>
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.doneButton, { backgroundColor: accentColor }]} onPress={handleStepDone} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>{isLastStep ? 'Finish' : 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View ref={wrapperRef} style={styles.wrapper}>
      {renderHeader()}
      {expanded && (
        <View style={[styles.expandedWrap, { borderColor: theme.colors.border }]}>
          {renderExpandedCard()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 6 },

  // --- Header ---
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32, height: 32,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 6, elevation: 5,
  },
  titleContainer: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '700' },
  xpBadge: { fontSize: 12, fontWeight: '700', color: '#A855F7' },

  // --- Expanded ---
  expandedWrap: {
    borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  card: { padding: 16, alignItems: 'center' },

  // --- Dots ---
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginBottom: 12 },
  dot: { height: 8, borderRadius: 4 },

  // --- Card content ---
  cardTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  durationBadgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardProduct: { fontSize: 13, textAlign: 'center', marginBottom: 10 },
  cardHint: { fontSize: 13, textAlign: 'center', marginBottom: 10 },

  // --- Ghost pending ---
  ghostBadge: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  ghostText: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 14, paddingHorizontal: 8 },
  okButton: {
    paddingVertical: 10, paddingHorizontal: 32,
    borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  okButtonText: { fontSize: 14, fontWeight: '600' },

  // --- Exercise sets ---
  setCounter: {
    borderWidth: 2, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 8,
    alignItems: 'center', marginBottom: 10,
  },
  setLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  setNumber: { fontSize: 32, fontWeight: '800', lineHeight: 38 },
  setTotal: { fontSize: 12, fontWeight: '600' },
  holdRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  holdChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  holdChipText: { fontSize: 12, fontWeight: '600' },

  // --- Instructions ---
  instructionBox: {
    width: '100%', borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8,
  },
  instructionText: { fontSize: 14, lineHeight: 20 },
  tipText: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginBottom: 8, paddingHorizontal: 4 },

  // --- Meta ---
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  metaChipText: { fontSize: 11, fontWeight: '600' },

  // --- Buttons ---
  buttonRow: { flexDirection: 'row', width: '100%', gap: 8 },
  skipButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  skipButtonText: { fontSize: 14, fontWeight: '600' },
  doneButton: { flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  doneButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // --- Timer ---
  timerText: { fontSize: 36, fontWeight: '600', marginBottom: 4 },
  skipWaitBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  skipWaitText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
});

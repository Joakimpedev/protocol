import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../utils/responsive';
import { markSessionCompleted } from '../services/sessionService';
import { RoutineSection, RoutineStep } from '../services/routineBuilder';
import {
  trackStepSkip,
  trackTimerSkip,
  trackRoutineStartTime
} from '../services/analyticsService';
import PendingProductModal from '../components/PendingProductModal';
import { loadUserRoutine } from '../services/routineService';

interface SessionScreenProps {
  route: {
    params: {
      section: RoutineSection;
    };
  };
  navigation: any;
}

export default function SessionScreen({ route, navigation }: SessionScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { user } = useAuth();
  const posthog = usePostHog();
  const responsive = useResponsive();
  const { section } = route.params;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [waitTimerSeconds, setWaitTimerSeconds] = useState<number | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTrackedStartTime, setHasTrackedStartTime] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [routineData, setRoutineData] = useState<any>(null);

  const waitTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimerDurationRef = useRef<number | null>(null);

  const currentStep: RoutineStep | undefined = section.steps[currentStepIndex];
  const isLastStep = currentStepIndex === section.steps.length - 1;
  const progressText = `Step ${currentStepIndex + 1} of ${section.steps.length}`;

  // Format timer display
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  // Load routine data to check for pending products
  useEffect(() => {
    if (!user) return;
    loadUserRoutine(user.uid).then(setRoutineData).catch(console.error);
  }, [user]);

  // Track routine start time when first step is shown
  useEffect(() => {
    if (!user || !currentStep || hasTrackedStartTime) return;

    // Determine routine type from section name
    const routineType = section.name === 'morning' ? 'morning' :
                       section.name === 'evening' ? 'evening' : null;

    if (routineType && currentStepIndex === 0) {
      trackRoutineStartTime(user.uid, routineType).catch(console.error);
      setHasTrackedStartTime(true);
    }
  }, [user, currentStep, currentStepIndex, section.name, hasTrackedStartTime]);

  // Handle pending product tap
  const handlePendingProductTap = () => {
    setShowPendingModal(true);
  };

  // Handle pending product update (refresh routine data and continue to next step)
  const handlePendingProductUpdate = async () => {
    if (!user) return;
    const updated = await loadUserRoutine(user.uid);
    setRoutineData(updated);
    // Close the modal
    setShowPendingModal(false);
    // Continue to the next step (or complete if last step)
    // The product is now deferred, so we can proceed through the routine
    handleNextStep();
  };

  const handleStepComplete = async () => {
    if (!currentStep) return;

    // Track routine step completed event
    if (posthog) {
      const routineType = section.name === 'morning' ? 'morning' :
                         section.name === 'evening' ? 'evening' :
                         section.name === 'exercises' ? 'exercises' : section.name;

      posthog.capture('routine_step_completed', {
        step_name: currentStep.displayName || currentStep.id,
        routine_type: routineType,
      });
    }

    // Check if we need to wait before next step
    const waitTime = currentStep.session.wait_after_seconds;

    if (waitTime > 0 && !isLastStep) {
      // Show wait screen
      setIsWaiting(true);
      setWaitTimerSeconds(waitTime);
      currentTimerDurationRef.current = waitTime;

      waitTimerIntervalRef.current = setInterval(() => {
        setWaitTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            if (waitTimerIntervalRef.current) {
              clearInterval(waitTimerIntervalRef.current);
            }
            // Auto-advance (timer completed, not skipped)
            currentTimerDurationRef.current = null;
            handleNextStep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Move to next step or complete
      handleNextStep();
    }
  };

  const handleSkipWait = async () => {
    Alert.alert(
      'Skip wait time?',
      'Waiting between steps improves product absorption. Skipping may reduce effectiveness.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            // Track timer skip
            if (user && currentStep && currentTimerDurationRef.current !== null) {
              try {
                await trackTimerSkip(
                  user.uid,
                  currentStep.id,
                  currentTimerDurationRef.current
                );
              } catch (error) {
                console.error('Error tracking timer skip:', error);
              }
            }

            if (waitTimerIntervalRef.current) {
              clearInterval(waitTimerIntervalRef.current);
              waitTimerIntervalRef.current = null;
            }
            setIsWaiting(false);
            setWaitTimerSeconds(null);
            currentTimerDurationRef.current = null;
            handleNextStep();
          },
        },
      ]
    );
  };

  const handleNextStep = () => {
    if (isLastStep) {
      handleSessionComplete();
    } else {
      setIsWaiting(false);
      setWaitTimerSeconds(null);
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleSessionComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get all step IDs from this session
      const stepIds = section.steps.map(step => step.id);
      await markSessionCompleted(user.uid, section.name, stepIds);
      navigation.goBack();
    } catch (error) {
      console.error('Error completing session:', error);
      Alert.alert('Error', 'Failed to save completion');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (waitTimerIntervalRef.current) {
        clearInterval(waitTimerIntervalRef.current);
      }
    };
  }, []);

  if (!currentStep) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  // Wait screen
  if (isWaiting && waitTimerSeconds !== null) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { paddingHorizontal: responsive.safeHorizontalPadding }]}>
          <Text style={[styles.waitTitle, { fontSize: responsive.font(24) }]}>Let it absorb...</Text>
          <Text style={[styles.waitTimer, { fontSize: responsive.font(64) }]}>{formatTimer(waitTimerSeconds)}</Text>
          <Text style={[styles.waitDescription, { fontSize: responsive.font(16) }]}>
            Waiting between steps improves product absorption.
          </Text>

          <TouchableOpacity
            style={[styles.skipButton, { padding: responsive.sz(16) }]}
            onPress={handleSkipWait}
          >
            <Text style={[styles.skipButtonText, { fontSize: responsive.font(16) }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main step screen
  const isContinuous = currentStep.session.is_continuous === true;
  const isPending = currentStep.isPending === true;

  // Get short description from ingredient, exercise, or baseStep
  let shortDescription: string | null = null;
  if (currentStep.ingredient?.short_description) {
    shortDescription = currentStep.ingredient.short_description.trim() || null;
  } else if (currentStep.exercise?.short_description) {
    shortDescription = currentStep.exercise.short_description.trim() || null;
  } else if (currentStep.baseStep?.short_description) {
    shortDescription = currentStep.baseStep.short_description.trim() || null;
  }

  // If step is pending, show pending UI
  if (isPending) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingHorizontal: responsive.safeHorizontalPadding }]}>
          <Text style={[styles.progressText, { fontSize: responsive.font(14) }]}>{progressText}</Text>
        </View>

        <View style={[styles.content, { paddingHorizontal: responsive.safeHorizontalPadding }]}>
          <View style={[styles.pendingContainer, { padding: responsive.sz(24) }]}>
            <Text style={[styles.pendingIcon, { fontSize: responsive.font(48) }]}>◌</Text>
            <Text style={[styles.stepName, { fontSize: responsive.font(24) }]}>{currentStep.displayName}</Text>
            <Text style={[styles.pendingText, { fontSize: responsive.font(16) }]}>Waiting for you to get this</Text>
            <TouchableOpacity
              style={[styles.configureButton, { padding: responsive.sz(16) }]}
              onPress={handlePendingProductTap}
            >
              <Text style={[styles.configureButtonText, { fontSize: responsive.font(16) }]}>Configure</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PendingProductModal
          visible={showPendingModal}
          onClose={() => setShowPendingModal(false)}
          ingredientId={currentStep.id}
          ingredientName={currentStep.displayName}
          shortDescription={shortDescription || currentStep.ingredient?.short_description || ''}
          onUpdate={handlePendingProductUpdate}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: responsive.safeHorizontalPadding }]}>
        <Text style={[styles.progressText, { fontSize: responsive.font(14) }]}>{progressText}</Text>
      </View>

      <View style={[styles.content, { paddingHorizontal: responsive.safeHorizontalPadding }]}>
        <Text style={[styles.stepName, { fontSize: responsive.font(24) }]}>{currentStep.displayName}</Text>

        {currentStep.productName && (
          <Text style={[styles.productName, { fontSize: responsive.font(16) }]}>Your product: {currentStep.productName}</Text>
        )}

        {shortDescription && (
          <View style={[styles.descriptionContainer, { padding: responsive.sz(16) }]}>
            <Text style={[styles.descriptionLabel, { fontSize: responsive.font(12) }]}>What this does:</Text>
            <Text style={[styles.description, { fontSize: responsive.font(14) }]}>{shortDescription}</Text>
          </View>
        )}

        <View style={[styles.instructionContainer, { padding: responsive.sz(24) }]}>
          <Text style={[styles.instructionLabel, { fontSize: responsive.font(12) }]}>Instructions:</Text>
          <Text style={[styles.instruction, { fontSize: responsive.font(16) }]}>{currentStep.session.action}</Text>
        </View>

        {currentStep.session.tip && (
          <View style={[styles.tipContainer, { padding: responsive.sz(16) }]}>
            <Text style={[styles.tip, { fontSize: responsive.font(14) }]}>{currentStep.session.tip}</Text>
          </View>
        )}

        {isContinuous && (
          <View style={[styles.continuousNote, { padding: responsive.sz(16) }]}>
            <Text style={[styles.continuousNoteText, { fontSize: responsive.font(14) }]}>
              This is a continuous practice. Complete when ready.
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { padding: responsive.sz(24) }]}>
        <TouchableOpacity
          style={[styles.doneButton, { padding: responsive.sz(24) }, isLoading && styles.doneButtonDisabled]}
          onPress={handleStepComplete}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={[styles.doneButtonText, { fontSize: responsive.font(16) }]}>
              {isLastStep ? 'Complete' : 'Done'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Skip Today Button */}
        <TouchableOpacity
          style={styles.skipTodayButton}
          onPress={async () => {
            if (!user || !currentStep) return;

            Alert.alert(
              'Skip this step?',
              'This will mark the step as skipped for today.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Skip',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await trackStepSkip(user.uid, currentStep.id);
                      // Move to next step or complete
                      handleNextStep();
                    } catch (error) {
                      console.error('Error tracking step skip:', error);
                      Alert.alert('Error', 'Failed to skip step');
                    }
                  },
                },
              ]
            );
          }}
          disabled={isLoading}
        >
          <Text style={styles.skipTodayButtonText}>Skip today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderWidth: 0,
    },
    header: {
      padding: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: 0,
      marginTop: 0,
      marginBottom: 0,
      alignItems: 'center',
      borderTopWidth: 0,
      borderBottomWidth: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      backgroundColor: theme.colors.background,
      overflow: 'visible',
    },
    progressText: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      alignSelf: 'center',
    },
    content: {
      flex: 1,
      paddingVertical: theme.spacing.xl,
      // paddingHorizontal is set dynamically
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: '25%',
    },
    stepName: {
      ...theme.typography.heading,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    productName: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    descriptionContainer: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      width: '100%',
    },
    descriptionLabel: {
      ...theme.typography.label,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xs,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      fontSize: 13,
    },
    instructionContainer: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      width: '100%',
    },
    instructionLabel: {
      ...theme.typography.label,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.sm,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    instruction: {
      ...theme.typography.body,
      color: theme.colors.text,
      lineHeight: 24,
    },
    tipContainer: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    tip: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    continuousNote: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
    },
    continuousNoteText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    footer: {
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    doneButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    doneButtonDisabled: {
      opacity: 0.5,
    },
    doneButtonText: {
      ...theme.typography.headingSmall,
      color: theme.colors.text,
    },
    waitTitle: {
      ...theme.typography.heading,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    waitTimer: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 64,
      fontWeight: '600',
      color: theme.colors.accent,
      marginBottom: theme.spacing.lg,
    },
    waitDescription: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    skipButton: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
    },
    skipButtonText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    // Skip today button (below Done button)
    skipTodayButton: {
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    skipTodayButtonText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    pendingContainer: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      alignItems: 'center',
      width: '100%',
    },
    pendingIcon: {
      fontSize: 48,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    pendingText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    configureButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
      width: '100%',
      minHeight: 50,
      justifyContent: 'center',
    },
    configureButtonText: {
      ...theme.typography.headingSmall,
      fontWeight: '600',
      color: theme.colors.text,
    },
  });
}

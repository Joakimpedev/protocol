import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { markSessionCompleted } from '../services/sessionService';
import { RoutineSection, RoutineStep } from '../services/routineBuilder';
import { 
  trackStepSkip, 
  trackTimerSkip, 
  trackRoutineStartTime 
} from '../services/analyticsService';

interface SessionScreenProps {
  route: {
    params: {
      section: RoutineSection;
    };
  };
  navigation: any;
}

export default function SessionScreen({ route, navigation }: SessionScreenProps) {
  const { user } = useAuth();
  const { section } = route.params;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [waitTimerSeconds, setWaitTimerSeconds] = useState<number | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTrackedStartTime, setHasTrackedStartTime] = useState(false);
  
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

  const handleStepComplete = async () => {
    if (!currentStep) return;

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
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  // Wait screen
  if (isWaiting && waitTimerSeconds !== null) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.waitTitle}>Let it absorb...</Text>
          <Text style={styles.waitTimer}>{formatTimer(waitTimerSeconds)}</Text>
          <Text style={styles.waitDescription}>
            Waiting between steps improves product absorption.
          </Text>
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipWait}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main step screen
  const isContinuous = currentStep.session.is_continuous === true;

  // Get short description from ingredient, exercise, or baseStep
  let shortDescription: string | null = null;
  if (currentStep.ingredient?.short_description) {
    shortDescription = currentStep.ingredient.short_description.trim() || null;
  } else if (currentStep.exercise?.short_description) {
    shortDescription = currentStep.exercise.short_description.trim() || null;
  } else if (currentStep.baseStep?.short_description) {
    shortDescription = currentStep.baseStep.short_description.trim() || null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progressText}>{progressText}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.stepName}>{currentStep.displayName}</Text>
        
        {currentStep.productName && (
          <Text style={styles.productName}>{currentStep.productName}</Text>
        )}

        {shortDescription && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>What this does:</Text>
            <Text style={styles.description}>{shortDescription}</Text>
          </View>
        )}

        <View style={styles.instructionContainer}>
          <Text style={styles.instructionLabel}>Instructions:</Text>
          <Text style={styles.instruction}>{currentStep.session.action}</Text>
        </View>

        {currentStep.session.tip && (
          <View style={styles.tipContainer}>
            <Text style={styles.tip}>{currentStep.session.tip}</Text>
          </View>
        )}

        {isContinuous && (
          <View style={styles.continuousNote}>
            <Text style={styles.continuousNoteText}>
              This is a continuous practice. Complete when ready.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.doneButton, isLoading && styles.doneButtonDisabled]}
          onPress={handleStepComplete}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.doneButtonText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 0,
  },
  header: {
    padding: spacing.md,
    paddingTop: spacing.lg,
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
    backgroundColor: colors.background,
    overflow: 'visible',
  },
  progressText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepName: {
    ...typography.heading,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  productName: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  descriptionContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  descriptionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: 13,
  },
  instructionContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    width: '100%',
  },
  instructionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instruction: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  tipContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  tip: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continuousNote: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 4,
  },
  continuousNoteText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doneButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  doneButtonText: {
    ...typography.headingSmall,
    color: colors.text,
  },
  waitTitle: {
    ...typography.heading,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  waitTimer: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 64,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: spacing.lg,
  },
  waitDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  skipButton: {
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  skipButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  // Skip today button (below Done button)
  skipTodayButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipTodayButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});


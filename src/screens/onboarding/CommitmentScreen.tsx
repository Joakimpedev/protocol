import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

const HOLD_DURATION = 1500; // 1.5 seconds

export default function CommitmentScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.COMMITMENT);
  const { primaryProblem, content, reset } = useOnboarding();
  const [committed, setCommitted] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdStartTime = useRef<number | null>(null);
  const holdAnimationRef = useRef<any>(null);
  const completionPendingRef = useRef(false);

  const problem = primaryProblem ? content.problems[primaryProblem] : null;
  const dataStat = (problem as any)?.data_stat ?? '78% of users see visible improvements by week 6.';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const startHolding = () => {
    if (committed) return;

    setIsHolding(true);
    holdStartTime.current = Date.now();

    // Light haptic feedback on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate progress
    holdAnimationRef.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });

    holdAnimationRef.current.start(({ finished }: any) => {
      if (finished) {
        completionPendingRef.current = true;
        holdProgress.setValue(1); // Force 100% so bar renders fully
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCommitted(true);
        setIsHolding(false);
      }
    });
  };

  const stopHolding = () => {
    if (committed || completionPendingRef.current) return;

    // If user held long enough, treat as completed (handles release-at-exact-moment race)
    const heldDuration = holdStartTime.current ? Date.now() - holdStartTime.current : 0;
    if (heldDuration >= HOLD_DURATION - 50) {
      completionPendingRef.current = true;
      if (holdAnimationRef.current) holdAnimationRef.current.stop();
      holdProgress.setValue(1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCommitted(true);
      setIsHolding(false);
      holdStartTime.current = null;
      return;
    }

    setIsHolding(false);
    holdStartTime.current = null;

    if (holdAnimationRef.current) {
      holdAnimationRef.current.stop();
    }

    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleContinue = () => {
    // Use parent navigator so we target the nested onboarding stack (CommitmentScreen
    // is inside the stack that lives under the "OnboardingFlow" screen).
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('OnboardingFlow', { screen: 'TrialOffer' });
    } else {
      navigation.push('TrialOffer');
    }
  };

  const progressWidth = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, buttonWidth || 1],
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Ready to lock in?</Text>
        <View style={styles.dividerLine} />

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.statText}>{dataStat}</Text>

          <Text style={styles.bodyText}>
            This works — but only if you show up.{'\n'}
            Not perfect. Just consistent.
          </Text>

          <Text style={styles.promiseText}>
            This is your promise to yourself.
          </Text>

          <View
            style={[
              styles.holdButton,
              isHolding && styles.holdButtonActive,
              committed && styles.holdButtonCommitted,
            ]}
            onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
            onTouchStart={startHolding}
            onTouchEnd={stopHolding}
            onTouchCancel={stopHolding}
          >
            <Animated.View
              style={[
                styles.holdProgress,
                { width: progressWidth },
              ]}
            />
            <Text style={[styles.holdButtonText, committed && styles.holdButtonTextCommitted]}>
              {committed ? 'Committed ✓' : 'Hold to commit'}
            </Text>
          </View>

          {committed && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <AnimatedButton style={styles.continueButton} onPress={handleContinue}>
                <Text style={styles.continueButtonText}>Continue</Text>
              </AnimatedButton>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      <OnboardingDevMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heading: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  statText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  bodyText: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  promiseText: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xl,
  },
  holdButton: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  holdButtonActive: {
    borderColor: colors.accentSecondary,
  },
  holdButtonCommitted: {
    borderColor: colors.borderGreen,
    backgroundColor: colors.surfaceGreen,
  },
  holdProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.accent,
  },
  holdButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    zIndex: 1,
  },
  holdButtonTextCommitted: {
    color: '#000000',
  },
  continueButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

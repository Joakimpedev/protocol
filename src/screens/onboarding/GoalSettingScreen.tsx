import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import Slider from '@react-native-community/slider';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

const MIN_WEEKS = 6;
const MAX_WEEKS = 26;

export default function GoalSettingScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.GOAL_SETTING);
  const { data, updateData, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();
  const [weeks, setWeeks] = useState<number>(data.expectedWeeks ?? 12);
  const [sliderWidth, setSliderWidth] = useState<number>(0);

  const getDisplayText = (weeks: number): string => {
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  };

  const getThumbPosition = (): number => {
    const percentage = (weeks - MIN_WEEKS) / (MAX_WEEKS - MIN_WEEKS);
    return percentage * sliderWidth;
  };

  const handleSliderLayout = (event: LayoutChangeEvent) => {
    setSliderWidth(event.nativeEvent.layout.width);
  };

  const handleContinue = () => {
    updateData({ expectedWeeks: weeks });
    navigation.navigate('TimelineStats');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentSection}>
        <Text style={styles.question}>How long do you believe it will take to see real change?</Text>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>{DIVIDER}</Text>

        <View style={styles.sliderSection}>
          <View style={styles.sliderContainer}>
            {sliderWidth > 0 && (
              <View style={[styles.thumbLabel, { left: getThumbPosition() }]}>
                <Text style={styles.thumbLabelText}>{getDisplayText(weeks)}</Text>
              </View>
            )}
            <View onLayout={handleSliderLayout}>
              <Slider
                style={styles.slider}
                minimumValue={MIN_WEEKS}
                maximumValue={MAX_WEEKS}
                step={1}
                value={weeks}
                onValueChange={setWeeks}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
            </View>
          </View>

          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>{MIN_WEEKS} weeks</Text>
            <Text style={styles.sliderLabel}>{MAX_WEEKS} weeks</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <OnboardingDevMenu />
        <AnimatedButton style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  question: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  dividerText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  sliderSection: {
    marginTop: spacing.xl,
  },
  sliderContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  thumbLabel: {
    position: 'absolute',
    top: -40,
    transform: [{ translateX: -30 }],
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  thumbLabelText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    color: colors.textMuted,
  },
  bottomSection: {
    marginTop: spacing.md,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
});

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';
import { requestTrackingPermission } from '../../services/tiktok';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

const OPTIONS = [
  { value: '10', label: '10 min - Morning OR evening routine' },
  { value: '20', label: '20 min - Both routines' },
  { value: '30', label: '30+ min - Full protocol + exercises' },
] as const;

export default function TimeCommitmentScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.TIME_COMMITMENT);
  const { data, updateData, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();
  const [selected, setSelected] = useState<string | null>(data.timeCommitment ?? null);

  const handleContinue = async () => {
    if (!selected) return;
    updateData({ timeCommitment: selected });

    // Request ATT permission for TikTok tracking (iOS only, non-blocking)
    try {
      await requestTrackingPermission();
    } catch (error) {
      console.warn('[TimeCommitment] ATT request failed (non-critical):', error);
    }

    navigation.navigate('MiniTimelinePreview');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentSection}>
        <Text style={styles.question}>Daily time available?</Text>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>{DIVIDER}</Text>
        <View style={styles.optionsList}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => setSelected(opt.value)}
              >
                <Text style={styles.radio}>{isSelected ? '●' : '○'}</Text>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <OnboardingDevMenu />
        <AnimatedButton
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selected}
        >
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
    marginBottom: spacing.lg,
  },
  optionsList: {
    marginTop: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  radio: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    marginRight: spacing.md,
    color: colors.text,
  },
  optionLabel: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
  },
  optionLabelSelected: {
    color: colors.text,
    fontWeight: '600',
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
});

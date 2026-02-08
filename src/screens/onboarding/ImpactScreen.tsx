import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

export default function ImpactScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.IMPACT);
  const { data, updateData, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();
  const [selected, setSelected] = useState<string[]>(data.impacts ?? []);

  const impactOptions = content.impact_options ?? [];

  const toggleImpact = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    setSelected(newSelected);
  };

  const handleContinue = () => {
    updateData({ impacts: selected });
    navigation.navigate('GoalSetting');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentSection}>
        <Text style={styles.heading}>How is this affecting you?</Text>
        <Text style={styles.subheading}>Select all that apply.</Text>
        <View style={styles.divider} />
        <View style={styles.optionsList}>
          {impactOptions.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => toggleImpact(opt.id)}
              >
                <Text style={styles.checkbox}>{isSelected ? '■' : '□'}</Text>
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
  heading: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
  },
  subheading: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
  checkbox: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    marginRight: spacing.md,
    color: colors.text,
  },
  optionLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  optionLabelSelected: {
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
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
});

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';

export default function QuestionsScreen({ navigation }: any) {
  const { data, updateData } = useOnboarding();
  const [timeAvailability, setTimeAvailability] = useState<'10' | '20' | '30' | undefined>(
    data.timeAvailability
  );
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced' | undefined>(
    data.experienceLevel
  );
  const [hasCurrentRoutine, setHasCurrentRoutine] = useState<boolean | undefined>(
    data.hasCurrentRoutine
  );

  const handleContinue = () => {
    // Validate required questions
    if (!timeAvailability || !experienceLevel || hasCurrentRoutine === undefined) {
      return;
    }

    updateData({
      timeAvailability,
      experienceLevel,
      hasCurrentRoutine,
    });

    navigation.navigate('ProtocolLoading');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentSection}>
        <Text style={styles.heading}>Some quick questions</Text>

        <View style={styles.questionsContainer}>
          {/* Time availability - always shown */}
          <View style={styles.questionSection}>
            <View style={styles.divider} />
            <Text style={styles.questionLabel}>How much time can you dedicate daily?</Text>
            {(['10', '20', '30'] as const).map((time) => (
              <TouchableOpacity
                key={time}
                style={styles.option}
                onPress={() => setTimeAvailability(time)}
              >
                <Text style={styles.radio}>{timeAvailability === time ? '●' : '○'}</Text>
                <Text style={[styles.optionText, timeAvailability === time && styles.optionTextSelected]}>
                  {time} minutes
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Experience level - always shown */}
          <View style={styles.questionSection}>
            <View style={styles.divider} />
            <Text style={styles.questionLabel}>How familiar are you with skincare?</Text>
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={styles.option}
                onPress={() => setExperienceLevel(level)}
              >
                <Text style={styles.radio}>{experienceLevel === level ? '●' : '○'}</Text>
                <Text style={[styles.optionText, experienceLevel === level && styles.optionTextSelected]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Current routine - always shown */}
          <View style={styles.questionSection}>
            <View style={styles.divider} />
            <Text style={styles.questionLabel}>Do you currently have a skincare routine?</Text>
            {([true, false] as const).map((value) => (
              <TouchableOpacity
                key={value ? 'yes' : 'no'}
                style={styles.option}
                onPress={() => setHasCurrentRoutine(value)}
              >
                <Text style={styles.radio}>{hasCurrentRoutine === value ? '●' : '○'}</Text>
                <Text style={[styles.optionText, hasCurrentRoutine === value && styles.optionTextSelected]}>
                  {value ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          (!timeAvailability || !experienceLevel || hasCurrentRoutine === undefined) && styles.buttonDisabled,
        ]}
        onPress={handleContinue}
        disabled={!timeAvailability || !experienceLevel || hasCurrentRoutine === undefined}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
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
  questionsContainer: {
    marginTop: spacing.sm,
  },
  questionSection: {
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  questionLabel: {
    ...typography.body,
    marginBottom: spacing.md,
    color: colors.text,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  radio: {
    ...typography.body,
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    marginRight: spacing.md,
    color: colors.text,
  },
  optionText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.text,
    fontWeight: '600',
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


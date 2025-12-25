import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';

export default function QuestionsScreen({ navigation }: any) {
  const { data, updateData } = useOnboarding();
  const [skinType, setSkinType] = useState<'oily' | 'dry' | 'combination' | 'normal' | undefined>(
    data.skinType
  );
  const [budget, setBudget] = useState<'low' | 'medium' | 'flexible' | undefined>(data.budget);
  const [dailyTime, setDailyTime] = useState<10 | 20 | 30 | undefined>(data.dailyTime);

  const selectedCategories = data.selectedCategories || [];
  const hasOily = selectedCategories.includes('oily_skin');
  const hasDry = selectedCategories.includes('dry_skin');
  const hasCombination = hasOily && hasDry;
  const hasSkincareCategory = selectedCategories.some(
    (cat) => cat !== 'jawline' && cat !== 'facial_hair'
  );
  const hasJawline = selectedCategories.includes('jawline');
  const hasExercises = hasJawline || selectedCategories.includes('facial_hair');

  // Determine which questions to show
  const showSkinType =
    hasSkincareCategory && !hasOily && !hasDry && !hasCombination;
  const showBudget = hasSkincareCategory;
  const showTime = hasExercises || hasSkincareCategory;

  const handleContinue = () => {
    // Validate required questions
    if (showSkinType && !skinType) {
      return;
    }
    if (showBudget && !budget) {
      return;
    }
    if (showTime && !dailyTime) {
      return;
    }

    // If combination skin detected, set skin type
    const finalSkinType = hasCombination ? 'combination' : skinType;

    updateData({
      skinType: finalSkinType,
      budget,
      dailyTime,
    });

    navigation.navigate('OnboardingSignUp');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentSection}>
        <Text style={styles.heading}>Some quick questions</Text>

        <View style={styles.questionsContainer}>
          {showSkinType && (
            <View style={styles.questionSection}>
              <View style={styles.divider} />
              <Text style={styles.questionLabel}>What is your skin type?</Text>
              {(['oily', 'dry', 'combination', 'normal'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.option}
                  onPress={() => setSkinType(type)}
                >
                  <Text style={styles.radio}>{skinType === type ? '●' : '○'}</Text>
                  <Text style={[styles.optionText, skinType === type && styles.optionTextSelected]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showBudget && (
            <View style={styles.questionSection}>
              <View style={styles.divider} />
              <Text style={styles.questionLabel}>What is your budget for products?</Text>
              {(['low', 'medium', 'flexible'] as const).map((budgetOption) => (
                <TouchableOpacity
                  key={budgetOption}
                  style={styles.option}
                  onPress={() => setBudget(budgetOption)}
                >
                  <Text style={styles.radio}>{budget === budgetOption ? '●' : '○'}</Text>
                  <Text
                    style={[styles.optionText, budget === budgetOption && styles.optionTextSelected]}
                  >
                    {budgetOption === 'low' && 'Low (~$30/month)'}
                    {budgetOption === 'medium' && 'Medium (~$60/month)'}
                    {budgetOption === 'flexible' && 'Flexible'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showTime && (
            <View style={styles.questionSection}>
              <View style={styles.divider} />
              <Text style={styles.questionLabel}>How much time daily can you commit to?</Text>
              {([10, 20, 30] as const).map((time) => (
                <TouchableOpacity
                  key={time}
                  style={styles.option}
                  onPress={() => setDailyTime(time)}
                >
                  <Text style={styles.radio}>{dailyTime === time ? '●' : '○'}</Text>
                  <Text style={[styles.optionText, dailyTime === time && styles.optionTextSelected]}>
                    {time} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          ((showSkinType && !skinType) ||
            (showBudget && !budget) ||
            (showTime && !dailyTime)) &&
            styles.buttonDisabled,
        ]}
        onPress={handleContinue}
        disabled={
          (showSkinType && !skinType) || (showBudget && !budget) || (showTime && !dailyTime)
        }
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


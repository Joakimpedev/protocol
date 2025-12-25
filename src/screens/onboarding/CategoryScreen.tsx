import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { CATEGORIES, MAX_CATEGORIES } from '../../constants/categories';

export default function CategoryScreen({ navigation }: any) {
  const { data, updateData } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(data.selectedCategories || []);

  // Pre-check AI-detected categories on mount
  useEffect(() => {
    if (data.aiCategories && data.aiCategories.length > 0) {
      // Pre-select AI categories, but respect max limit
      const preSelected = data.aiCategories.slice(0, MAX_CATEGORIES);
      setSelected(preSelected);
      updateData({ selectedCategories: preSelected });
    }
  }, []);

  const toggleCategory = (categoryId: string) => {
    if (selected.includes(categoryId)) {
      // Deselect
      const newSelected = selected.filter((id) => id !== categoryId);
      setSelected(newSelected);
      updateData({ selectedCategories: newSelected });
    } else {
      // Check max limit
      if (selected.length >= MAX_CATEGORIES) {
        Alert.alert('Maximum reached', 'Pick your top 3');
        return;
      }
      // Select
      const newSelected = [...selected, categoryId];
      setSelected(newSelected);
      updateData({ selectedCategories: newSelected });
    }
  };

  const handleContinue = () => {
    if (selected.length === 0) {
      Alert.alert('Select at least one', 'Choose what you want to improve');
      return;
    }
    navigation.navigate('Questions');
  };

  // Check if both oily and dry are selected (combination skin)
  const hasCombination = selected.includes('oily_skin') && selected.includes('dry_skin');

  return (
    <View style={styles.container}>
      <View style={styles.contentSection}>
        <Text style={styles.heading}>Select all that apply</Text>

        <View style={styles.categoriesList}>
          {CATEGORIES.map((category) => {
            const isSelected = selected.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                onPress={() => toggleCategory(category.id)}
              >
                <Text style={styles.checkbox}>{isSelected ? '■' : '□'}</Text>
                <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomSection}>
        {hasCombination && (
          <Text style={styles.combinationNote}>
            Oily + Dry = Combination skin type
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, selected.length === 0 && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={selected.length === 0}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
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
  categoriesList: {
    marginTop: spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 44, // Larger touch target
  },
  categoryItemSelected: {
    backgroundColor: colors.surface,
  },
  checkbox: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    marginRight: spacing.md,
    color: colors.text,
  },
  categoryLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  categoryLabelSelected: {
    fontWeight: '600',
  },
  bottomSection: {
    marginTop: spacing.md,
  },
  combinationNote: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    textAlign: 'center',
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


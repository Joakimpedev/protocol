import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { anyRequiresProducts } from '../../utils/onboardingUtils';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

export default function ProductsPrimerScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.PRODUCTS_PRIMER);
  const { data, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();

  const selectedProblems = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories ?? [];

  // Simple logic: If ONLY jawline is selected, skip shopping. Otherwise show it.
  const isOnlyJawline = selectedProblems.length === 1 && selectedProblems[0] === 'jawline';
  const needsProducts = !isOnlyJawline;

  console.log('[ProductsPrimer] selectedProblems:', selectedProblems);
  console.log('[ProductsPrimer] isOnlyJawline:', isOnlyJawline);
  console.log('[ProductsPrimer] needsProducts:', needsProducts);

  const handleContinue = () => {
    if (needsProducts) {
      console.log('[ProductsPrimer] Navigating to Shopping');
      navigation.navigate('Shopping');
    } else {
      console.log('[ProductsPrimer] Navigating to WhyThisWorks (ONLY JAWLINE, skip shopping)');
      navigation.navigate('WhyThisWorks');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Let's talk products.</Text>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{DIVIDER}</Text>

        {needsProducts ? (
          <>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>01</Text>
              <Text style={styles.stepText}>Your routine only works if you have what you need.</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>02</Text>
              <Text style={styles.stepText}>We'll show you exactly which ingredients matter and how to find them.</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>03</Text>
              <Text style={styles.stepText}>Mark what you already have, what you'll get, or skip.</Text>
            </View>
            <View style={styles.timeEstimate}>
              <Text style={styles.timeEstimateText}>~ 2 minutes</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>01</Text>
              <Text style={styles.stepText}>Your protocol is exercise-based. No products needed.</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>02</Text>
              <Text style={styles.stepText}>We'll show you the exercises and how to track your progress.</Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomSection}>
        <OnboardingDevMenu />
        <AnimatedButton style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>{needsProducts ? "Show me" : 'Continue'}</Text>
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
    marginBottom: spacing.sm,
  },
  dividerText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 13,
    color: colors.textMuted,
    marginRight: spacing.md,
    marginTop: 3,
    width: 22,
  },
  stepText: {
    ...typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    flex: 1,
  },
  timeEstimate: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  timeEstimateText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  bottomSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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

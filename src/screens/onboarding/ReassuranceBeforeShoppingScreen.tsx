import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { anyRequiresProducts } from '../../utils/onboardingUtils';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';
import { CATEGORIES } from '../../constants/categories';

function getProblemDisplayName(problemId: string | null): string {
  if (!problemId) return 'protocol';
  const c = CATEGORIES.find((cat) => cat.id === problemId);
  return c ? c.label.split(' / ')[0].toLowerCase() : problemId.toLowerCase().replace(/_/g, ' ');
}

const LINE_STAGGER_MS = 400;
const LINE_ANIM_DURATION = 500;

export default function ReassuranceBeforeShoppingScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.REASSURANCE_BEFORE_SHOPPING);
  const { data, primaryProblem, totalRoutineTime, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();

  const problem = primaryProblem ? content.problems[primaryProblem] : null;
  const reassuranceEnding = (problem as any)?.reassurance_ending ?? 'You will look back and see how much has changed.';
  const problemName = getProblemDisplayName(primaryProblem);

  const lineAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    lineAnims.forEach((anim) => anim.setValue(0));

    lineAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * LINE_STAGGER_MS),
        Animated.timing(anim, {
          toValue: 1,
          duration: LINE_ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const selectedProblems = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories ?? [];

  // Simple logic: If ONLY jawline is selected, skip shopping. Otherwise show it.
  const isOnlyJawline = selectedProblems.length === 1 && selectedProblems[0] === 'jawline';
  const needsProducts = !isOnlyJawline;

  console.log('[ReassuranceBeforeShopping] selectedProblems:', selectedProblems);
  console.log('[ReassuranceBeforeShopping] isOnlyJawline:', isOnlyJawline);
  console.log('[ReassuranceBeforeShopping] needsProducts:', needsProducts);

  const handleContinue = () => {
    if (needsProducts) {
      console.log('[ReassuranceBeforeShopping] Navigating to ProductsPrimer');
      navigation.navigate('ProductsPrimer');
    } else {
      console.log('[ReassuranceBeforeShopping] Navigating to WhyThisWorks (ONLY JAWLINE)');
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
        <Animated.View style={{ opacity: lineAnims[0], transform: [{ translateY: lineAnims[0].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <Text style={styles.mainText}>You just made the decision.</Text>
        </Animated.View>

        <Animated.View style={{ opacity: lineAnims[1], transform: [{ translateY: lineAnims[1].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <Text style={styles.motivationText}>Most guys quit before they start.</Text>
          <Text style={styles.motivationText}>You're already ahead.</Text>
        </Animated.View>

        <Animated.View style={[styles.endingBox, { opacity: lineAnims[2], transform: [{ translateY: lineAnims[2].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Text style={styles.ending}>{reassuranceEnding}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: lineAnims[3], transform: [{ translateY: lineAnims[3].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <Text style={styles.almostDone}>Almost done. Just need to show you the products.</Text>
        </Animated.View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  mainText: {
    ...typography.headingSmall,
    color: colors.accentSecondary,
    marginBottom: spacing.xl,
  },
  motivationText: {
    ...typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  endingBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.borderGreen,
    paddingLeft: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl * 1.5,
  },
  ending: {
    ...typography.body,
    fontSize: 17,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  almostDone: {
    ...typography.body,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
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

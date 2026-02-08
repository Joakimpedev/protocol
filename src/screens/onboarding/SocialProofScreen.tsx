import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

const IMAGE_ASPECT_RATIO = 400 / 700;

const TESTIMONIALS = [
  {
    name: 'Markus',
    age: 26,
    problems: ['Dry skin', 'Patchy beard'],
    beforeImage: require('../../../assets/images/markus_dry_before.jpg'),
    afterImage: require('../../../assets/images/markus_dry_after.jpg'),
  },
  {
    name: 'Jake',
    age: 29,
    problems: ['Acne', 'Hyperpigmentation'],
    beforeImage: require('../../../assets/images/jake_acne_before.jpg'),
    afterImage: require('../../../assets/images/jake_acne_after.jpg'),
  },
  {
    name: 'Dev',
    age: 21,
    problems: ['Undefined jawline'],
    beforeImage: require('../../../assets/images/dev_jawline_before.jpg'),
    afterImage: require('../../../assets/images/dev_jawline_after.jpg'),
  },
];

const CARD_STAGGER_MS = 200;
const CARD_ANIM_DURATION = 400;

export default function SocialProofScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.SOCIAL_PROOF);
  const { reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();
  const insets = useSafeAreaInsets();

  const cardAnims = useRef(TESTIMONIALS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Reset all animations
    cardAnims.forEach((anim) => anim.setValue(0));

    // Stagger card animations
    TESTIMONIALS.forEach((_, index) => {
      Animated.sequence([
        Animated.delay(index * CARD_STAGGER_MS),
        Animated.timing(cardAnims[index], {
          toValue: 1,
          duration: CARD_ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const handleContinue = () => {
    navigation.navigate('WhyOthersFailed');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.xl + insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Real transformations with Protocol</Text>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{DIVIDER}</Text>
        </View>

        <View style={styles.testimonialsList}>
          {TESTIMONIALS.map((testimonial, index) => {
            const anim = cardAnims[index];
            return (
              <Animated.View
                key={index}
                style={[
                  styles.testimonialCard,
                  {
                    opacity: anim,
                    transform: [
                      {
                        translateX: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.textSection}>
                    <Text style={styles.nameAge}>
                      {testimonial.name}, {testimonial.age}
                    </Text>
                    <Text style={styles.struggledLabel}>Struggled with:</Text>
                    {testimonial.problems.map((problem, pIndex) => (
                      <Text key={pIndex} style={styles.problem}>
                        • {problem}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.photosSection}>
                    <View style={styles.photoContainer}>
                      <Image source={testimonial.beforeImage} style={styles.photo} resizeMode="cover" />
                      <View style={styles.photoLabel}>
                        <Text style={styles.photoLabelText}>Before</Text>
                      </View>
                    </View>
                    <View style={styles.photoContainer}>
                      <Image source={testimonial.afterImage} style={styles.photo} resizeMode="cover" />
                      <View style={styles.photoLabelAfter}>
                        <Text style={styles.photoLabelTextAfter}>After</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
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
    paddingBottom: spacing.xl,
  },
  headingContainer: {
    marginBottom: spacing.md,
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
  },
  testimonialsList: {
    marginTop: spacing.sm,
  },
  testimonialCard: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  textSection: {
    flex: 1,
    justifyContent: 'center',
  },
  nameAge: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  struggledLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  problem: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  photosSection: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoContainer: {
    width: 70,
    aspectRatio: IMAGE_ASPECT_RATIO,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.background,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  photoLabelText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 8,
    color: colors.text,
    textAlign: 'center',
  },
  photoLabelAfter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 40, 0, 0.8)',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  photoLabelTextAfter: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 8,
    color: colors.accentSecondary,
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

import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';
import { CATEGORIES } from '../../constants/categories';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

// 500x700 pixels - use 5/7 aspect ratio
const IMAGE_ASPECT_RATIO = 500 / 700;

const IMAGE_MAP: Record<string, number> = {
  'ethan_acne_before.jpg': require('../../../assets/images/ethan_acne_before.jpg'),
  'ethan_acne_after.jpg': require('../../../assets/images/ethan_acne_after.jpg'),
  'saeid_jawline_before.jpg': require('../../../assets/images/saeid_jawline_before.jpg'),
  'saeid_jawline_after.jpg': require('../../../assets/images/saeid_jawline_after.jpg'),
  'alex_beard_before.jpg': require('../../../assets/images/alex_beard_before.jpg'),
  'alex_beard_after.jpg': require('../../../assets/images/alex_beard_after.jpg'),
};

const FALLBACK_USERS = [
  { id: 'ethan_22_acne', name: 'Ethan', problemLabel: 'Acne', before: 'ethan_acne_before.jpg', after: 'ethan_acne_after.jpg', weeks: 10 },
  { id: 'saeid_19_jawline', name: 'Saeid', problemLabel: 'Jawline', before: 'saeid_jawline_before.jpg', after: 'saeid_jawline_after.jpg', weeks: 32 },
  { id: 'alex_20_facial_hair', name: 'Alex', problemLabel: 'Beard', before: 'alex_beard_before.jpg', after: 'alex_beard_after.jpg', weeks: 44 },
];

function getProblemDisplayName(problemId: string): string {
  const cat = CATEGORIES.find((c) => c.id === problemId);
  if (cat) return cat.label.split(' / ')[0];
  return problemId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFirstUserImpactLabel(
  userImpactIds: string[],
  impactOptions: Array<{ id: string; label: string }>
): string | null {
  if (!userImpactIds.length) return null;
  for (const opt of impactOptions) {
    if (userImpactIds.includes(opt.id)) return opt.label;
  }
  return null;
}

export default function WOWMomentScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.WOW_MOMENT);
  const { data, primaryProblem, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const wowUsers = (content as any).wow_users ?? [];
  const impactOptions: Array<{ id: string; label: string }> = (content as any).impact_options ?? [];
  const userImpacts = data.impacts ?? [];

  const matchedUser = primaryProblem
    ? wowUsers.find((u: { problems: string[] }) => (u.problems || []).includes(primaryProblem))
    : null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleContinue = () => {
    navigation.navigate('Commitment');
  };

  // Match found: personalized single person layout
  if (matchedUser) {
    const beforeSrc = IMAGE_MAP[(matchedUser as any).before_photo];
    const afterSrc = IMAGE_MAP[(matchedUser as any).after_photo];
    const name = (matchedUser as any).name ?? '';
    const age = (matchedUser as any).age ?? '';
    const problems = (matchedUser as any).problems ?? [];
    const weeksElapsed = (matchedUser as any).weeks_elapsed ?? 0;

    const mainProblemLabel = problems.length ? getProblemDisplayName(problems[0]) : '';
    const secondBullet = getFirstUserImpactLabel(userImpacts, impactOptions);

    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.xl + insets.top }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>This is {name}, {age}.</Text>
          <View style={styles.dividerLine} />

          <Animated.View style={[styles.wowContent, { opacity: fadeAnim }]}>
            <View style={styles.wowImagesRow}>
              {beforeSrc != null && (
                <View style={styles.wowImageWrap}>
                  <Image source={beforeSrc} style={styles.wowImage} resizeMode="contain" />
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekBadgeText}>Week 0</Text>
                  </View>
                </View>
              )}
              {afterSrc != null && (
                <View style={styles.wowImageWrap}>
                  <Image source={afterSrc} style={styles.wowImage} resizeMode="contain" />
                  <View style={styles.weekBadgeAfter}>
                    <Text style={styles.weekBadgeTextAfter}>Week {weeksElapsed}</Text>
                  </View>
                </View>
              )}
            </View>

            <Text style={styles.struggledWith}>{name} struggled with:</Text>
            <Text style={styles.bullet}>• {mainProblemLabel}</Text>
            {secondBullet != null && (
              <Text style={styles.bullet}>• {secondBullet}</Text>
            )}
            <Text style={styles.justLikeYou}>Just like you.</Text>

            <Text style={styles.followedLine}>
              {name} followed Protocol for {weeksElapsed} weeks.
            </Text>
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

  // No match: fallback grid of all 3 users
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.xl + insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>This is what Protocol does.</Text>
        <View style={styles.dividerLine} />

        <Animated.View style={[styles.fallbackContent, { opacity: fadeAnim }]}>
          <View style={styles.fallbackGrid}>
            {FALLBACK_USERS.map((user) => (
              <View key={user.id} style={styles.fallbackCard}>
                <View style={styles.fallbackImageWrap}>
                  <Image
                    source={IMAGE_MAP[user.before]}
                    style={styles.fallbackImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.fallbackImageWrap}>
                  <Image
                    source={IMAGE_MAP[user.after]}
                    style={styles.fallbackImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.fallbackLabel}>{user.name} – {user.problemLabel}</Text>
                <Text style={styles.fallbackWeek}>Week 0 → Week {user.weeks}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.fallbackClosing}>Protocol works.</Text>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.md,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  wowContent: {
    marginTop: spacing.sm,
  },
  wowImagesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  wowImageWrap: {
    width: '47%',
    aspectRatio: IMAGE_ASPECT_RATIO,
    position: 'relative',
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  wowImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  weekBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 2,
  },
  weekBadgeText: {
    ...typography.label,
    fontSize: 10,
    color: colors.text,
  },
  weekBadgeAfter: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 40, 0, 0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 2,
  },
  weekBadgeTextAfter: {
    ...typography.label,
    fontSize: 10,
    color: colors.accentSecondary,
  },
  struggledWith: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bullet: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  justLikeYou: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  followedLine: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
  },
  fallbackContent: {
    marginTop: spacing.sm,
  },
  fallbackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  fallbackCard: {
    width: '30%',
    alignItems: 'center',
  },
  fallbackImageWrap: {
    width: '100%',
    aspectRatio: IMAGE_ASPECT_RATIO,
    borderRadius: 4,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  fallbackLabel: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  fallbackWeek: {
    ...typography.label,
    fontSize: 11,
    color: colors.textMuted,
  },
  fallbackClosing: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
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

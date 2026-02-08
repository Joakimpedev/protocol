import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { getPage9FollowUp } from '../../utils/onboardingUtils';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

const TITLE_REVEAL_MS = 30;
const CURSOR_BLINK_MS = 530;
const NEED_STAGGER_MS = 350;
const NEED_ANIM_DURATION = 450;

export default function WhyOthersFailedScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.WHY_OTHERS_FAILED);
  const { data, primaryProblem, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();

  const problem = primaryProblem ? content.problems[primaryProblem] : null;
  const whyFailed = problem?.why_others_failed as {
    title: string;
    explanation: string;
    your_routine_needs: string[];
  } | undefined;

  const title = whyFailed?.title ?? '';
  const explanation = whyFailed?.explanation ?? '';
  const needs = whyFailed?.your_routine_needs ?? [];

  const wordRanges = (() => {
    if (!title) return [];
    const list: { word: string; start: number }[] = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(title)) !== null) {
      list.push({ word: m[0], start: m.index });
    }
    return list;
  })();

  const [revealedCount, setRevealedCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [titleComplete, setTitleComplete] = useState(false);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bodyFadeAnim = useRef(new Animated.Value(0)).current;
  const MAX_NEEDS = 8;
  const needAnims = useRef(
    Array.from({ length: MAX_NEEDS }, () => new Animated.Value(0))
  ).current;

  const showPage9 = getPage9FollowUp(data.selectedProblems ?? [], primaryProblem, content);

  // Terminal typewriter for title (word-boundary safe)
  useEffect(() => {
    if (!title) return;
    setRevealedCount(0);
    setTitleComplete(false);

    let count = 0;
    revealIntervalRef.current = setInterval(() => {
      if (count < title.length) {
        count += 1;
        setRevealedCount(count);
      } else {
        if (revealIntervalRef.current) {
          clearInterval(revealIntervalRef.current);
          revealIntervalRef.current = null;
        }
        setTitleComplete(true);
      }
    }, TITLE_REVEAL_MS);

    return () => {
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
    };
  }, [title]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((p) => !p), CURSOR_BLINK_MS);
    return () => clearInterval(interval);
  }, []);

  // When title complete: fade in body, then stagger need items
  useEffect(() => {
    if (!titleComplete) return;

    needAnims.forEach((a) => a.setValue(0));

    Animated.timing(bodyFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      needs.forEach((_, index) => {
        const anim = needAnims[index];
        if (!anim) return;
        Animated.sequence([
          Animated.delay(index * NEED_STAGGER_MS),
          Animated.timing(anim, {
            toValue: 1,
            duration: NEED_ANIM_DURATION,
            useNativeDriver: true,
          }),
        ]).start();
      });
    });
  }, [titleComplete, needs.length]);

  const handleContinue = () => {
    if (showPage9) {
      navigation.navigate('ConditionalFollowUp');
    } else {
      navigation.navigate('TimeCommitment');
    }
  };

  if (!primaryProblem || !whyFailed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            {wordRanges.map(({ word, start }, index) => {
              const visibleLen = Math.min(word.length, Math.max(0, revealedCount - start));
              const visiblePart = word.slice(0, visibleLen);
              const hiddenPart = word.slice(visibleLen);
              const space = index < wordRanges.length - 1 ? ' ' : '';
              return (
                <Text key={index} style={styles.titleWord}>
                  <Text style={styles.titleRevealed}>{visiblePart}</Text>
                  <Text style={styles.titleHidden}>{hiddenPart}</Text>
                  {space ? (
                    <Text style={revealedCount > start + word.length ? styles.titleRevealed : styles.titleHidden}>
                      {space}
                    </Text>
                  ) : null}
                </Text>
              );
            })}
            {revealedCount >= title.length && title.length > 0 && (
              <View style={styles.cursorWrapper}>
                <View style={[styles.cursor, !showCursor && styles.cursorHidden]} />
              </View>
            )}
          </View>
        </View>

        <Animated.View style={[styles.bodySection, { opacity: bodyFadeAnim }]}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{DIVIDER}</Text>

          <Text style={styles.explanation}>{explanation}</Text>
          <Text style={styles.needsHeading}>Your routine needs:</Text>
          <View style={styles.needsList}>
            {needs.map((need: string, index: number) => {
              const anim = needAnims[index];
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.needCard,
                    {
                      opacity: anim,
                      transform: [
                        {
                          translateY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [14, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.needText}>• {need}</Text>
                </Animated.View>
              );
            })}
          </View>
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
  titleContainer: {
    marginBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    minHeight: 32,
  },
  titleWord: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  titleRevealed: {
    color: colors.text,
  },
  titleHidden: {
    color: 'transparent',
  },
  cursorWrapper: {
    marginLeft: 4,
    width: 12,
    height: 2,
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  cursor: {
    width: 12,
    height: 2,
    backgroundColor: colors.text,
  },
  cursorHidden: {
    opacity: 0,
  },
  bodySection: {
    marginTop: spacing.sm,
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
  explanation: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  needsHeading: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  needsList: {
    marginBottom: spacing.lg,
  },
  needCard: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  needText: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
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

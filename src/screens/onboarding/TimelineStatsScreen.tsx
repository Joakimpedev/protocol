import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

interface Milestone {
  week: number;
  description: string;
}

const TITLE_REVEAL_MS = 30;
const CURSOR_BLINK_MS = 530;
const MILESTONE_STAGGER_MS = 450;
const MILESTONE_ANIM_DURATION = 500;

function lerpHex(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => {
    const n = h.replace('#', '');
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function TimelineStatsScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.TIMELINE_STATS);
  const { primaryProblem, data, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();

  const problem = primaryProblem ? content.problems[primaryProblem] : null;
  const severityLevel = data.severityLevel ?? null;
  const timelineStats = problem?.timeline_stats as Record<string, { intro: string; milestones: Milestone[] }> | undefined;
  const variant = severityLevel && timelineStats ? timelineStats[severityLevel] : null;
  const intro = variant?.intro ?? '';
  const milestones = variant?.milestones ?? [];

  // Word boundaries in intro so we can render one Text per word (no mid-word wrap) but reveal char-by-char
  const wordRanges = (() => {
    if (!intro) return [];
    const list: { word: string; start: number }[] = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(intro)) !== null) {
      list.push({ word: m[0], start: m.index });
    }
    return list;
  })();

  const [revealedCount, setRevealedCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [titleComplete, setTitleComplete] = useState(false);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bodyFadeAnim = useRef(new Animated.Value(0)).current;
  const MAX_MILESTONES = 5;
  const milestoneAnims = useRef(
    Array.from({ length: MAX_MILESTONES }, () => new Animated.Value(0))
  ).current;

  // Terminal typewriter: reveal one character at a time (words stay in single Text so no mid-word wrap)
  useEffect(() => {
    if (!intro) return;
    setRevealedCount(0);
    setTitleComplete(false);

    let count = 0;
    revealIntervalRef.current = setInterval(() => {
      if (count < intro.length) {
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
  }, [intro]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setShowCursor((p) => !p), CURSOR_BLINK_MS);
    return () => clearInterval(interval);
  }, []);

  // When title is complete: fade in divider + body area, then stagger milestones
  useEffect(() => {
    if (!titleComplete || milestones.length === 0) return;

    milestoneAnims.forEach((a) => a.setValue(0));

    Animated.timing(bodyFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      milestones.forEach((_, index) => {
        const anim = milestoneAnims[index];
        if (!anim) return;
        Animated.sequence([
          Animated.delay(index * MILESTONE_STAGGER_MS),
          Animated.timing(anim, {
            toValue: 1,
            duration: MILESTONE_ANIM_DURATION,
            useNativeDriver: true,
          }),
        ]).start();
      });
    });
  }, [titleComplete, milestones.length]);

  const handleContinue = () => {
    navigation.navigate('SocialProof');
  };

  if (!primaryProblem || !variant) {
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
                  {space ? <Text style={revealedCount > start + word.length ? styles.titleRevealed : styles.titleHidden}>{space}</Text> : null}
                </Text>
              );
            })}
            {revealedCount >= intro.length && intro.length > 0 && (
              <View style={styles.cursorWrapper}>
                <View style={[styles.cursor, !showCursor && styles.cursorHidden]} />
              </View>
            )}
          </View>
        </View>

        <Animated.View style={[styles.bodySection, { opacity: bodyFadeAnim }]}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{DIVIDER}</Text>

          <View style={styles.milestonesList}>
            {milestones.map((m: Milestone, index: number) => {
              const anim = milestoneAnims[index];
              const total = milestones.length;
              const t = total > 1 ? index / (total - 1) : 1;
              const weekColor = lerpHex('#d8e5d8', colors.accent, t);
              const cardBg = lerpHex(colors.surface, '#0d160d', t);
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.milestoneCard,
                    { backgroundColor: cardBg },
                    {
                      opacity: anim,
                      transform: [
                        {
                          translateY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.weekLabel, { color: weekColor }]}>Week {m.week}</Text>
                  <Text style={styles.milestoneDescription}>{m.description}</Text>
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
  milestonesList: {
    marginTop: spacing.sm,
  },
  milestoneCard: {
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  weekLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  milestoneDescription: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  bottomSection: {
    paddingTop: spacing.md,
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

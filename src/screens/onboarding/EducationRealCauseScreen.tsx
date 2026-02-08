import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

export default function EducationRealCauseScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.EDUCATION_REAL_CAUSE);
  const { primaryProblem, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();

  const problem = primaryProblem ? content.problems[primaryProblem] : null;
  const education = problem?.education_real_cause;
  const statLine = (education as any)?.stat_line;

  const titleText = education?.title ?? '';
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [showCursor, setShowCursor] = useState(true);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef<number>(0);
  const causesFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!titleText) return;

    currentIndexRef.current = 0;
    setRevealedIndices(new Set());

    revealIntervalRef.current = setInterval(() => {
      const currentIndex = currentIndexRef.current;
      if (currentIndex < titleText.length) {
        setRevealedIndices((prev) => {
          const newSet = new Set(prev);
          newSet.add(currentIndex);
          return newSet;
        });
        currentIndexRef.current = currentIndex + 1;
      } else {
        if (revealIntervalRef.current) {
          clearInterval(revealIntervalRef.current);
          revealIntervalRef.current = null;
        }
        Animated.timing(causesFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    }, 30);

    return () => {
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
    };
  }, [titleText]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((p) => !p), 530);
    return () => clearInterval(interval);
  }, []);

  const handleContinue = () => {
    navigation.navigate('Impact');
  };

  if (!primaryProblem || !education) {
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
            {(() => {
              const words = titleText.split(' ');
              return words.map((word, wordIndex) => {
                const offset = words.slice(0, wordIndex).reduce((sum, w) => sum + w.length + 1, 0);
              return (
                <View key={wordIndex} style={styles.titleWord}>
                  {word.split('').map((char, charIndex) => {
                    const globalIndex = offset + charIndex;
                    const isRevealed = revealedIndices.has(globalIndex);
                    return (
                      <Text
                        key={globalIndex}
                        style={[styles.titleChar, isRevealed ? styles.titleRevealed : styles.titleHidden]}
                      >
                        {char}
                      </Text>
                    );
                  })}
                  {wordIndex < words.length - 1 && (
                    <View style={styles.titleSpace} />
                  )}
                </View>
              );
            });
            })()}
            {revealedIndices.size === titleText.length && (
              <View style={styles.cursorWrapper}>
                <View style={[styles.cursor, !showCursor && styles.cursorHidden]} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.dividerLine} />

        <Animated.View style={[styles.bodySection, { opacity: causesFadeAnim }]}>
          {statLine && (
            <View style={styles.statBox}>
              <Text style={styles.statLine}>{statLine}</Text>
            </View>
          )}
          <View style={styles.causesList}>
            {education.causes.map((cause: string, index: number) => (
              <View key={index} style={styles.causeCard}>
                <Text style={styles.cause}>{cause}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.closingLine}>{education.closing_line}</Text>
          <Text style={styles.ctaLine}>Let's make one specifically for you</Text>
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
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'baseline',
  },
  titleChar: {
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
  titleSpace: {
    width: 12,
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
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  bodySection: {
    marginTop: spacing.sm,
  },
  statBox: {
    backgroundColor: colors.surfaceGreen,
    borderWidth: 1,
    borderColor: colors.borderGreen,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  statLine: {
    ...typography.body,
    fontSize: 15,
    color: colors.accentSecondary,
    fontWeight: '500',
  },
  causesList: {
    marginBottom: spacing.lg,
  },
  causeCard: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cause: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  closingLine: {
    ...typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  ctaLine: {
    ...typography.body,
    fontSize: 16,
    color: colors.accentSecondary,
    marginTop: spacing.lg,
    fontWeight: '600',
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

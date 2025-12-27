import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { getCombinedExpectationsForWeek } from '../../utils/whatToExpectUtils';

// Matrix-style characters for reveal effect
const MATRIX_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん■▢▣▤▥▦▧▨▩';

const getRandomChar = (): string => {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
};

export default function WhatToExpectScreen({ navigation }: any) {
  const { data } = useOnboarding();
  const selectedCategories = data.selectedCategories || [];
  const hasFacialHair = selectedCategories.includes('facial_hair');
  const hasJawline = selectedCategories.includes('jawline');
  const hasHyperpigmentation = selectedCategories.includes('hyperpigmentation');

  // Define weeks to show - 1, 3, 6, and optionally 14, 30 for facial_hair, jawline, or hyperpigmentation
  const weeksToShow = useMemo(() => 
    (hasFacialHair || hasJawline || hasHyperpigmentation) ? [1, 3, 6, 14, 30] : [1, 3, 6],
    [hasFacialHair, hasJawline, hasHyperpigmentation]
  );

  // Animation state for matrix reveal
  const headingText = 'Custom Protocol made';
  const subtextText = 'This is what you should expect';
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [matrixChars, setMatrixChars] = useState<{ [key: number]: string }>({});
  const [subtextRevealedIndices, setSubtextRevealedIndices] = useState<Set<number>>(new Set());
  const [showCursor, setShowCursor] = useState(true);
  const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subtextRevealIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef<number>(0);
  const subtextCurrentIndexRef = useRef<number>(0);
  
  // Week fade-in animation state - create array matching weeksToShow length
  const weekAnimations = useMemo(
    () => weeksToShow.map(() => new Animated.Value(0)),
    [weeksToShow.length]
  );
  
  // Configurable animation speeds
  const HEADING_CHAR_REVEAL_SPEED = 50; // ms per character for heading matrix reveal
  const SUBTEXT_CHAR_REVEAL_SPEED = 10; // ms per character for subtext reveal
  const SUBTEXT_DELAY = 300; // ms delay before subtext starts revealing
  const WEEK_FADE_SPEED = 2000; // ms for each week fade-in duration
  const WEEK_OVERLAP_PERCENTAGE = 0.3; // When week reaches 30% opacity, next week starts (0.0 to 1.0)

  const getExpectationText = (week: number): string | null => {
    return getCombinedExpectationsForWeek(selectedCategories, week, weeksToShow);
  };

  // Matrix reveal effect for heading - reveal one letter at a time
  useEffect(() => {
    // Initialize matrix characters for all non-space characters
    const chars: { [key: number]: string } = {};
    headingText.split('').forEach((char, index) => {
      if (char !== ' ') {
        chars[index] = getRandomChar();
      }
    });
    setMatrixChars(chars);

    // Reset and start revealing from the beginning
    currentIndexRef.current = 0;
    setRevealedIndices(new Set());

    // Start revealing all characters one by one (including spaces)
    revealIntervalRef.current = setInterval(() => {
      const currentIndex = currentIndexRef.current;
      if (currentIndex < headingText.length) {
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
        // Start subtext character reveal after heading completes with delay
        setTimeout(() => {
          subtextCurrentIndexRef.current = 0;
          setSubtextRevealedIndices(new Set());
          subtextRevealIntervalRef.current = setInterval(() => {
            const currentIndex = subtextCurrentIndexRef.current;
            if (currentIndex < subtextText.length) {
              setSubtextRevealedIndices((prev) => {
                const newSet = new Set(prev);
                newSet.add(currentIndex);
                return newSet;
              });
              subtextCurrentIndexRef.current = currentIndex + 1;
            } else {
              if (subtextRevealIntervalRef.current) {
                clearInterval(subtextRevealIntervalRef.current);
                subtextRevealIntervalRef.current = null;
              }
              // Start week fade-in animations after subtext completes
              startWeekFadeAnimations();
            }
          }, SUBTEXT_CHAR_REVEAL_SPEED);
        }, SUBTEXT_DELAY);
      }
    }, HEADING_CHAR_REVEAL_SPEED);

    return () => {
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
      if (subtextRevealIntervalRef.current) {
        clearInterval(subtextRevealIntervalRef.current);
        subtextRevealIntervalRef.current = null;
      }
    };
  }, []);

  // Animate matrix characters for unrevealed letters
  useEffect(() => {
    const interval = setInterval(() => {
      setMatrixChars((prevChars) => {
        const newChars: { [key: number]: string } = { ...prevChars };
        headingText.split('').forEach((_, index) => {
          if (!revealedIndices.has(index) && headingText[index] !== ' ') {
            newChars[index] = getRandomChar();
          }
        });
        return newChars;
      });
    }, 50); // Update every 50ms for fast animation

    return () => clearInterval(interval);
  }, [revealedIndices]);

  // Blinking cursor effect for heading
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Week fade-in animation function
  const startWeekFadeAnimations = () => {
    weekAnimations.forEach((anim, index) => {
      if (index === 0) {
        // First week starts immediately
        Animated.timing(anim, {
          toValue: 1,
          duration: WEEK_FADE_SPEED,
          useNativeDriver: true,
        }).start();
      } else {
        // Calculate delay based on overlap percentage
        const overlapDelay = WEEK_FADE_SPEED * WEEK_OVERLAP_PERCENTAGE * index;
        setTimeout(() => {
          Animated.timing(anim, {
            toValue: 1,
            duration: WEEK_FADE_SPEED,
            useNativeDriver: true,
          }).start();
        }, overlapDelay);
      }
    });
  };

  const handleContinue = () => {
    navigation.navigate('OnboardingSignUp');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentSection}>
        <View style={styles.headingContainer}>
          <View style={styles.headingTextContainer}>
            <Text style={styles.heading}>
              {headingText.split('').map((char, index) => {
                const isRevealed = revealedIndices.has(index);
                if (char === ' ') {
                  return <Text key={index}> </Text>;
                }
                if (isRevealed) {
                  return (
                    <Text key={index} style={styles.headingRevealed}>
                      {char}
                    </Text>
                  );
                } else {
                  return (
                    <Text key={index} style={styles.headingMatrix}>
                      {matrixChars[index] || getRandomChar()}
                    </Text>
                  );
                }
              })}
            </Text>
            {revealedIndices.size === headingText.length && (
              <View style={styles.headingCursorWrapper}>
                <View style={[styles.headingCursor, !showCursor && styles.headingCursorHidden]} />
              </View>
            )}
          </View>
        </View>
        <Text style={styles.subtitle}>
          {subtextText.split('').map((char, index) => {
            const isRevealed = subtextRevealedIndices.has(index);
            if (isRevealed) {
              return (
                <Text key={index} style={styles.subtextRevealed}>
                  {char}
                </Text>
              );
            } else {
              return (
                <Text key={index} style={styles.subtextHidden}>
                  {char}
                </Text>
              );
            }
          })}
        </Text>

        <ScrollView 
          style={styles.cardsContainer}
          contentContainerStyle={styles.cardsContent}
          showsVerticalScrollIndicator={false}
        >
          {weeksToShow.map((week, index) => {
            const expectationText = getExpectationText(week);
            if (!expectationText) return null;

            return (
              <Animated.View 
                key={week} 
                style={[
                  styles.card,
                  {
                    opacity: weekAnimations[index],
                  },
                ]}
              >
                <Text style={styles.weekLabel}>{week} {week === 1 ? 'week' : 'weeks'}</Text>
                <Text style={styles.expectationText}>{expectationText}</Text>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
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
    paddingTop: spacing.xl,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  headingMatrix: {
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: colors.accent, // Green matrix color
  },
  headingRevealed: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: colors.text, // White text
  },
  headingContainer: {
    marginBottom: spacing.sm,
  },
  headingTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minHeight: 32, // Fixed height so blinking doesn't affect layout
  },
  headingCursorWrapper: {
    marginLeft: 4,
    width: 12,
    height: 2,
    justifyContent: 'flex-end', // Position at bottom
    paddingBottom: 2, // Small gap from baseline
  },
  headingCursor: {
    width: 12,
    height: 2,
    backgroundColor: colors.accent,
  },
  headingCursorHidden: {
    opacity: 0,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  subtextRevealed: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  subtextHidden: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    color: 'transparent',
    lineHeight: 20,
  },
  cardsContainer: {
    flex: 1,
  },
  cardsContent: {
    paddingBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  weekLabel: {
    ...typography.headingSmall,
    marginBottom: spacing.sm,
  },
  expectationText: {
    ...typography.body,
    color: colors.text,
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


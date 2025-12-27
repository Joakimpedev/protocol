import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Animated } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { classifyUserInput } from '../../services/openai';

// Matrix-style characters for reveal effect
const MATRIX_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん■▢▣▤▥▦▧▨▩';

const getRandomChar = (): string => {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
};

export default function WelcomeScreen({ navigation }: any) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const { updateData } = useOnboarding();
  const inputRef = useRef<TextInput>(null);

  const headingText = 'Welcome to Protocol';
  const promptText = 'What are you looking to improve?';
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [matrixChars, setMatrixChars] = useState<{ [key: number]: string }>({});
  const [promptRevealedIndices, setPromptRevealedIndices] = useState<Set<number>>(new Set());
  const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const promptRevealIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef<number>(0);
  const promptCurrentIndexRef = useRef<number>(0);
  const inputRevealAnim = useRef(new Animated.Value(0)).current;
  
  // Configurable delay after animation completes (in ms)
  const PROMPT_DELAY = 300; // Adjust this value to sync the input appearance
  // Configurable character reveal speed for prompt text (in ms per character)
  const PROMPT_CHAR_REVEAL_SPEED = 10; // Adjust this value to control prompt character reveal speed

  // Matrix reveal effect - reveal one letter at a time
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
        // Animate input section reveal after animation completes with delay
        setTimeout(() => {
          Animated.timing(inputRevealAnim, {
            toValue: 1,
            duration: 500, // Swipe reveal duration
            useNativeDriver: true, // Using transform, so we can use native driver
          }).start();
          
          // Start prompt text character reveal
          promptCurrentIndexRef.current = 0;
          setPromptRevealedIndices(new Set());
          promptRevealIntervalRef.current = setInterval(() => {
            const currentIndex = promptCurrentIndexRef.current;
            if (currentIndex < promptText.length) {
              setPromptRevealedIndices((prev) => {
                const newSet = new Set(prev);
                newSet.add(currentIndex);
                return newSet;
              });
              promptCurrentIndexRef.current = currentIndex + 1;
            } else {
              if (promptRevealIntervalRef.current) {
                clearInterval(promptRevealIntervalRef.current);
                promptRevealIntervalRef.current = null;
              }
            }
          }, PROMPT_CHAR_REVEAL_SPEED);
        }, PROMPT_DELAY);
      }
    }, 100); // 100ms per character

    return () => {
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
      if (promptRevealIntervalRef.current) {
        clearInterval(promptRevealIntervalRef.current);
        promptRevealIntervalRef.current = null;
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

  const handleContinue = async () => {
    if (!input.trim()) {
      return;
    }

    setLoading(true);
    try {
      // Classify user input
      const classification = await classifyUserInput(input);
      
      updateData({
        userInput: input,
        aiCategories: classification.categories,
      });

      // Navigate to category screen
      navigation.navigate('Category');
    } catch (error) {
      console.error('Classification error:', error);
      // Still navigate, but with empty categories
      updateData({
        userInput: input,
        aiCategories: [],
      });
      navigation.navigate('Category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
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
        
        <Text style={styles.prompt}>
          {promptText.split('').map((char, index) => {
            const isRevealed = promptRevealedIndices.has(index);
            if (isRevealed) {
              return (
                <Text key={index} style={styles.promptRevealed}>
                  {char}
                </Text>
              );
            } else {
              // Keep space for unrevealed characters to maintain layout
              return (
                <Text key={index} style={styles.promptHidden}>
                  {char}
                </Text>
              );
            }
          })}
        </Text>
        
        <Animated.View 
          style={[
            styles.inputSection,
            {
              opacity: inputRevealAnim,
              transform: [
                {
                  translateX: inputRevealAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.inputLine} />
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder=""
              placeholderTextColor={colors.textMuted}
              autoFocus
              editable={!loading}
              autoCapitalize="sentences"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={handleContinue}
            />
          </View>
          <View style={styles.inputLine} />
        </Animated.View>
      </View>

      <TouchableOpacity
        style={[styles.button, (!input.trim() || loading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!input.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
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
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: '40%', // Position content with more spacing from top
  },
  headingContainer: {
    marginBottom: spacing.xl,
  },
  headingTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minHeight: 32, // Fixed height so blinking doesn't affect layout
  },
  heading: {
    ...typography.heading,
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
  prompt: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  promptRevealed: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  promptHidden: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    color: 'transparent',
    lineHeight: 24,
  },
  inputSection: {
    marginTop: spacing.md,
  },
  inputLine: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 32,
  },
  input: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    flex: 1,
    color: colors.text,
    padding: 0,
    margin: 0,
    height: 24,
    lineHeight: 24,
    includeFontPadding: false, // Remove extra padding on Android
    ...Platform.select({
      ios: {
        paddingTop: 0,
        paddingBottom: 0,
        caretColor: '#ffffff', // White cursor
      },
      android: {
        textAlignVertical: 'center',
        paddingTop: 0,
        paddingBottom: 0,
        caretColor: '#ffffff', // White cursor
        selectionColor: colors.text + '40',
      },
    }),
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


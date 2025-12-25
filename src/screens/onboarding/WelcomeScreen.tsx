import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { classifyUserInput } from '../../services/openai';

export default function WelcomeScreen({ navigation }: any) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const { updateData } = useOnboarding();
  const inputRef = useRef<TextInput>(null);

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
            <Text style={styles.heading}>Welcome to Protocol</Text>
            <View style={styles.headingCursorWrapper}>
              <View style={[styles.headingCursor, !showCursor && styles.headingCursorHidden]} />
            </View>
          </View>
        </View>
        
        <Text style={styles.prompt}>What are you looking to improve?</Text>
        
        <View style={styles.inputSection}>
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
              caretHidden={true}
            />
          </View>
          <View style={styles.inputLine} />
        </View>
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
    paddingTop: '20%', // Position content higher up (about 20% from top)
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
    backgroundColor: colors.text,
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
    height: 24, // Fixed height to match prefix
    lineHeight: 24,
    includeFontPadding: false, // Remove extra padding on Android
    ...Platform.select({
      ios: {
        paddingTop: 0,
        paddingBottom: 0,
        caretColor: 'transparent',
      },
      android: {
        textAlignVertical: 'center',
        paddingTop: 0,
        paddingBottom: 0,
        caretColor: 'transparent',
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


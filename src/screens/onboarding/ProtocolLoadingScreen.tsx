import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MONOSPACE_FONT } from '../../constants/theme';
import { CATEGORIES } from '../../constants/categories';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

interface ProtocolLoadingScreenProps {
  navigation: any;
}

interface Line {
  id: string;
  text: string;
  isComplete: boolean;
  showCheckmark: boolean;
}

// Timing configuration (in milliseconds) - Customize these values to control animation speed
const TIMING = {
  // Character typing speed (lower = faster typing)
  CHAR_DELAY: 1, // Speed for "Building your protocol..."
  CONCERN_CHAR_DELAY: 1, // Speed for concern lines
  MATCHING_CHAR_DELAY: 1, // Speed for "Matching ingredients..."
  PLANNING_CHAR_DELAY: 1, // Speed for "Planning optimal routine..."
  COMPLETE_CHAR_DELAY: 1, // Speed for "Complete."

  // Delays between actions (waiting times)
  BUILDING_DELAY: 0, // Delay before starting (start immediately)
  CONCERN_DELAY: 500, // Delay before first concern appears
  CONCERN_CHECKMARK_DELAY: 150, // Delay before showing ✓ after concern text completes
  BETWEEN_CONCERNS_DELAY: 1, // Delay between each concern line
  MATCHING_DELAY: 900, // Delay before "Matching ingredients..." appears
  PLANNING_DELAY: 900, // Delay before "Planning optimal routine..." appears
  COMPLETE_DELAY: 1500, // Delay before "Complete." appears
  COMPLETE_HOLD: 400, // Time to hold "Complete." before navigating to next screen
};

export default function ProtocolLoadingScreen({ navigation }: ProtocolLoadingScreenProps) {
  useOnboardingTracking(ONBOARDING_SCREENS.PROTOCOL_LOADING);
  const { data } = useOnboarding();
  // Use selectedProblems if available, fallback to selectedCategories for backwards compatibility
  const selectedProblems = data.selectedProblems?.length ? data.selectedProblems : (data.selectedCategories || []);
  const [lines, setLines] = useState<Line[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const isFocusedRef = useRef(true); // Track if screen is focused

  // Listen for screen focus/blur events
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('[ProtocolLoading] Screen focused');
      isFocusedRef.current = true;
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log('[ProtocolLoading] Screen blurred - cancelling pending navigation');
      isFocusedRef.current = false;
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  // Get category label from ID
  const getCategoryLabel = (categoryId: string): string => {
    const category = CATEGORIES.find((cat) => cat.id === categoryId);
    return category?.label || categoryId;
  };

  // Format category label for display (lowercase, simplified)
  const formatCategoryForDisplay = (label: string): string => {
    // Convert "Jawline / face structure" -> "jawline"
    // Convert "Oily skin" -> "oily skin"
    return label.toLowerCase().split(' / ')[0];
  };

  useEffect(() => {
    // Build the sequence of lines
    const sequence: Line[] = [];

    // 1. "Building your protocol..."
    sequence.push({
      id: 'building',
      text: 'Building your protocol...',
      isComplete: false,
      showCheckmark: false,
    });

    // 2. Each problem with "> Fetching [problem] data"
    selectedProblems.forEach((problemId) => {
      const label = getCategoryLabel(problemId);
      const displayName = formatCategoryForDisplay(label);
      sequence.push({
        id: `concern-${problemId}`,
        text: `> Fetching ${displayName} data`,
        isComplete: false,
        showCheckmark: false,
      });
    });

    // 3. "> Matching ingredients..."
    sequence.push({
      id: 'matching',
      text: '> Matching ingredients...',
      isComplete: false,
      showCheckmark: false,
    });

    // 4. "> Planning optimal routine..."
    sequence.push({
      id: 'planning',
      text: '> Planning optimal routine...',
      isComplete: false,
      showCheckmark: false,
    });

    // 5. "> Complete."
    sequence.push({
      id: 'complete',
      text: '> Complete.',
      isComplete: false,
      showCheckmark: false,
    });

    // Initialize with empty lines array - lines will be added as we type
    setLines([]);
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);

    // Start the animation
    let currentTimeout: NodeJS.Timeout;
    let lineIndex = 0;
    let charIndex = 0;

    const typeNextChar = () => {
      const currentLine = sequence[lineIndex];
      const isBuilding = currentLine.id === 'building';
      const isConcern = currentLine.id.startsWith('concern-');
      const isMatching = currentLine.id === 'matching';
      const isPlanning = currentLine.id === 'planning';
      const isComplete = currentLine.id === 'complete';

      // Determine typing speed
      let charDelay = TIMING.CHAR_DELAY;
      if (isConcern) {
        charDelay = TIMING.CONCERN_CHAR_DELAY;
      } else if (isMatching) {
        charDelay = TIMING.MATCHING_CHAR_DELAY;
      } else if (isPlanning) {
        charDelay = TIMING.PLANNING_CHAR_DELAY;
      } else if (isComplete) {
        charDelay = TIMING.COMPLETE_CHAR_DELAY;
      }

      if (charIndex === 0) {
        // Add new line when starting to type it
        setLines((prev) => [
          ...prev,
          {
            id: currentLine.id,
            text: '',
            isComplete: false,
            showCheckmark: false,
          },
        ]);
      }

      if (charIndex < currentLine.text.length) {
        // Type next character
        setLines((prev) =>
          prev.map((line, idx) =>
            idx === lineIndex
              ? {
                  ...line,
                  text: currentLine.text.substring(0, charIndex + 1),
                }
              : line
          )
        );
        charIndex++;
        currentTimeout = setTimeout(typeNextChar, charDelay);
        timeoutRefs.current.push(currentTimeout);
      } else {
        // Line complete
        setLines((prev) =>
          prev.map((line, idx) =>
            idx === lineIndex ? { ...line, isComplete: true } : line
          )
        );

        // Handle checkmark for concerns (wait first, then show checkmark)
        if (isConcern) {
          currentTimeout = setTimeout(() => {
            // Show checkmark after the delay
            setLines((prev) =>
              prev.map((line, idx) =>
                idx === lineIndex ? { ...line, showCheckmark: true } : line
              )
            );
            // Move to next line after checkmark appears
            currentTimeout = setTimeout(() => {
              lineIndex++;
              charIndex = 0;
              setCurrentLineIndex(lineIndex);
              setCurrentCharIndex(0);
              typeNextChar();
            }, TIMING.BETWEEN_CONCERNS_DELAY);
            timeoutRefs.current.push(currentTimeout);
          }, TIMING.CONCERN_CHECKMARK_DELAY);
          timeoutRefs.current.push(currentTimeout);
          return;
        }

        // Handle delays for specific lines
        let nextLineDelay = 0;
        if (isBuilding) {
          nextLineDelay = TIMING.CONCERN_DELAY;
        } else if (isMatching) {
          nextLineDelay = TIMING.PLANNING_DELAY;
        } else if (isPlanning) {
          nextLineDelay = TIMING.COMPLETE_DELAY;
        } else if (isComplete) {
          // Complete line - wait before navigating
          currentTimeout = setTimeout(() => {
            // Only navigate if this screen is still focused
            // This prevents navigation if user already moved to next screen
            if (isFocusedRef.current) {
              console.log('[ProtocolLoading] Animation complete, navigating to ProtocolOverview');
              navigation.navigate('ProtocolOverview');
            } else {
              console.log('[ProtocolLoading] Screen not focused, skipping navigation');
            }
          }, TIMING.COMPLETE_HOLD);
          timeoutRefs.current.push(currentTimeout);
          return;
        }

        // Move to next line
        currentTimeout = setTimeout(() => {
          lineIndex++;
          charIndex = 0;
          setCurrentLineIndex(lineIndex);
          setCurrentCharIndex(0);
          typeNextChar();
        }, nextLineDelay);
        timeoutRefs.current.push(currentTimeout);
      }
    };

    // Start typing
    currentTimeout = setTimeout(() => {
      typeNextChar();
    }, TIMING.BUILDING_DELAY);
    timeoutRefs.current.push(currentTimeout);

    // Cleanup
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current = [];
    };
  }, [selectedProblems, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.terminal}>
        {lines.map((line, index) => (
          <View key={line.id} style={styles.line}>
            <Text style={styles.text}>
              {line.text}
              {line.showCheckmark && (
                <Text style={styles.checkmark}> ✓</Text>
              )}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 20,
  },
  terminal: {
    width: '100%',
  },
  line: {
    marginBottom: 4,
  },
  text: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  checkmark: {
    color: '#00FF00', // Green checkmark
  },
});

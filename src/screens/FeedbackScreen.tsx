/**
 * Feedback Screen
 *
 * Allows users to submit feedback after review prompt
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { saveFeedback } from '../services/feedbackService';

interface FeedbackScreenProps {
  navigation: any;
}

export default function FeedbackScreen({ navigation }: FeedbackScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !feedback.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await saveFeedback(user.uid, feedback.trim());
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still navigate back even if save fails
      navigation.goBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Anything you want us to improve?</Text>

        <TextInput
          style={styles.input}
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Your feedback..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          autoFocus
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!feedback.trim() || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!feedback.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      minWidth: 60,
    },
    backButtonText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: theme.spacing.lg,
    },
    title: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.xl,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      ...theme.typography.body,
      color: theme.colors.text,
      minHeight: 150,
      marginBottom: theme.spacing.lg,
    },
    submitButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      ...theme.typography.body,
      color: '#000000',
      fontWeight: '600',
    },
    skipButton: {
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    skipButtonText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
  });
}

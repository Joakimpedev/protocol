/**
 * Photo Preview Screen
 *
 * Preview captured photo with retake/use options
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { saveProgressPhoto } from '../services/photoService';
import { trackSkinRating } from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';
import { getTodayDateString } from '../services/completionService';
import { shouldShowReviewPrompt, updateLastReviewPromptDate, requestReview } from '../services/reviewService';
import ReviewPromptModal from '../components/ReviewPromptModal';

interface PhotoPreviewScreenProps {
  route: {
    params: {
      photoUri: string;
      weekNumber: number;
    };
  };
  navigation: any;
}

export default function PhotoPreviewScreen({ route, navigation }: PhotoPreviewScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { photoUri, weekNumber } = route.params;
  const { user } = useAuth();
  const posthog = usePostHog();
  const [isSaving, setIsSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string>(photoUri);
  const [skinRating, setSkinRating] = useState<'worse' | 'same' | 'better' | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Flip the preview image horizontally to match what will be saved
  useEffect(() => {
    const flipPreview = async () => {
      try {
        const flipped = await ImageManipulator.manipulateAsync(
          photoUri,
          [{ flip: ImageManipulator.FlipType.Horizontal }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );
        setPreviewUri(flipped.uri);
      } catch (error) {
        console.error('Error flipping preview:', error);
        // If flip fails, use original
        setPreviewUri(photoUri);
      }
    };
    flipPreview();
  }, [photoUri]);

  const handleUsePhoto = async () => {
    // Skin rating is required before saving (except for Week 0 baseline)
    if (weekNumber !== 0 && !skinRating) {
      return;
    }

    try {
      setIsSaving(true);
      const savedPhotoPath = await saveProgressPhoto(photoUri, weekNumber);

      // Track progress photo taken event
      if (posthog) {
        posthog.capture('progress_photo_taken', {
          week_number: weekNumber,
        });
      }

      // Track skin rating (only for non-baseline photos)
      if (user && weekNumber !== 0 && skinRating) {
        const photoDate = getTodayDateString();
        try {
          await trackSkinRating(user.uid, weekNumber, photoDate, skinRating);

          // Check if we should show review prompt
          const shouldShow = await shouldShowReviewPrompt(user.uid, weekNumber, skinRating);
          if (shouldShow) {
            // Show review modal instead of navigating immediately
            setShowReviewModal(true);
            setIsSaving(false);
            return;
          }
        } catch (error) {
          console.error('Error tracking skin rating:', error);
          // Continue even if tracking fails
        }
      }

      // Navigate to What to Expect screen
      navigation.navigate('WhatToExpect', {
        weekNumber,
      });
    } catch (error) {
      console.error('Error saving photo:', error);
      // Still navigate even if save fails (error handling can be improved)
      navigation.navigate('WhatToExpect', {
        weekNumber,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveReview = async () => {
    if (!user) return;

    try {
      // Update last review prompt date
      await updateLastReviewPromptDate(user.uid);

      // Request native review dialog
      await requestReview();

      // Close modal - don't navigate, just show the native review dialog
      setShowReviewModal(false);
      // Navigate to WhatToExpect screen after closing modal
      navigation.navigate('WhatToExpect', {
        weekNumber,
      });
    } catch (error) {
      console.error('Error handling review request:', error);
      // Close modal and navigate even if review fails
      setShowReviewModal(false);
      navigation.navigate('WhatToExpect', {
        weekNumber,
      });
    }
  };

  const handleNotNow = async () => {
    if (!user) {
      setShowReviewModal(false);
      navigation.navigate('Feedback');
      return;
    }

    try {
      // Update last review prompt date (30 day cooldown)
      await updateLastReviewPromptDate(user.uid);
    } catch (error) {
      console.error('Error updating review prompt date:', error);
    }

    setShowReviewModal(false);
    navigation.navigate('Feedback');
  };

  const handleRetake = () => {
    navigation.goBack();
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
        </View>

        {/* Skin Rating Section - Only show for non-baseline photos */}
        {weekNumber !== 0 && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingQuestion}>How does your face feel compared to last week?</Text>
            <View style={styles.ratingButtons}>
              <TouchableOpacity
                style={[
                  styles.ratingButton,
                  skinRating === 'worse' && styles.ratingButtonSelected
                ]}
                onPress={() => setSkinRating('worse')}
              >
                <Text style={[
                  styles.ratingButtonText,
                  skinRating === 'worse' && styles.ratingButtonTextSelected
                ]}>
                  Worse
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ratingButton,
                  skinRating === 'same' && styles.ratingButtonSelected
                ]}
                onPress={() => setSkinRating('same')}
              >
                <Text style={[
                  styles.ratingButtonText,
                  skinRating === 'same' && styles.ratingButtonTextSelected
                ]}>
                  Same
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ratingButton,
                  skinRating === 'better' && styles.ratingButtonSelected
                ]}
                onPress={() => setSkinRating('better')}
              >
                <Text style={[
                  styles.ratingButtonText,
                  skinRating === 'better' && styles.ratingButtonTextSelected
                ]}>
                  Better
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.retakeButton]}
            onPress={handleRetake}
            disabled={isSaving}
          >
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.useButton,
              (isSaving || (weekNumber !== 0 && !skinRating)) && styles.buttonDisabled
            ]}
            onPress={handleUsePhoto}
            disabled={isSaving || (weekNumber !== 0 && !skinRating)}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.useButtonText}>Use Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ReviewPromptModal
        visible={showReviewModal}
        onLeaveReview={handleLeaveReview}
        onNotNow={handleNotNow}
      />
    </>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    previewContainer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    footer: {
      flexDirection: 'row',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    button: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retakeButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    retakeButtonText: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '600',
    },
    useButton: {
      backgroundColor: theme.colors.text,
    },
    useButtonText: {
      ...theme.typography.body,
      color: theme.colors.background,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    ratingContainer: {
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    ratingQuestion: {
      ...theme.typography.body,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    ratingButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    ratingButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    ratingButtonSelected: {
      backgroundColor: theme.colors.text,
      borderColor: theme.colors.text,
    },
    ratingButtonText: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '500',
    },
    ratingButtonTextSelected: {
      color: theme.colors.background,
    },
  });
}

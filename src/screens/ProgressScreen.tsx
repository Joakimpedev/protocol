/**
 * Progress Screen
 * 
 * Displays weekly photo prompts, photo timeline/grid, and comparison access
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { usePostHog } from 'posthog-react-native';
import { colors, typography, spacing } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import { useDevMode } from '../contexts/DevModeContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  loadAllPhotos, 
  getCurrentWeekNumber, 
  shouldPromptForWeeklyPhoto,
  ProgressPhoto,
  getPhotoForWeek,
  deleteAllPhotos
} from '../services/photoService';
import PhotoPaywallModal from '../components/PhotoPaywallModal';
import ReviewPromptModal from '../components/ReviewPromptModal';
import { updateLastReviewPromptDate, requestReview } from '../services/reviewService';
const whatToExpect = require('../data/what_to_expect.json');
const guideBlocks = require('../data/guide_blocks.json');

export default function ProgressScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { isDevModeEnabled } = useDevMode();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const [signupDate, setSignupDate] = useState<string | null>(null);
  const [photoDay, setPhotoDay] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [expandedProblems, setExpandedProblems] = useState<{ [key: number]: boolean }>({});
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallWeek, setPaywallWeek] = useState<number | null>(null);
  const [pendingPhotoWeek, setPendingPhotoWeek] = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Track screen view when component mounts
  useEffect(() => {
    if (posthog) {
      posthog.capture('progress_screen_viewed');
      console.log('[PostHog] Tracked ProgressScreen view (on mount)');
    }
  }, [posthog]);

  // Reload photos when screen comes into focus (after taking a photo)
  useFocusEffect(
    React.useCallback(() => {
      // Track screen view on focus
      if (posthog) {
        posthog.capture('progress_screen_viewed');
        console.log('[PostHog] Tracked ProgressScreen view (on focus)');
      }
      loadPhotos();
    }, [posthog])
  );

  const loadUserData = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const signup = userData.signupDate || userData.signup_date;
        const day = userData.photoDay || userData.photo_day;
        const concerns = userData.concerns || [];
        
        setSignupDate(signup);
        setPhotoDay(day || 'monday');
        setUserCategories(concerns);

        if (signup) {
          const weekNum = getCurrentWeekNumber(signup);
          setCurrentWeek(weekNum);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const allPhotos = await loadAllPhotos();
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const handleTakePhoto = async (weekNumber: number) => {
    // Week 0-4 are free, Week 5+ requires premium
    // Note: canAccessPremiumFeatures handles 6-month retention period for cancelled users
    if (weekNumber >= 5) {
      if (!isPremium) {
        // Double-check with subscription service for 6-month retention period
        const { canAccessPremiumFeatures } = require('../services/subscriptionService');
        const canAccess = await canAccessPremiumFeatures(user?.uid || '');
        
        if (!canAccess) {
          setPaywallWeek(weekNumber);
          setPendingPhotoWeek(weekNumber); // Store the week number to navigate after purchase
          setShowPaywall(true);
          return; // Block camera access - don't navigate
        }
      }
    }
    
    navigation.navigate('PhotoCapture', { weekNumber });
  };

  const handlePaywallClose = () => {
    setShowPaywall(false);
    setPaywallWeek(null);
    setPendingPhotoWeek(null);
  };

  const handlePaywallPurchaseComplete = async () => {
    // Refresh photos and status after purchase
    loadPhotos();
    
    // If there was a pending photo week, navigate to camera after purchase
    if (pendingPhotoWeek !== null) {
      handlePaywallClose();
      // Small delay to ensure premium status is refreshed
      setTimeout(() => {
        navigation.navigate('PhotoCapture', { weekNumber: pendingPhotoWeek });
      }, 100);
    } else {
      handlePaywallClose();
    }
  };

  const handleViewComparison = () => {
    const latestWeek = photos.length > 0 ? Math.max(...photos.map(p => p.weekNumber)) : 0;
    navigation.navigate('PhotoComparison', { selectedWeek: latestWeek > 0 ? latestWeek : undefined });
  };

  // Dev Tools
  const handleResetPhotos = async () => {
    if (!user) return;
    
    Alert.alert(
      'Reset All Photos',
      'This will delete all progress photos and reset your signup date. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllPhotos();
              
              // Reset signup date to today to reset currentWeek to 0
              const today = new Date();
              const photoDay = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
              
              await updateDoc(doc(db, 'users', user.uid), {
                signupDate: today.toISOString(),
                photoDay: photoDay,
                skinRatings: [], // Reset skin progress ratings
              });
              
              // Update local state
              setSignupDate(today.toISOString());
              setPhotoDay(photoDay);
              setCurrentWeek(0);
              
              await loadPhotos();
              Alert.alert('Success', 'All photos have been deleted and signup date reset. Skin progress has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photos.');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleAdvanceWeek = async () => {
    if (!user || !signupDate) return;

    try {
      const signup = new Date(signupDate);
      // Move signup date back by 7 days to advance to next week
      const newSignupDate = new Date(signup.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      await updateDoc(doc(db, 'users', user.uid), {
        signupDate: newSignupDate.toISOString(),
      });

      setSignupDate(newSignupDate.toISOString());
      const weekNum = getCurrentWeekNumber(newSignupDate.toISOString());
      setCurrentWeek(weekNum);
      
      Alert.alert('Success', `Advanced to Week ${weekNum}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to advance week.');
      console.error(error);
    }
  };

  const handleTestReviewPrompt = () => {
    setShowReviewModal(true);
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
    } catch (error) {
      console.error('Error handling review request:', error);
      // Close modal even if review fails
      setShowReviewModal(false);
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

  const shouldShowPrompt = signupDate && photoDay && shouldPromptForWeeklyPhoto(signupDate, photoDay);
  const hasWeek0Photo = photos.some(p => p.weekNumber === 0);
  const latestWeek = photos.length > 0 ? Math.max(...photos.map(p => p.weekNumber)) : -1;
  const needsWeek0Photo = !hasWeek0Photo && currentWeek >= 0;
  
  // Calculate effective week based on actual photos taken, not artificially advanced signup date
  // This is the week that should be used for "What to Expect" content and other week-based logic
  // If no photos, we're at week 0 (baseline). Otherwise, we're at the latest photo week.
  const effectiveWeek = latestWeek >= 0 ? latestWeek : 0;
  
  // Calculate the next week that should be prompted (next sequential week after latest photo)
  const nextSequentialWeek = latestWeek + 1;
  
  // Show current week prompt ONLY when the next sequential week matches the current week
  // This means it's naturally time for that week's photo
  // For normal users: If they're at Week 1 and it's time for Week 1 photo, currentWeek === 1, nextSequentialWeek === 1
  // For dev tools: If they've advanced to Week 9 but only have Week 0, nextSequentialWeek (1) !== currentWeek (9), so no prompt
  //    They would need to advance week by week to match the sequential progression
  const shouldShowCurrentWeekPrompt = hasWeek0Photo && nextSequentialWeek === currentWeek;
  const weekToPrompt = shouldShowCurrentWeekPrompt ? nextSequentialWeek : null;
  
  // Get unique weeks for display (newest first)
  const photoWeeks = Array.from(new Set(photos.map(p => p.weekNumber))).sort((a, b) => b - a);

  // Calculate days until next photo
  const getDaysUntilNextPhoto = (): number | null => {
    if (!signupDate || !photoDay) return null;
    
    const signup = new Date(signupDate);
    const now = new Date();
    
    // Calculate days since signup
    const diffTime = now.getTime() - signup.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate which day of the current week we're on (0-6)
    const dayOfCurrentWeek = diffDays % 7;
    
    // Days until next week (7 - dayOfCurrentWeek)
    // If dayOfCurrentWeek is 0, we're at the start of a week, so next week is in 7 days
    const daysUntilNext = dayOfCurrentWeek === 0 ? 7 : 7 - dayOfCurrentWeek;
    
    return daysUntilNext;
  };

  const daysUntilNextPhoto = getDaysUntilNextPhoto();

  // Get expectation for a problem at effective week (based on actual photos, not artificially advanced weeks)
  const getExpectationForProblem = (problemId: string) => {
    const problemData = whatToExpect.what_to_expect[problemId];
    if (!problemData) return null;

    const expectation = problemData.expectations.find((exp: any) => {
      return exp.week_start <= effectiveWeek && (exp.week_end === null || effectiveWeek <= exp.week_end);
    });

    if (!expectation) return null;

    return {
      expectation,
      description: expectation.description,
      problemName: guideBlocks.problems.find((p: any) => p.problem_id === problemId)?.display_name || problemId
    };
  };

  // Get all expectations for user's categories
  const userExpectations = userCategories
    .map((categoryId) => getExpectationForProblem(categoryId))
    .filter((exp): exp is NonNullable<typeof exp> => exp !== null);

  // Get phase name from first expectation (they should all be in the same phase range)
  const getPhaseName = (): string | null => {
    if (userExpectations.length === 0) return null;
    
    const firstExpectation = userExpectations[0].expectation;
    if (!firstExpectation) return null;

    if (firstExpectation.week_end === null) {
      return `Week ${firstExpectation.week_start + 1}+`;
    } else if (firstExpectation.week_start === firstExpectation.week_end) {
      return `Week ${firstExpectation.week_start + 1}`;
    } else {
      return `Week ${firstExpectation.week_start + 1}-${firstExpectation.week_end + 1}`;
    }
  };

  const phaseName = getPhaseName();

  return (
    <>
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + spacing.lg }
      ]}
    >
      {/* Week 0 Photo Prompt */}
      {needsWeek0Photo && (
        <TouchableOpacity
          style={styles.promptCard}
          onPress={() => handleTakePhoto(0)}
        >
          <Text style={styles.promptTitle}>Take your baseline photo</Text>
          <Text style={styles.promptBody}>Capture your starting point to track progress over time.</Text>
          <View style={styles.promptButtonContainer}>
            <Text style={styles.promptButton}>Take Photo</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Current Week Photo Prompt */}
      {weekToPrompt !== null && (
        <TouchableOpacity
          style={styles.promptCard}
          onPress={() => handleTakePhoto(weekToPrompt)}
        >
          <Text style={styles.promptTitle}>Week {weekToPrompt} done. Take a photo.</Text>
          <Text style={styles.promptBody}>Same spot. Same lighting.</Text>
          <View style={styles.promptButtonContainer}>
            <Text style={styles.promptButton}>Take Photo</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* What to Expect Section */}
      {signupDate && userExpectations.length > 0 && phaseName && (
        <View style={styles.expectationCard}>
          <Text style={styles.phaseTitle}>{phaseName}</Text>
          <View style={styles.expectationTitleRow}>
            <Text style={styles.expectationTitle}>What to Expect</Text>
            {daysUntilNextPhoto !== null && !needsWeek0Photo && !(weekToPrompt !== null && (shouldShowPrompt || weekToPrompt <= 4)) && (
              <View style={styles.daysBadge}>
                <Text style={styles.daysBadgeText}>
                  {daysUntilNextPhoto === 1 
                    ? 'Next photo: 1 day'
                    : `Next photo: ${daysUntilNextPhoto} days`}
                </Text>
              </View>
            )}
          </View>
          {userExpectations.map((exp, index) => {
            const isExpanded = expandedProblems[index] || false;
            return (
              <View key={index} style={styles.accordionItem}>
                <TouchableOpacity
                  style={styles.accordionHeader}
                  onPress={() => {
                    setExpandedProblems(prev => ({
                      ...prev,
                      [index]: !prev[index]
                    }));
                  }}
                >
                  <Text style={styles.accordionProblem}>{exp.problemName}</Text>
                  <Text style={styles.accordionIcon}>{isExpanded ? '−' : '+'}</Text>
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.accordionContent}>
                    <Text style={styles.expectationDescription}>{exp.description}</Text>
                  </View>
                )}
              </View>
            );
          })}
          
          {/* Weekly Summary Button */}
          {signupDate && (
            <TouchableOpacity
              style={styles.summaryButton}
              onPress={() => {
                // Premium users go directly to detailed insights
                if (isPremium) {
                  navigation.navigate('PremiumInsight');
                } else {
                  navigation.navigate('WeeklySummary');
                }
              }}
            >
              <Text style={styles.summaryButtonText}>View Weekly Summary</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Photo Timeline/Grid */}
      {photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Photos</Text>
          
          <FlatList
            data={photoWeeks}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `week-${item}`}
            renderItem={({ item: weekNumber }) => {
              const weekPhoto = photos.find(p => p.weekNumber === weekNumber);
              if (!weekPhoto) return null;

              return (
                <TouchableOpacity
                  style={styles.photoThumbnail}
                  onPress={() => navigation.navigate('PhotoDetail', { 
                    weekNumber, 
                    photoUri: weekPhoto.uri 
                  })}
                >
                  <Image source={{ uri: weekPhoto.uri }} style={styles.thumbnailImage} />
                  <Text style={styles.thumbnailLabel}>Week {weekNumber}</Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.photoListContainer}
          />

          {/* Compare Progress Button */}
          {photos.length >= 2 && (
            <TouchableOpacity style={styles.compareButton} onPress={handleViewComparison}>
              <Text style={styles.compareButtonText}>Compare Progress</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Empty State */}
      {photos.length === 0 && !needsWeek0Photo && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptyBody}>Take your first progress photo to get started.</Text>
        </View>
      )}

      {/* Dev Tools - Only visible when dev mode is enabled */}
      {isDevModeEnabled && (
        <View style={styles.devToolsSection}>
          <Text style={styles.devToolsTitle}>Dev Tools</Text>
          <TouchableOpacity style={styles.devToolButton} onPress={handleResetPhotos}>
            <Text style={styles.devToolButtonText}>Reset All Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.devToolButton} onPress={handleAdvanceWeek}>
            <Text style={styles.devToolButtonText}>Advance to Next Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.devToolButton} onPress={handleTestReviewPrompt}>
            <Text style={styles.devToolButtonText}>Test Review Prompt</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    
    {/* Paywall Modal */}
    <PhotoPaywallModal
      visible={showPaywall}
      onClose={handlePaywallClose}
      onPurchaseComplete={handlePaywallPurchaseComplete}
    />

    {/* Review Prompt Modal */}
    <ReviewPromptModal
      visible={showReviewModal}
      onLeaveReview={handleLeaveReview}
      onNotNow={handleNotNow}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  promptCard: {
    backgroundColor: '#303030', // Lighter than surface (#141414) to stand out more
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  promptTitle: {
    ...typography.headingSmall,
    marginBottom: spacing.sm,
  },
  promptBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  promptButtonContainer: {
    backgroundColor: '#D6D6D6', // Darker background for the button area
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderRadius: 4,
  },
  promptButton: {
    ...typography.body,
    color: '#212121',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
  },
  photoListContainer: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  photoThumbnail: {
    width: 120,
    marginRight: spacing.md,
  },
  thumbnailImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  expectationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  phaseTitle: {
    ...typography.headingSmall,
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
  },
  expectationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  expectationTitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  accordionItem: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  accordionProblem: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  accordionIcon: {
    ...typography.headingSmall,
    fontSize: 20,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  accordionContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  expectationDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  daysBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.md,
  },
  daysBadgeText: {
    ...typography.label,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  thumbnailLabel: {
    ...typography.label,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  compareButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  compareButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  devToolsSection: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  devToolsTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  devToolButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  devToolButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.headingSmall,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryButton: {
    backgroundColor: colors.buttonAccent,
    borderWidth: 1,
    borderColor: colors.buttonAccent,
    borderRadius: 4,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  summaryButtonText: {
    ...typography.body,
    color: '#000000',
    fontWeight: '600',
  },
});

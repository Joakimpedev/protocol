/**
 * Photo Detail Screen
 *
 * Shows a large photo with what to expect content below it
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentWeekNumber, loadAllPhotos, getPhotoForWeek, ProgressPhoto } from '../services/photoService';
import { getWhatToExpect } from '../services/whatToExpectService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PhotoDetailScreen({ route, navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { weekNumber: initialWeekNumber, photoUri: initialPhotoUri } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [signupDate, setSignupDate] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [currentPhotoWeek, setCurrentPhotoWeek] = useState<number>(initialWeekNumber);
  const [currentPhotoUri, setCurrentPhotoUri] = useState<string>(initialPhotoUri);
  const flatListRef = useRef<FlatList>(null);
  const [whatToExpectContent, setWhatToExpectContent] = useState<{ [week: number]: any }>({});

  useEffect(() => {
    if (user) {
      loadUserData();
    }
    loadPhotos();
  }, [user]);

  // Load what to expect content for all weeks
  useEffect(() => {
    const loadWhatToExpect = async () => {
      if (!user || userCategories.length === 0) return;

      try {
        const allWeeks = Array.from(new Set(photos.map(p => p.weekNumber)));
        const contentMap: { [week: number]: any } = {};

        for (const week of allWeeks) {
          if (week !== 0) {
            const content = getWhatToExpect(week, userCategories);
            contentMap[week] = content;
          }
        }

        setWhatToExpectContent(contentMap);
      } catch (error) {
        console.error('Error loading what to expect:', error);
      }
    };

    if (photos.length > 0 && userCategories.length > 0) {
      loadWhatToExpect();
    }
  }, [photos, userCategories, user]);


  const loadUserData = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const signup = userData.signupDate || userData.signup_date;
        const concerns = userData.concerns || [];

        setSignupDate(signup);
        setUserCategories(concerns);

        if (signup) {
          const weekNum = getCurrentWeekNumber(signup);
          setCurrentWeek(weekNum);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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

  const availableWeeks = Array.from(new Set(photos.map(p => p.weekNumber)))
    .sort((a, b) => b - a); // Newest first

  // Find initial index for scroll position
  const initialIndex = availableWeeks.indexOf(initialWeekNumber);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    if (index >= 0 && index < availableWeeks.length) {
      const week = availableWeeks[index];
      if (week !== currentPhotoWeek) {
        setCurrentPhotoWeek(week);
      }
    }
  };

  // Update photo when week changes (from scroll)
  useEffect(() => {
    const updatePhoto = async () => {
      const photo = await getPhotoForWeek(currentPhotoWeek);
      if (photo) {
        setCurrentPhotoUri(photo.uri);
      }
    };
    updatePhoto();
  }, [currentPhotoWeek]);



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Week {currentPhotoWeek}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Horizontal Scrollable Photos */}
      <FlatList
        ref={flatListRef}
        data={availableWeeks}
        horizontal
        pagingEnabled
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        keyExtractor={(week) => `week-${week}`}
        renderItem={({ item: week }) => {
          const weekPhoto = photos.find(p => p.weekNumber === week);
          if (!weekPhoto) return null;

          // Get what to expect content for this week
          const weekContent = whatToExpectContent[week];
          const currentWeekText = weekContent?.problems
            ?.map((p: any) => p.currentWeekSummary.trim().replace(/\.+$/, ''))
            .join('. ') + (weekContent?.problems?.length > 0 ? '.' : '');

          return (
            <ScrollView
              style={[styles.scrollView, { width: SCREEN_WIDTH }]}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Large Photo */}
              <View style={styles.photoContainer}>
                <Image source={{ uri: weekPhoto.uri }} style={styles.photo} resizeMode="contain" />
              </View>

              {/* Week 0 Baseline Message */}
              {week === 0 && (
                <View style={styles.baselineCard}>
                  <Text style={styles.baselineTitle}>Baseline Photo</Text>
                  <Text style={styles.baselineText}>
                    This is your starting point. Use this photo to compare your progress over time.
                  </Text>
                </View>
              )}

              {/* What to Expect Content - Always shown for non-week-0 */}
              {week !== 0 && weekContent && currentWeekText && (
                <View style={styles.expectationCard}>
                  <Text style={styles.sectionLabel}>How you should feel</Text>
                  <Text style={styles.currentWeekText}>{currentWeekText}</Text>
                </View>
              )}
            </ScrollView>
          );
        }}
      />

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
    headerTitle: {
      ...theme.typography.headingSmall,
      fontSize: 18,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    photoContainer: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.lg,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    baselineCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    baselineTitle: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.sm,
    },
    baselineText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    expectationCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    sectionLabel: {
      ...theme.typography.label,
      marginBottom: theme.spacing.sm,
      color: theme.colors.text,
      fontWeight: '600',
    },
    currentWeekText: {
      ...theme.typography.body,
      lineHeight: 24,
      color: theme.colors.textSecondary,
    },
  });
}

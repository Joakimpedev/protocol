/**
 * Photo Comparison Screen
 *
 * Side-by-side comparison of Week 0 vs selected week
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, PanResponder, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { usePremium } from '../contexts/PremiumContext';
import { loadAllPhotos, getPhotoForWeek, ProgressPhoto } from '../services/photoService';
import SliderPaywallModal from '../components/SliderPaywallModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Import icons
const StackedIcon = require('../../assets/icons/Stacked.png');
const SliderIcon = require('../../assets/icons/Slider.png');

type LayoutMode = 'stacked' | 'slider';

interface PhotoComparisonScreenProps {
  route: {
    params?: {
      selectedWeek?: number;
      isTopPhoto?: boolean;
    };
  };
  navigation: any;
}

export default function PhotoComparisonScreen({ route, navigation }: PhotoComparisonScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { isPremium } = usePremium();
  const { selectedWeek: initialSelectedWeek } = route.params || {};
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [week0Photo, setWeek0Photo] = useState<ProgressPhoto | null>(null);
  const [topPhotoWeek, setTopPhotoWeek] = useState<number>(0);
  const [bottomPhotoWeek, setBottomPhotoWeek] = useState<number>(initialSelectedWeek || 1);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('stacked');
  const [sliderPosition, setSliderPosition] = useState<number>(0.5); // 0 to 1, where 0.5 is center
  const [showSliderPaywall, setShowSliderPaywall] = useState(false);

  useEffect(() => {
    loadPhotos(true);
  }, []);

  // Watch for route param changes (when navigating back from WeekPicker)
  // This handles the case when navigating to an already-mounted screen
  useEffect(() => {
    const selectedWeek = route.params?.selectedWeek;
    const isTopPhoto = route.params?.isTopPhoto;

    if (selectedWeek !== undefined) {
      if (isTopPhoto) {
        setTopPhotoWeek(selectedWeek);
      } else {
        setBottomPhotoWeek(selectedWeek);
      }
      // Clear the params to avoid re-triggering
      navigation.setParams({ selectedWeek: undefined, isTopPhoto: undefined });
    }
  }, [route.params?.selectedWeek, route.params?.isTopPhoto, navigation]);

  // Reload photos and check for param updates when screen comes into focus
  // This ensures we catch param changes when navigating back from WeekPicker
  useFocusEffect(
    React.useCallback(() => {
      // Check for new params when screen comes into focus
      const selectedWeek = route.params?.selectedWeek;
      const isTopPhoto = route.params?.isTopPhoto;

      if (selectedWeek !== undefined) {
        if (isTopPhoto) {
          setTopPhotoWeek(selectedWeek);
        } else {
          setBottomPhotoWeek(selectedWeek);
        }
        // Clear the params to avoid re-triggering
        navigation.setParams({ selectedWeek: undefined, isTopPhoto: undefined });
      }

      // Reload photos (but don't reset weeks)
      loadPhotos(false);
    }, [route.params?.selectedWeek, route.params?.isTopPhoto, navigation])
  );

  const loadPhotos = async (isInitialLoad: boolean = false) => {
    try {
      const allPhotos = await loadAllPhotos();
      setPhotos(allPhotos);

      const week0 = await getPhotoForWeek(0);
      setWeek0Photo(week0);

      // Only set initial weeks on first load
      if (isInitialLoad && !hasInitialized) {
        // Set top photo to week 0 if available
        if (week0) {
          setTopPhotoWeek(0);
        }

        // If no selected week from params, use the highest available week for bottom
        if (!initialSelectedWeek && allPhotos.length > 0) {
          const maxWeek = Math.max(...allPhotos.map(p => p.weekNumber));
          if (maxWeek > 0) {
            setBottomPhotoWeek(maxWeek);
          }
        } else if (initialSelectedWeek) {
          setBottomPhotoWeek(initialSelectedWeek);
        }
        setHasInitialized(true);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhotoForWeekNumber = (week: number): ProgressPhoto | null => {
    return photos.find(p => p.weekNumber === week) || null;
  };

  const allAvailableWeeks = Array.from(new Set(photos.map(p => p.weekNumber)))
    .sort((a, b) => b - a); // Newest first

  const handleTopPhotoPress = () => {
    navigation.navigate('WeekPicker', {
      currentWeek: topPhotoWeek,
      isTopPhoto: true,
    });
  };

  const handleBottomPhotoPress = () => {
    navigation.navigate('WeekPicker', {
      currentWeek: bottomPhotoWeek,
      isTopPhoto: false,
    });
  };

  // Pan responder for slider drag
  const sliderContainerRef = React.useRef<View>(null);
  const [sliderLayout, setSliderLayout] = useState({ x: 0, width: 0, y: 0 });
  const sliderStartPosition = React.useRef(0.5);
  const isDragging = React.useRef(false);
  const layoutWidthRef = React.useRef(0);

  // Update layout width ref when layout changes
  useEffect(() => {
    layoutWidthRef.current = sliderLayout.width;
  }, [sliderLayout.width]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const width = layoutWidthRef.current;
        if (width === 0) return;
        isDragging.current = true;
        const touchX = evt.nativeEvent.locationX;
        const initialPosition = Math.max(0, Math.min(1, touchX / width));
        // Set the start position to where the finger touched, not the old slider position
        sliderStartPosition.current = initialPosition;
        setSliderPosition(initialPosition);
      },
      onPanResponderMove: (evt, gestureState) => {
        const width = layoutWidthRef.current;
        if (width === 0 || !isDragging.current) return;
        const deltaX = gestureState.dx;
        const deltaRatio = deltaX / width;
        const newPosition = Math.max(0, Math.min(1, sliderStartPosition.current + deltaRatio));
        setSliderPosition(newPosition);
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  const topPhoto = getPhotoForWeekNumber(topPhotoWeek);
  const bottomPhoto = getPhotoForWeekNumber(bottomPhotoWeek);

  // Set header buttons
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, layoutMode === 'stacked' && styles.headerButtonActive]}
            onPress={() => setLayoutMode('stacked')}
          >
            <Image
              source={StackedIcon}
              style={[
                styles.headerIcon,
                layoutMode === 'stacked' && styles.headerIconActive
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, layoutMode === 'slider' && styles.headerButtonActive]}
            onPress={() => {
              if (isPremium) {
                setLayoutMode('slider');
              } else {
                setShowSliderPaywall(true);
              }
            }}
          >
            <Image
              source={SliderIcon}
              style={styles.sliderIcon}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, layoutMode]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  if (!week0Photo) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>No baseline photo</Text>
        <Text style={styles.body}>Week 0 photo is required for comparison.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderStackedLayout = () => (
    <View style={styles.photosContainer}>
      {/* Top Photo */}
      <TouchableOpacity
        style={styles.photoContainer}
        onPress={handleTopPhotoPress}
        activeOpacity={0.9}
      >
        {topPhoto ? (
          <>
            <Image source={{ uri: topPhoto.uri }} style={styles.photo} resizeMode="cover" />
            <Text style={styles.photoLabel}>Week {topPhotoWeek}</Text>
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Tap to select week</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom Photo */}
      <TouchableOpacity
        style={styles.photoContainer}
        onPress={handleBottomPhotoPress}
        activeOpacity={0.9}
      >
        {bottomPhoto ? (
          <>
            <Image source={{ uri: bottomPhoto.uri }} style={styles.photo} resizeMode="cover" />
            <Text style={styles.photoLabel}>Week {bottomPhotoWeek}</Text>
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Tap to select week</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSliderLayout = () => {
    const containerWidth = SCREEN_WIDTH - (theme.spacing.md * 2);
    const sliderX = sliderPosition * containerWidth;
    const leftImageWidth = sliderX;
    const rightImageWidth = containerWidth - sliderX;

    return (
      <View style={styles.sliderContainer}>
        <View
          ref={sliderContainerRef}
          style={styles.sliderWrapper}
          onLayout={(event) => {
            const { x, y, width } = event.nativeEvent.layout;
            setSliderLayout({ x, y, width });
          }}
          {...(panResponder.panHandlers)}
          collapsable={false}
        >
          {/* Left Photo (Top Photo) */}
          <View style={[styles.sliderPhotoContainer, { width: containerWidth }]} pointerEvents="none">
            {topPhoto ? (
              <Image
                source={{ uri: topPhoto.uri }}
                style={[styles.sliderPhoto, { width: containerWidth }]}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>Tap to select week</Text>
              </View>
            )}
            <Text style={[styles.photoLabel, { left: theme.spacing.sm }]}>Week {topPhotoWeek}</Text>
          </View>

          {/* Right Photo (Bottom Photo) - clipped */}
          <View
            style={[
              styles.sliderPhotoContainer,
              styles.sliderPhotoRight,
              { width: rightImageWidth }
            ]}
            pointerEvents="none"
          >
            {bottomPhoto ? (
              <Image
                source={{ uri: bottomPhoto.uri }}
                style={[styles.sliderPhoto, { width: containerWidth, marginLeft: -leftImageWidth }]}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>Tap to select week</Text>
              </View>
            )}
            <Text style={[styles.photoLabel, { right: theme.spacing.sm, left: 'auto' }]}>Week {bottomPhotoWeek}</Text>
          </View>

          {/* Slider Handle */}
          <View style={[styles.sliderHandle, { left: sliderX - 15 }]} pointerEvents="none">
            <View style={styles.sliderHandleLine} />
            <View style={styles.sliderHandleCircle}>
              <View style={styles.sliderHandleArrowLeft} />
              <View style={styles.sliderHandleArrowRight} />
            </View>
            <View style={styles.sliderHandleLine} />
          </View>
        </View>

        {/* Left Photo Picker Button (Bottom Left) - Just below the images */}
        <TouchableOpacity
          style={[styles.sliderPickerButton, { top: sliderLayout.y + 15 + sliderLayout.width + theme.spacing.xs }]}
          onPress={handleTopPhotoPress}
          activeOpacity={0.7}
        >
          <View style={styles.pickerButtonContent}>
            <Text style={styles.pickerButtonText}>Pick week</Text>
          </View>
        </TouchableOpacity>

        {/* Right Photo Picker Button (Bottom Right) - Just below the images */}
        <TouchableOpacity
          style={[styles.sliderPickerButton, styles.sliderPickerButtonRight, { top: sliderLayout.y + 15 + sliderLayout.width + theme.spacing.xs }]}
          onPress={handleBottomPhotoPress}
          activeOpacity={0.7}
        >
          <View style={styles.pickerButtonContent}>
            <Text style={styles.pickerButtonText}>Pick week</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {layoutMode === 'stacked' ? renderStackedLayout() : renderSliderLayout()}
      <SliderPaywallModal
        visible={showSliderPaywall}
        onClose={() => setShowSliderPaywall(false)}
        onPurchaseComplete={() => {
          setShowSliderPaywall(false);
          setLayoutMode('slider');
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
    photosContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    photoContainer: {
      flex: 1,
      aspectRatio: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      maxHeight: '48%',
      maxWidth: '100%',
      alignSelf: 'center',
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    photoLabel: {
      ...theme.typography.label,
      position: 'absolute',
      bottom: theme.spacing.sm,
      left: theme.spacing.sm,
      backgroundColor: theme.colors.overlay,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: 2,
      color: '#FFFFFF',
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    heading: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    button: {
      backgroundColor: theme.colors.text,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    buttonText: {
      ...theme.typography.body,
      color: theme.colors.background,
      fontWeight: '600',
    },
    headerButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    headerButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: 'transparent',
    },
    headerButtonActive: {
      backgroundColor: '#2a2a2a', // Brighter than surface for better visibility
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerIcon: {
      width: 24,
      height: 24,
      // No tintColor - shows original image colors
    },
    headerIconActive: {
      // No tintColor - shows original image colors
    },
    sliderIcon: {
      width: 24,
      height: 24,
      // No tintColor - shows original image colors
    },
    sliderContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      justifyContent: 'center',
    },
    sliderWrapper: {
      width: '100%',
      aspectRatio: 1,
      position: 'relative',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      // Ensure it can receive touches
      zIndex: 1,
    },
    sliderPhotoContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      overflow: 'hidden',
    },
    sliderPhotoRight: {
      right: 0,
      left: 'auto',
    },
    sliderPhoto: {
      height: '100%',
    },
    sliderHandle: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 30,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    sliderHandleLine: {
      flex: 1,
      width: 2,
      backgroundColor: theme.colors.text,
    },
    sliderHandleCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.text,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 2,
    },
    sliderHandleArrowLeft: {
      width: 0,
      height: 0,
      borderTopWidth: 5,
      borderBottomWidth: 5,
      borderRightWidth: 6,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderRightColor: theme.colors.background,
    },
    sliderHandleArrowRight: {
      width: 0,
      height: 0,
      borderTopWidth: 5,
      borderBottomWidth: 5,
      borderLeftWidth: 6,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: theme.colors.background,
    },
    sliderPickerButton: {
      position: 'absolute',
      // Position will be set dynamically based on sliderWrapper position
      left: theme.spacing.md + theme.spacing.sm,
      zIndex: 20,
      minWidth: 80, // Make it easier to tap
      minHeight: 36, // Minimum touch target size
    },
    sliderPickerButtonRight: {
      left: 'auto',
      right: theme.spacing.md + theme.spacing.sm,
    },
    pickerButtonContent: {
      backgroundColor: theme.colors.overlay,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 36, // Ensure minimum touch target
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerButtonText: {
      ...theme.typography.label,
      color: '#FFFFFF',
      fontSize: 13, // Slightly bigger text
      fontWeight: '600',
    },
  });
}

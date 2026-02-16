/**
 * Photo Import Screen (Dev Mode)
 *
 * Allows importing photos from gallery with adjustment tools:
 * - Rotation slider (minimal increments)
 * - Zoom slider (max 30%)
 * - Touch to move image
 * - Face overlay for alignment
 * - Square crop preview
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import FaceOutlineOverlay from '../components/FaceOutlineOverlay';
import { saveProgressPhoto } from '../services/photoService';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SIZE = SCREEN_WIDTH;
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 1.7; // 70% max zoom
const ROTATION_STEP = 0.5; // Minimal angle increments (0.5 degrees)
const MAX_ROTATION = 20; // Max rotation in degrees (each side)

interface PhotoImportScreenProps {
  route: {
    params: {
      weekNumber: number;
    };
  };
  navigation: any;
}

export default function PhotoImportScreen({ route, navigation }: PhotoImportScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { weekNumber } = route.params;
  const insets = useSafeAreaInsets();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); // in degrees
  const [zoom, setZoom] = useState(1.0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [displayImageSize, setDisplayImageSize] = useState({ width: PREVIEW_SIZE, height: PREVIEW_SIZE });

  // Use refs to track current translate values to avoid stale closures
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);

  // Update refs when state changes
  useEffect(() => {
    translateXRef.current = translateX;
    translateYRef.current = translateY;
  }, [translateX, translateY]);

  // Track the starting position when gesture begins
  const gestureStartRef = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Capture the current position when gesture starts
        gestureStartRef.current = {
          x: translateXRef.current,
          y: translateYRef.current,
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        // Calculate new position from gesture start position + delta
        // gestureState.dx/dy are relative to the start of the gesture
        const newX = gestureStartRef.current.x + gestureState.dx;
        const newY = gestureStartRef.current.y + gestureState.dy;

        // No constraints - allow free panning
        setTranslateX(newX);
        setTranslateY(newY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Finalize the position without constraints
        const newX = gestureStartRef.current.x + gestureState.dx;
        const newY = gestureStartRef.current.y + gestureState.dy;

        setTranslateX(newX);
        setTranslateY(newY);
        // Update refs to the final position
        translateXRef.current = newX;
        translateYRef.current = newY;
      },
      onPanResponderTerminate: (evt, gestureState) => {
        // Handle cancellation - revert to start position
        setTranslateX(gestureStartRef.current.x);
        setTranslateY(gestureStartRef.current.y);
        translateXRef.current = gestureStartRef.current.x;
        translateYRef.current = gestureStartRef.current.y;
      },
    })
  ).current;

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to import images.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);

        // Get image dimensions and calculate display size
        Image.getSize(uri, (width, height) => {
          setImageDimensions({ width, height });

          // Calculate display size: width always matches preview width (touches sides)
          // Height is calculated to maintain aspect ratio (can be taller than preview)
          const aspectRatio = width / height;
          const displayWidth = PREVIEW_SIZE;
          const displayHeight = PREVIEW_SIZE / aspectRatio;

          setDisplayImageSize({ width: displayWidth, height: displayHeight });

          // Reset transforms and center image initially
          setRotation(0);
          setZoom(1.0);

          // Center the image initially (for tall images, center vertically; for wide images, center horizontally)
          let initialX = 0;
          let initialY = 0;

          if (aspectRatio < 1) {
            // Portrait: center vertically (image is taller than square)
            initialY = (PREVIEW_SIZE - displayHeight) / 2;
          } else if (aspectRatio > 1) {
            // Landscape: center horizontally (image is wider than square)
            // Actually, with our display logic, width is always PREVIEW_SIZE, so no horizontal centering needed
            // But if image is very wide, we might need to handle this differently
            initialX = 0;
          }

          setTranslateX(initialX);
          setTranslateY(initialY);
          translateXRef.current = initialX;
          translateYRef.current = initialY;
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRotationChange = (value: number) => {
    // Round to nearest step for fine-tuning
    const roundedValue = Math.round(value / ROTATION_STEP) * ROTATION_STEP;
    setRotation(roundedValue);
  };

  const handleZoomChange = (value: number) => {
    // Clamp between MIN_ZOOM and MAX_ZOOM
    const clampedValue = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    setZoom(clampedValue);
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1.0);
    setTranslateX(0);
    setTranslateY(0);
    translateXRef.current = 0;
    translateYRef.current = 0;

    // Re-center the image if needed
    if (selectedImage && imageDimensions.width > 0) {
      const aspectRatio = imageDimensions.width / imageDimensions.height;
      let initialX = 0;
      let initialY = 0;

      if (aspectRatio < 1) {
        // Portrait: center vertically
        const displayHeight = PREVIEW_SIZE / aspectRatio;
        initialY = (PREVIEW_SIZE - displayHeight) / 2;
      }

      setTranslateX(initialX);
      setTranslateY(initialY);
      translateXRef.current = initialX;
      translateYRef.current = initialY;
    }
  };

  const handleUsePhoto = async () => {
    if (!selectedImage) return;

    try {
      setIsProcessing(true);

      const squareSize = 1080;
      const { width: origWidth, height: origHeight } = imageDimensions;

      // Step 1: Resize original image to a large size (maintaining aspect ratio)
      // Use the larger dimension to ensure we have enough pixels
      const maxDimension = Math.max(origWidth, origHeight);
      const scaleFactor = squareSize * 2 / maxDimension; // Use 2x square size to have room for transforms
      const resizedWidth = Math.round(origWidth * scaleFactor);
      const resizedHeight = Math.round(origHeight * scaleFactor);

      const resized = await ImageManipulator.manipulateAsync(
        selectedImage,
        [{ resize: { width: resizedWidth, height: resizedHeight } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Step 2: Apply rotation
      let rotated = resized;
      if (Math.abs(rotation) > 0.1) {
        rotated = await ImageManipulator.manipulateAsync(
          resized.uri,
          [{ rotate: rotation }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );
      }

      // Step 3: Apply zoom by resizing
      let zoomed = rotated;
      if (Math.abs(zoom - 1.0) > 0.01) {
        zoomed = await ImageManipulator.manipulateAsync(
          rotated.uri,
          [{ resize: { width: rotated.width * zoom, height: rotated.height * zoom } }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );
      }

      // Step 4: Calculate crop position to extract the square visible in preview
      const displayToOriginalScaleX = imageDimensions.width / displayImageSize.width;
      const displayToOriginalScaleY = imageDimensions.height / displayImageSize.height;

      const originalToProcessedScaleX = zoomed.width / imageDimensions.width;
      const originalToProcessedScaleY = zoomed.height / imageDimensions.height;

      const previewCenterInImageDisplayX = PREVIEW_SIZE / 2;
      const previewCenterInImageDisplayY = PREVIEW_SIZE / 2;

      const pointAtPreviewCenterX = previewCenterInImageDisplayX - translateX;
      const pointAtPreviewCenterY = previewCenterInImageDisplayY - translateY;

      const pointAtPreviewCenterOriginalX = pointAtPreviewCenterX * displayToOriginalScaleX;
      const pointAtPreviewCenterOriginalY = pointAtPreviewCenterY * displayToOriginalScaleY;

      const pointAtPreviewCenterProcessedX = pointAtPreviewCenterOriginalX * originalToProcessedScaleX;
      const pointAtPreviewCenterProcessedY = pointAtPreviewCenterOriginalY * originalToProcessedScaleY;

      const resizeScaleFactor = resized.width / imageDimensions.width;
      const squareSizeInProcessedX = PREVIEW_SIZE * displayToOriginalScaleX * resizeScaleFactor;
      const squareSizeInProcessedY = PREVIEW_SIZE * displayToOriginalScaleY * resizeScaleFactor;

      const squareSizeInProcessed = Math.min(squareSizeInProcessedX, squareSizeInProcessedY);

      const cropCenterX = pointAtPreviewCenterProcessedX;
      const cropCenterY = pointAtPreviewCenterProcessedY;

      // Debug logging
      console.log('Photo Import Debug:', {
        translateX,
        translateY,
        zoom,
        rotation,
        imageDimensions,
        displayImageSize,
        previewCenterInImageDisplayX,
        previewCenterInImageDisplayY,
        pointAtPreviewCenterX,
        pointAtPreviewCenterY,
        pointAtPreviewCenterOriginalX,
        pointAtPreviewCenterOriginalY,
        pointAtPreviewCenterProcessedX,
        pointAtPreviewCenterProcessedY,
        squareSizeInProcessed,
        resizeScaleFactor,
        originalToProcessedScaleX,
        originalToProcessedScaleY,
        zoomedWidth: zoomed.width,
        zoomedHeight: zoomed.height,
      });

      const finalCropX = Math.max(0, Math.min(cropCenterX - squareSizeInProcessed / 2, zoomed.width - squareSizeInProcessed));
      const finalCropY = Math.max(0, Math.min(cropCenterY - squareSizeInProcessed / 2, zoomed.height - squareSizeInProcessed));

      // Ensure we have a valid crop size that fits within the image
      const actualCropSize = Math.min(
        squareSizeInProcessed,
        zoomed.width - finalCropX,
        zoomed.height - finalCropY
      );

      // Step 5: Final crop to square and flip
      const finalImage = await ImageManipulator.manipulateAsync(
        zoomed.uri,
        [
          {
            crop: {
              originX: finalCropX,
              originY: finalCropY,
              width: actualCropSize,
              height: actualCropSize,
            },
          },
          { resize: { width: squareSize, height: squareSize } },
          { flip: ImageManipulator.FlipType.Horizontal }, // Match camera behavior
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Save the photo
      const savedPhotoPath = await saveProgressPhoto(finalImage.uri, weekNumber);

      // Navigate to WhatToExpect screen
      navigation.navigate('WhatToExpect', {
        weekNumber,
      });
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.pickerContainer}>
          <Text style={styles.heading}>Import Photo</Text>
          <Text style={styles.description}>
            Select a photo from your gallery to use as your progress photo.
          </Text>
          <TouchableOpacity style={styles.pickButton} onPress={handlePickImage}>
            <Text style={styles.pickButtonText}>Choose Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate transform for display
  // Order matters: translate first, then rotate, then scale
  // This makes panning feel natural even when rotated
  const transform = [
    { translateX },
    { translateY },
    { rotate: `${rotation}deg` },
    { scale: zoom },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.previewContainer, { marginTop: insets.top + theme.spacing.lg }]}>
        <View style={styles.imageWrapper} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.imageContainer,
              {
                width: displayImageSize.width,
                height: displayImageSize.height,
                transform,
              },
            ]}
          >
            <Image
              source={{ uri: selectedImage }}
              style={[
                styles.previewImage,
                {
                  width: displayImageSize.width,
                  height: displayImageSize.height,
                },
              ]}
              resizeMode="cover"
            />
          </Animated.View>
        </View>
        <View style={styles.overlayContainer}>
          <FaceOutlineOverlay />
        </View>
      </View>

      <View style={styles.controlsContainer}>
        {/* Rotation Slider */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Rotation: {rotation.toFixed(1)}°</Text>
          <Slider
            style={styles.slider}
            minimumValue={-MAX_ROTATION}
            maximumValue={MAX_ROTATION}
            value={rotation}
            onValueChange={handleRotationChange}
            minimumTrackTintColor={theme.colors.text}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.text}
            step={ROTATION_STEP}
          />
        </View>

        {/* Zoom Slider */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>
            Zoom: {((zoom - 1) * 100).toFixed(0)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={MIN_ZOOM}
            maximumValue={MAX_ZOOM}
            value={zoom}
            onValueChange={handleZoomChange}
            minimumTrackTintColor={theme.colors.text}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.text}
            step={0.01}
          />
        </View>

        {/* Instructions */}
        <Text style={styles.instructionText}>
          Drag the image to position it. Use sliders to rotate and zoom.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            disabled={isProcessing}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.useButton}
            onPress={handleUsePhoto}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.useButtonText}>Use Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    pickerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    heading: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    pickButton: {
      backgroundColor: theme.colors.text,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
    },
    pickButtonText: {
      ...theme.typography.body,
      color: theme.colors.background,
      fontWeight: '600',
    },
    cancelButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
    },
    cancelButtonText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    previewContainer: {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
      alignSelf: 'center',
      position: 'relative',
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    imageWrapper: {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
      position: 'absolute',
      overflow: 'hidden',
    },
    imageContainer: {
      // Size will be set dynamically based on displayImageSize
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    overlayContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    controlsContainer: {
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    controlRow: {
      marginBottom: theme.spacing.lg,
    },
    controlLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    slider: {
      width: '100%',
      height: 40,
    },
    instructionText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      fontStyle: 'italic',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    resetButton: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    resetButtonText: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '600',
    },
    useButton: {
      flex: 1,
      backgroundColor: theme.colors.text,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    useButtonText: {
      ...theme.typography.body,
      color: theme.colors.background,
      fontWeight: '600',
    },
  });
}

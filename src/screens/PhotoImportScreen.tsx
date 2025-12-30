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

import React, { useState, useEffect, useRef } from 'react';
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
import { colors, typography, spacing } from '../constants/theme';
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
      // 
      // Strategy: Calculate what region of the original image is visible in the preview square,
      // then apply the same transformations to extract that exact region.
      // 
      // Key insight: The preview shows a square viewport. We need to find what square region
      // of the processed (rotated, zoomed) image corresponds to that viewport.
      //
      // Transform order in display: translate -> rotate -> scale
      // Transform order in processing: resize -> rotate -> zoom (resize) -> crop
      //
      // The preview square is PREVIEW_SIZE x PREVIEW_SIZE
      // The image is displayed at displayImageSize, then transformed
      
      // Calculate scale factors
      // displayImageSize represents the original image scaled to fit preview width
      // displayImageSize.width = PREVIEW_SIZE (always)
      const displayToOriginalScaleX = imageDimensions.width / displayImageSize.width;
      const displayToOriginalScaleY = imageDimensions.height / displayImageSize.height;
      
      // Calculate scale from original to processed (after resize, rotate, zoom)
      // The processed image has been: resized (for quality) -> rotated -> zoomed
      const originalToProcessedScaleX = zoomed.width / imageDimensions.width;
      const originalToProcessedScaleY = zoomed.height / imageDimensions.height;
      
      // Calculate what region of the processed image corresponds to the preview square
      //
      // Key insight: The preview shows displayImageSize, then applies translate -> rotate -> zoom
      // We need to find what square region of the processed image matches the preview square
      
      // Calculate what point in the image is at the preview center
      // 
      // The preview center is fixed at (PREVIEW_SIZE/2, PREVIEW_SIZE/2) in preview coordinates.
      // The image is displayed at displayImageSize, which has width = PREVIEW_SIZE.
      // 
      // In image display coordinates, the preview center is at:
      // - X: PREVIEW_SIZE / 2 (same as imageCenterX since width = PREVIEW_SIZE)
      // - Y: PREVIEW_SIZE / 2 (this is the key - it's the preview center, not the image center)
      //
      // When the image is translated by translateX/Y, it moves. The point at the fixed preview center
      // comes from a different point in the image. Since the image moves, we subtract the translation:
      const previewCenterInImageDisplayX = PREVIEW_SIZE / 2;
      const previewCenterInImageDisplayY = PREVIEW_SIZE / 2;
      
      // After translation, the point in the image that's at the preview center is:
      const pointAtPreviewCenterX = previewCenterInImageDisplayX - translateX;
      const pointAtPreviewCenterY = previewCenterInImageDisplayY - translateY;
      
      // Convert from display coordinates to original image coordinates
      const pointAtPreviewCenterOriginalX = pointAtPreviewCenterX * displayToOriginalScaleX;
      const pointAtPreviewCenterOriginalY = pointAtPreviewCenterY * displayToOriginalScaleY;
      
      // Convert from original to processed (resized -> rotated -> zoomed) coordinates
      const pointAtPreviewCenterProcessedX = pointAtPreviewCenterOriginalX * originalToProcessedScaleX;
      const pointAtPreviewCenterProcessedY = pointAtPreviewCenterOriginalY * originalToProcessedScaleY;
      
      // Calculate the size of the preview square in processed coordinates
      // 
      // The preview shows: displayImageSize (width = PREVIEW_SIZE), then zoomed by zoom
      // The processed image is: original -> resized -> rotated -> zoomed
      //
      // In the preview, when zoomed, the image appears larger.
      // The PREVIEW_SIZE square covers a smaller portion of the zoomed image.
      // Specifically, it covers PREVIEW_SIZE / zoom of the zoomed display size.
      //
      // To find the square size in processed coordinates:
      // 1. Square in preview: PREVIEW_SIZE (in preview coordinates)
      // 2. Square in zoomed display: PREVIEW_SIZE / zoom (smaller when zoomed)
      // 3. Convert to original image: (PREVIEW_SIZE / zoom) * displayToOriginalScaleX
      // 4. Convert to processed: (PREVIEW_SIZE / zoom) * displayToOriginalScaleX * originalToProcessedScaleX
      //
      // originalToProcessedScaleX = (resized.width * zoom) / imageDimensions.width
      // But resized.width = imageDimensions.width * resizeScaleFactor
      // So originalToProcessedScaleX = resizeScaleFactor * zoom
      //
      // Therefore: squareSize = (PREVIEW_SIZE / zoom) * displayToOriginalScaleX * (resizeScaleFactor * zoom)
      // = PREVIEW_SIZE * displayToOriginalScaleX * resizeScaleFactor
      //
      // This means the square size in processed coordinates doesn't depend on zoom directly,
      // because the processed image is already zoomed, so we extract a square that corresponds
      // to PREVIEW_SIZE in the original display, scaled by the resize factor.
      const resizeScaleFactor = resized.width / imageDimensions.width;
      const squareSizeInProcessedX = PREVIEW_SIZE * displayToOriginalScaleX * resizeScaleFactor;
      const squareSizeInProcessedY = PREVIEW_SIZE * displayToOriginalScaleY * resizeScaleFactor;
      
      // Use the smaller dimension to ensure we stay within bounds
      const squareSizeInProcessed = Math.min(squareSizeInProcessedX, squareSizeInProcessedY);
      
      // Calculate crop position (top-left corner)
      // The crop should be centered at pointAtPreviewCenterProcessed
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
      // Crop the calculated region (which matches the preview square)
      // Then resize to target squareSize to ensure consistent output size
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
      <View style={[styles.previewContainer, { marginTop: insets.top + spacing.lg }]}>
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
            minimumTrackTintColor={colors.text}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.text}
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
            minimumTrackTintColor={colors.text}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.text}
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
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.useButtonText}>Use Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  pickButton: {
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  pickButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  previewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: colors.surface,
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
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlRow: {
    marginBottom: spacing.lg,
  },
  controlLabel: {
    ...typography.bodySmall,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  instructionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: 4,
    alignItems: 'center',
  },
  resetButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  useButton: {
    flex: 1,
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});


/**
 * Photo Capture Screen
 * 
 * Camera view with face outline overlay for capturing progress photos
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { colors, typography, spacing } from '../constants/theme';
import { useDevMode } from '../contexts/DevModeContext';
import FaceOutlineOverlay from '../components/FaceOutlineOverlay';

interface PhotoCaptureScreenProps {
  route: {
    params: {
      weekNumber: number;
    };
  };
  navigation: any;
}

export default function PhotoCaptureScreen({ route, navigation }: PhotoCaptureScreenProps) {
  const { weekNumber } = route.params;
  const { isDevModeEnabled } = useDevMode();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const cameraRef = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
      });

      navigation.navigate('PhotoPreview', {
        photoUri: photo.uri,
        weekNumber,
      });
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Camera permission required</Text>
        <Text style={styles.body}>We need camera access to capture progress photos.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode="picture"
        />
        <View style={styles.overlayContainer}>
          <FaceOutlineOverlay />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.tipText}>
          Use the same spot and lighting each week for best comparison.
        </Text>

        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        {/* Dev Mode: Import Photo Button */}
        {isDevModeEnabled && (
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => navigation.navigate('PhotoImport', { weekNumber })}
          >
            <Text style={styles.importButtonText}>Import Photo (Dev)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  camera: {
    width: '100%',
    aspectRatio: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Allow touches to pass through to camera
  },
  footer: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.text,
    borderWidth: 4,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.background,
  },
  closeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  closeButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 4,
  },
  buttonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  importButtonText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
  },
});


/**
 * Photo Capture Screen
 *
 * Camera view with face outline overlay for capturing progress photos
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { weekNumber } = route.params;
  const { isDevModeEnabled } = useDevMode();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const cameraRef = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      // On iPad, the permission request might not trigger automatically
      // Try to request it, but handle the case where it doesn't work
      requestPermission().catch((error) => {
        console.error('Error requesting camera permission:', error);
      });
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
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (!result.granted) {
        // Permission denied - offer to open Settings
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in Settings to take progress photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert(
        'Permission Error',
        'Unable to request camera permission. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
    }
  };

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Camera permission required</Text>
        <Text style={styles.body}>We need camera access to capture progress photos.</Text>
        <TouchableOpacity style={styles.button} onPress={handleRequestPermission}>
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
            <ActivityIndicator color={theme.colors.background} />
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

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    cameraWrapper: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
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
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      alignItems: 'center',
    },
    tipText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.text,
      borderWidth: 4,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    captureButtonDisabled: {
      opacity: 0.5,
    },
    captureButtonInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.text,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    closeButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    closeButtonText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    heading: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.md,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    button: {
      backgroundColor: theme.colors.text,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
    },
    buttonText: {
      ...theme.typography.body,
      color: theme.colors.background,
      fontWeight: '600',
    },
    importButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
    },
    importButtonText: {
      ...theme.typography.bodySmall,
      color: theme.colors.warning,
      fontWeight: '600',
    },
  });
}

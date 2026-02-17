import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import FaceScanOverlay from '../../components/v2/FaceScanOverlay';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { saveSelfiePhotos } from '../../services/faceAnalysisService';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const FRAME_WIDTH = 280;
const FRAME_HEIGHT = 370;

type PhotoStep = 'front' | 'side';

export default function SelfieScreen({ navigation }: any) {
  useOnboardingTracking('v2_selfie');
  const { data, updateData } = useOnboarding();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const [photoStep, setPhotoStep] = useState<PhotoStep>('front');
  const [frontUri, setFrontUri] = useState<string | null>(
    (data as any).selfieUri ?? null
  );
  const [sideUri, setSideUri] = useState<string | null>(
    (data as any).sideUri ?? null
  );

  const anims = useScreenEntrance(4);

  const currentUri = photoStep === 'front' ? frontUri : sideUri;
  const setCurrentUri = photoStep === 'front' ? setFrontUri : setSideUri;

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      setCurrentUri(photo.uri);
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUploadPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCurrentUri(result.assets[0].uri);
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentUri(null);
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (photoStep === 'front' && frontUri) {
      setPhotoStep('side');
    } else if (photoStep === 'side' && sideUri && frontUri) {
      try {
        await saveSelfiePhotos(frontUri, sideUri);
      } catch (error) {
        console.warn('[SelfieScreen] Failed to persist photos:', error);
      }
      updateData({ selfieUri: frontUri, sideUri });
      navigation.navigate('V2FakeAnalysis');
    }
  };

  const handleSkipSide = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!frontUri) return;
    try {
      await saveSelfiePhotos(frontUri, null);
    } catch (error) {
      console.warn('[SelfieScreen] Failed to persist photos:', error);
    }
    updateData({ selfieUri: frontUri, sideUri: null });
    navigation.navigate('V2FakeAnalysis');
  };

  const handleRequestPermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in Settings to take your selfie.',
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

  // Loading permission
  if (!permission) {
    return (
      <V2ScreenWrapper showProgress currentStep={4} totalSteps={12} scrollable={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorsV2.textPrimary} />
        </View>
      </V2ScreenWrapper>
    );
  }

  // Permission not granted — show fake camera preview + permission ask
  if (!permission.granted) {
    return (
      <V2ScreenWrapper showProgress currentStep={4} totalSteps={12} scrollable={false}>
        <View style={styles.content}>
          <Animated.View
            style={{ opacity: anims[0].opacity, transform: anims[0].transform }}
          >
            <Text style={styles.headline}>Scan Your Face</Text>
            <Text style={styles.stepIndicator}>
              Step 1 of 2 — Front facing
            </Text>
          </Animated.View>

          {/* Fake camera frame */}
          <Animated.View
            style={[
              styles.frameContainer,
              { opacity: anims[1].opacity, transform: anims[1].transform },
            ]}
          >
            <View style={styles.frame}>
              <View style={styles.fakeCameraView}>
                {/* Dark surface simulating an inactive camera */}
                <LinearGradient
                  colors={['#0A0A0F', '#111118', '#0A0A0F']}
                  style={StyleSheet.absoluteFill}
                />
                {/* Scan overlay on top for the effect */}
                <FaceScanOverlay animated />
                {/* Silhouette hint */}
                <View style={styles.silhouetteContainer}>
                  <View style={styles.silhouetteHead} />
                  <View style={styles.silhouetteNeck} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Permission ask */}
          <Animated.View
            style={[
              styles.permissionAskContainer,
              { opacity: anims[2].opacity, transform: anims[2].transform },
            ]}
          >
            <Text style={styles.permissionTitle}>Allow camera access</Text>
            <Text style={styles.permissionBody}>
              We need your camera to scan your face and create your personalized protocol
            </Text>
            <GradientButton title="Allow Camera" onPress={handleRequestPermission} />
            <View style={styles.buttonSpacer} />
            <GradientButton title="Upload Photo Instead" onPress={handleUploadPhoto} variant="secondary" />
          </Animated.View>
        </View>
      </V2ScreenWrapper>
    );
  }

  const isFront = photoStep === 'front';

  return (
    <V2ScreenWrapper showProgress currentStep={4} totalSteps={12} scrollable={false}>
      <View style={styles.content}>
        {/* Headline */}
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
          }}
        >
          <Text style={styles.headline}>
            {isFront ? 'Scan Your Face' : 'Side Profile'}
          </Text>
          <Text style={styles.stepIndicator}>
            {isFront ? 'Step 1 of 2 — Front facing' : 'Step 2 of 2 — Turn your head to the side'}
          </Text>
        </Animated.View>

        {/* Camera / Preview Frame */}
        <Animated.View
          style={[
            styles.frameContainer,
            {
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            },
          ]}
        >
          <View style={styles.frame}>
            {currentUri ? (
              <Image source={{ uri: currentUri }} style={styles.previewImage} />
            ) : (
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                mode="picture"
              />
            )}
            {isFront && !currentUri && (
              <FaceScanOverlay animated />
            )}
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View
          style={[
            styles.buttonsContainer,
            {
              opacity: anims[2].opacity,
              transform: anims[2].transform,
            },
          ]}
        >
          {currentUri ? (
            <>
              <GradientButton
                title={isFront ? 'Continue to Side Photo' : 'Continue'}
                onPress={handleContinue}
              />
              <View style={styles.buttonSpacer} />
              <GradientButton
                title="Retake"
                onPress={handleRetake}
                variant="secondary"
              />
            </>
          ) : (
            <>
              <GradientButton
                title={isCapturing ? 'Capturing...' : 'Take Photo'}
                onPress={handleCapture}
                disabled={isCapturing}
              />
              <View style={styles.buttonSpacer} />
              <GradientButton
                title="Upload Photo"
                onPress={handleUploadPhoto}
                variant="secondary"
              />
              {!isFront && (
                <>
                  <View style={styles.buttonSpacer} />
                  <GradientButton
                    title="Skip"
                    onPress={handleSkipSide}
                    variant="secondary"
                  />
                </>
              )}
            </>
          )}
        </Animated.View>

        {/* Tips */}
        <Animated.View
          style={[
            styles.tipsContainer,
            {
              opacity: anims[3].opacity,
              transform: anims[3].transform,
            },
          ]}
        >
          <Text style={styles.tipsText}>
            {isFront
              ? 'Good lighting, face the camera directly'
              : 'Turn your head 90° to the side, keep face relaxed'}
          </Text>
        </Animated.View>
      </View>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.xs,
  },
  stepIndicator: {
    ...typographyV2.bodySmall,
    color: colorsV2.accentOrange,
    textAlign: 'center',
    marginBottom: spacingV2.lg,
  },
  frameContainer: {
    alignItems: 'center',
    marginBottom: spacingV2.lg,
    flex: 1,
    maxHeight: FRAME_HEIGHT + 20,
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fakeCameraView: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouetteContainer: {
    alignItems: 'center',
    opacity: 0.15,
  },
  silhouetteHead: {
    width: 90,
    height: 110,
    borderRadius: 45,
    backgroundColor: colorsV2.textMuted,
  },
  silhouetteNeck: {
    width: 50,
    height: 30,
    backgroundColor: colorsV2.textMuted,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -5,
  },
  camera: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  previewImage: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    resizeMode: 'cover',
  },
  // Permission ask below fake camera
  permissionAskContainer: {
    paddingHorizontal: spacingV2.sm,
  },
  permissionTitle: {
    ...typographyV2.heading,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  permissionBody: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
    paddingHorizontal: spacingV2.md,
  },
  buttonsContainer: {
    marginBottom: spacingV2.md,
  },
  buttonSpacer: {
    height: spacingV2.sm,
  },
  tipsContainer: {
    alignItems: 'center',
    marginBottom: spacingV2.md,
  },
  tipsText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    textAlign: 'center',
  },
});

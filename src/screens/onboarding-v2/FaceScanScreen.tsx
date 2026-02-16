import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import GradientButton from '../../components/v2/GradientButton';
import FaceScanOverlay from '../../components/v2/FaceScanOverlay';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import {
  colorsV2,
  typographyV2,
  spacingV2,
  borderRadiusV2,
} from '../../constants/themeV2';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_WIDTH = (SCREEN_WIDTH - spacingV2.lg * 2 - spacingV2.md) / 2;
const IMAGE_HEIGHT = IMAGE_WIDTH * 1.3;

const TRIPLE_TAP_DELAY = 500;

export default function FaceScanScreen({ navigation }: any) {
  useOnboardingTracking('v2_face_scan');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(4);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const imageFade = useRef(new Animated.Value(0)).current;
  const [fullscreen, setFullscreen] = useState(false);

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTripleTap = useCallback(() => {
    tapCountRef.current += 1;

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setFullscreen(prev => !prev);
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, TRIPLE_TAP_DELAY);
    }
  }, []);

  const handleImageLoad = () => {
    setImagesLoaded(prev => {
      const next = prev + 1;
      if (next >= 2) {
        Animated.timing(imageFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      }
      return next;
    });
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2GetRating');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={1} totalSteps={14} scrollable={false}>
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Animated.View
            style={{
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            }}
          >
            <Text style={styles.headline}>AI Face Analysis</Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            }}
          >
            <Text style={styles.subheadline}>
              We scan your face from multiple angles for the most accurate analysis
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.imagesRow,
            {
              opacity: Animated.multiply(anims[2].opacity, imageFade),
              transform: anims[2].transform,
            },
          ]}
        >
          {/* Front face */}
          <TouchableWithoutFeedback onPress={handleTripleTap}>
            <View style={styles.imageCard}>
              <View style={styles.imageWrapper}>
                <Image
                  source={require('../../../assets/images/hero.png')}
                  style={styles.faceImage}
                  resizeMode="cover"
                  onLoad={handleImageLoad}
                />
                <FaceScanOverlay animated />
              </View>
              <Text style={styles.imageLabel}>Front</Text>
            </View>
          </TouchableWithoutFeedback>

          {/* Side face */}
          <View style={styles.imageCard}>
            <View style={styles.imageWrapper}>
              <Image
                source={require('../../../assets/images/side.png')}
                style={styles.faceImage}
                resizeMode="cover"
                onLoad={handleImageLoad}
              />
              <FaceScanOverlay animated />
            </View>
            <Text style={styles.imageLabel}>Side</Text>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View
          style={{
            opacity: anims[3].opacity,
            transform: anims[3].transform,
          }}
        >
          <GradientButton title="Continue" onPress={handleContinue} />
        </Animated.View>
      </View>

      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={handleTripleTap}>
          <View style={styles.fullscreenContainer}>
            <Image
              source={require('../../../assets/images/hero.png')}
              style={styles.fullscreenImage}
              resizeMode="cover"
            />
            <FaceScanOverlay animated />
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  topSection: {
    alignItems: 'center',
    marginTop: spacingV2.xl,
    marginBottom: spacingV2.xl,
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  subheadline: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacingV2.md,
  },
  imagesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacingV2.md,
  },
  imageCard: {
    alignItems: 'center',
  },
  imageWrapper: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: borderRadiusV2.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colorsV2.border,
  },
  faceImage: {
    width: '100%',
    height: '100%',
  },
  imageLabel: {
    ...typographyV2.label,
    color: colorsV2.textMuted,
    marginTop: spacingV2.sm,
  },
  spacer: {
    flex: 1,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

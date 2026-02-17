import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const collageSource = require('../../../assets/images/collage.png');

export default function AspirationScreen({ navigation }: any) {
  useOnboardingTracking('v2_aspiration');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(3);
  const imageFade = useRef(new Animated.Value(0)).current;
  const [imageHeight, setImageHeight] = useState(0);

  useEffect(() => {
    const asset = Image.resolveAssetSource(collageSource);
    if (asset?.width && asset?.height) {
      setImageHeight(SCREEN_WIDTH * (asset.height / asset.width));
    }
  }, []);

  const handleImageLoad = () => {
    Animated.timing(imageFade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2FaceScan');
  };

  return (
    <View style={styles.container}>
      {/* Collage image pinned to bottom, full width */}
      {imageHeight > 0 && (
        <Animated.View style={[styles.imageContainer, { opacity: imageFade }]}>
          <Image
            source={collageSource}
            style={[styles.collageImage, { height: imageHeight }]}
            resizeMode="cover"
            onLoad={handleImageLoad}
          />
        </Animated.View>
      )}

      {/* Top fade gradient over image */}
      <LinearGradient
        colors={[colorsV2.background, colorsV2.background, 'transparent']}
        locations={[0, 0.45, 1]}
        style={styles.topFade}
      />

      {/* Bottom fade gradient with theme accent */}
      <LinearGradient
        colors={['transparent', 'rgba(168, 85, 247, 0.15)', 'rgba(168, 85, 247, 0.3)']}
        locations={[0, 0.5, 1]}
        style={styles.bottomFade}
      />

      {/* Content overlay */}
      <View style={styles.content}>
        <View style={styles.textSection}>
          <Animated.View
            style={{
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            }}
          >
            <Text style={styles.headline}>
              Level up with{'\n'}
              <Text style={styles.headlineAccent}>Protocol</Text>
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            }}
          >
            <Text style={styles.subheadline}>
              Take a selfie, and get a personal protocol to become more attractive
            </Text>
          </Animated.View>
        </View>

        <View style={styles.spacer} />

        <Animated.View
          style={[
            styles.buttonContainer,
            {
              paddingBottom: insets.bottom + spacingV2.md,
              opacity: anims[2].opacity,
              transform: anims[2].transform,
            },
          ]}
        >
          <GradientButton title="Continue" onPress={handleContinue} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },
  imageContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  collageImage: {
    width: SCREEN_WIDTH,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    zIndex: 1,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacingV2.lg,
    zIndex: 2,
  },
  textSection: {
    marginTop: spacingV2.xxl * 3,
  },
  headline: {
    ...typographyV2.display,
    textAlign: 'center',
    marginBottom: spacingV2.md,
  },
  headlineAccent: {
    color: colorsV2.accentPurple,
    textShadowColor: '#7C3AED',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  subheadline: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacingV2.md,
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    paddingBottom: spacingV2.xl,
  },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { initTikTok } from '../../services/tiktok';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import { colorsV2, typographyV2, spacingV2, shadows } from '../../constants/themeV2';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HeroScreen({ navigation }: any) {
  useOnboardingTracking('v2_hero');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(3);
  const videoRef = useRef<Video>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoFade = useRef(new Animated.Value(0)).current;

  // Request ATT early on mount, then initialize TikTok SDK (iOS only)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      (async () => {
        try {
          const { status } = await requestTrackingPermissionsAsync();
          console.log('[HeroScreen] ATT status:', status);
          // Initialize TikTok SDK after ATT so it can capture IDFA if granted
          await initTikTok();
        } catch (err) {
          console.warn('[HeroScreen] ATT/TikTok init error:', err);
        }
      })();
    }
  }, []);

  const handleVideoStatus = (status: AVPlaybackStatus) => {
    if (status.isLoaded && !videoReady) {
      setVideoReady(true);
      Animated.timing(videoFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2Aspiration');
  };

  return (
    <View style={styles.container}>
      {/* Hero video */}
      <Animated.View style={[styles.videoContainer, { opacity: videoFade }]}>
        <Video
          ref={videoRef}
          source={require('../../../assets/images/smiles video.mp4')}
          style={styles.heroVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onPlaybackStatusUpdate={handleVideoStatus}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)', '#000000']}
          style={styles.videoGradient}
          locations={[0.4, 0.7, 1]}
        />
      </Animated.View>

      {/* Content overlay */}
      <View style={[styles.content, { paddingBottom: insets.bottom + spacingV2.lg }]}>
        <View style={styles.textContainer}>
          <Animated.View
            style={{
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            }}
          >
            <Text style={styles.headline}>
              <Text style={styles.headlineGlow}>Unlock</Text> Your{'\n'}Full Potential
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            }}
          >
            <Text style={styles.subheadline}>
              AI-powered facial analysis. Personalized improvement plan.
            </Text>
          </Animated.View>
        </View>

        <View style={styles.bottomContainer}>
          <Animated.View
            style={{
              opacity: anims[2].opacity,
              transform: anims[2].transform,
            }}
          >
            <GradientButton
              title="Get Started"
              onPress={handleGetStarted}
            />
          </Animated.View>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroVideo: {
    width: '100%',
    height: '100%',
  },
  videoGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacingV2.lg,
  },
  textContainer: {
    marginBottom: spacingV2.xl,
  },
  headline: {
    ...typographyV2.display,
    textAlign: 'center',
    marginBottom: spacingV2.md,
  },
  headlineGlow: {
    color: colorsV2.accentPurple,
    textShadowColor: '#7C3AED',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  subheadline: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacingV2.lg,
  },
  bottomContainer: {
    paddingBottom: spacingV2.md,
  },
});

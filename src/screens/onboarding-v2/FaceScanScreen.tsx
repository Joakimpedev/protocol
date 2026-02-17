import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  Easing,
  ScrollView,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import V2ProgressBar from '../../components/v2/V2ProgressBar';
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

const RATINGS = [
  { label: 'Overall', score: 7.8, color: colorsV2.success },
  { label: 'Jawline', score: 6.2, color: colorsV2.warning },
  { label: 'Symmetry', score: 8.1, color: colorsV2.success },
  { label: 'Skin', score: 5.9, color: colorsV2.warning },
  { label: 'Cheekbones', score: 7.4, color: colorsV2.success },
];

export default function FaceScanScreen({ navigation }: any) {
  useOnboardingTracking('v2_face_scan');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(5);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const imageFade = useRef(new Animated.Value(0)).current;
  const [fullscreen, setFullscreen] = useState(false);

  const barAnims = useRef(RATINGS.map(() => new Animated.Value(0))).current;
  const overallAnim = useRef(new Animated.Value(0)).current;
  const [displayOverall, setDisplayOverall] = useState('0.0');

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener = overallAnim.addListener(({ value }) => {
      setDisplayOverall(value.toFixed(1));
    });

    Animated.timing(overallAnim, {
      toValue: 7.8,
      duration: 1200,
      delay: 600,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    Animated.stagger(
      120,
      barAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: RATINGS[i].score / 10,
          duration: 800,
          delay: 700,
          useNativeDriver: false,
          easing: Easing.out(Easing.cubic),
        })
      )
    ).start();

    return () => {
      overallAnim.removeListener(listener);
    };
  }, []);

  const handleTripleTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

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
    navigation.navigate('V2PersonalizedRoutine');
  };

  const progressBarHeight = insets.top + 24;

  return (
    <View style={styles.container}>
      <V2ProgressBar currentStep={3} totalSteps={14} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: progressBarHeight + spacingV2.lg, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <Animated.View style={{ opacity: anims[0].opacity, transform: anims[0].transform }}>
            <Text style={styles.headline}>AI Face Analysis</Text>
          </Animated.View>
          <Animated.View style={{ opacity: anims[1].opacity, transform: anims[1].transform }}>
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

        {/* Rating card */}
        <Animated.View
          style={[
            styles.ratingCard,
            { opacity: anims[3].opacity, transform: anims[3].transform },
          ]}
        >
          <View style={styles.overallSection}>
            <View style={styles.overallRow}>
              <Text style={styles.overallScore}>{displayOverall}</Text>
              <Text style={styles.overallMax}>/10</Text>
            </View>
            <Text style={styles.overallLabel}>Overall Rating</Text>
          </View>

          <View style={styles.divider} />

          {RATINGS.map((r, i) => {
            const width = barAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            });
            return (
              <View key={r.label} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{r.label}</Text>
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[styles.barFill, { width, backgroundColor: r.color }]}
                  />
                </View>
                <Text style={[styles.ratingScore, { color: r.color }]}>{r.score}</Text>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={[styles.fixedBottom, { paddingBottom: insets.bottom + spacingV2.sm }]}>
        <LinearGradient
          colors={['transparent', colorsV2.background]}
          locations={[0, 0.35]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={{ opacity: anims[4].opacity, transform: anims[4].transform }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacingV2.lg,
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
  ratingCard: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.lg,
    marginTop: spacingV2.xl,
  },
  overallSection: {
    alignItems: 'center',
    marginBottom: spacingV2.md,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  overallScore: {
    fontSize: 48,
    fontWeight: '800',
    color: colorsV2.accentOrange,
    fontVariant: ['tabular-nums'],
  },
  overallMax: {
    fontSize: 20,
    fontWeight: '600',
    color: colorsV2.textMuted,
    marginLeft: spacingV2.xs,
  },
  overallLabel: {
    ...typographyV2.bodySmall,
    color: colorsV2.textMuted,
    marginTop: spacingV2.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colorsV2.border,
    marginBottom: spacingV2.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingLabel: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    fontWeight: '600',
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: spacingV2.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingScore: {
    ...typographyV2.bodySmall,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacingV2.lg,
    paddingTop: spacingV2.lg,
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

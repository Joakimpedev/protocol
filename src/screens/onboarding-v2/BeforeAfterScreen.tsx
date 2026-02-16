import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - spacingV2.lg * 2 - 16) / 2;

const BEFORE_CONS = [
  'No skincare routine',
  'Poor grooming habits',
  'Low confidence',
];

const AFTER_PROS = [
  'Optimized daily routine',
  'Sharp, defined features',
  'Real, visible confidence',
];

export default function BeforeAfterScreen({ navigation }: any) {
  useOnboardingTracking('v2_before_after');
  const anims = useScreenEntrance(4, 80, 50);

  const beforeItemAnims = useRef(BEFORE_CONS.map(() => new Animated.Value(0))).current;
  const afterItemAnims = useRef(AFTER_PROS.map(() => new Animated.Value(0))).current;

  const beforeSlide = useRef(new Animated.Value(-30)).current;
  const afterSlide = useRef(new Animated.Value(30)).current;
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const imagesLoadedRef = useRef(0);
  const [imagesReady, setImagesReady] = useState(false);

  // After photo glow pulse
  const afterGlow = useRef(new Animated.Value(0.3)).current;

  const handleImageLoad = () => {
    imagesLoadedRef.current += 1;
    if (imagesLoadedRef.current >= 2) {
      setImagesReady(true);
    }
  };

  useEffect(() => {
    if (!imagesReady) return;

    // Photos slide in once both images are decoded
    Animated.parallel([
      Animated.timing(photoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(beforeSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(afterSlide, {
        toValue: 0,
        delay: 50,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
    ]).start();

    // Stagger before items — faster
    Animated.stagger(
      100,
      beforeItemAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      )
    ).start();

    // Stagger after items — faster
    Animated.stagger(
      100,
      afterItemAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: 450,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      )
    ).start();

    // After photo glow pulse
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(afterGlow, { toValue: 0.7, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(afterGlow, { toValue: 0.3, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [imagesReady]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2TransformationStory');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={9} totalSteps={12}>
      <View style={styles.content}>
        {/* Headline — bigger, bolder */}
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
          }}
        >
          <Text style={styles.headline}>The Difference{'\n'}Is Real</Text>
          <Text style={styles.subheadline}>See what a structured routine can do</Text>
        </Animated.View>

        {/* Photos side-by-side */}
        <View style={styles.photosRow}>
          {/* Before */}
          <Animated.View
            style={[
              styles.photoContainer,
              {
                opacity: photoOpacity,
                transform: [{ translateX: beforeSlide }],
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/before1.png')}
              style={styles.photo}
              resizeMode="cover"
              onLoad={handleImageLoad}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.photoGradient}
            />
            <View style={[styles.photoBadge, styles.beforeBadge]}>
              <Text style={styles.photoBadgeText}>BEFORE</Text>
            </View>
          </Animated.View>

          {/* After — with glow border */}
          <Animated.View
            style={[
              styles.photoContainerOuter,
              {
                opacity: photoOpacity,
                transform: [{ translateX: afterSlide }],
              },
            ]}
          >
            {/* Glow behind after photo */}
            <Animated.View style={[styles.afterGlowBorder, { opacity: afterGlow }]}>
              <LinearGradient
                colors={[colorsV2.accentOrange + '50', colorsV2.success + '50']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.afterGlowGradient}
              />
            </Animated.View>
            <View style={styles.photoContainerInner}>
              <Image
                source={require('../../../assets/images/after.png')}
                style={styles.photo}
                resizeMode="cover"
                onLoad={handleImageLoad}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={styles.photoGradient}
              />
              <View style={[styles.photoBadge, styles.afterBadge]}>
                <Text style={styles.photoBadgeText}>AFTER</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Pros and Cons side by side */}
        <View style={styles.prosConsRow}>
          {/* Before / Cons column */}
          <View style={styles.prosConsColumn}>
            <Text style={styles.columnHeader}>Without Protocol</Text>
            {BEFORE_CONS.map((item, i) => (
              <Animated.View
                key={`con-${i}`}
                style={[
                  styles.prosConsItem,
                  {
                    opacity: beforeItemAnims[i],
                    transform: [
                      {
                        translateY: beforeItemAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.iconCircle, styles.conCircle]}>
                  <Text style={styles.conIconText}>✕</Text>
                </View>
                <Text style={styles.prosConsText}>{item}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* After / Pros column */}
          <View style={styles.prosConsColumn}>
            <Text style={styles.columnHeader}>With Protocol</Text>
            {AFTER_PROS.map((item, i) => (
              <Animated.View
                key={`pro-${i}`}
                style={[
                  styles.prosConsItem,
                  {
                    opacity: afterItemAnims[i],
                    transform: [
                      {
                        translateY: afterItemAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.iconCircle, styles.proCircle]}>
                  <Text style={[styles.proIconText]}>✓</Text>
                </View>
                <Text style={[styles.prosConsText, styles.proText]}>{item}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

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
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  headline: {
    ...typographyV2.display,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  subheadline: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
  },
  // Photos
  photosRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: spacingV2.lg,
  },
  photoContainer: {
    flex: 1,
    height: PHOTO_SIZE * 1.35,
    borderRadius: borderRadiusV2.xl,
    overflow: 'hidden',
    backgroundColor: colorsV2.surface,
  },
  photoContainerOuter: {
    flex: 1,
    overflow: 'visible',
  },
  photoContainerInner: {
    flex: 1,
    height: PHOTO_SIZE * 1.35,
    borderRadius: borderRadiusV2.xl,
    overflow: 'hidden',
    backgroundColor: colorsV2.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borderRadiusV2.pill,
  },
  beforeBadge: {
    backgroundColor: colorsV2.danger + '30',
    borderWidth: 1,
    borderColor: colorsV2.danger + '50',
  },
  afterBadge: {
    backgroundColor: colorsV2.success + '35',
    borderWidth: 1,
    borderColor: colorsV2.success + '60',
    shadowColor: colorsV2.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  photoBadgeText: {
    ...typographyV2.label,
    color: colorsV2.textPrimary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  // Glow around after photo
  afterGlowBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: borderRadiusV2.xl + 3,
    overflow: 'hidden',
  },
  afterGlowGradient: {
    flex: 1,
    borderRadius: borderRadiusV2.xl + 3,
  },
  // Pros & Cons
  prosConsRow: {
    flexDirection: 'row',
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.lg,
  },
  prosConsColumn: {
    flex: 1,
  },
  columnHeader: {
    ...typographyV2.label,
    color: colorsV2.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: spacingV2.md,
  },
  divider: {
    width: 1,
    backgroundColor: colorsV2.border,
    marginHorizontal: spacingV2.md,
  },
  prosConsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  conCircle: {
    backgroundColor: colorsV2.danger + '20',
  },
  proCircle: {
    backgroundColor: colorsV2.success + '20',
  },
  conIconText: {
    fontSize: 10,
    fontWeight: '800',
    color: colorsV2.danger,
  },
  proIconText: {
    fontSize: 10,
    fontWeight: '800',
    color: colorsV2.success,
  },
  prosConsText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  proText: {
    color: colorsV2.textPrimary,
  },
  spacer: {
    flex: 1,
    minHeight: spacingV2.md,
  },
});

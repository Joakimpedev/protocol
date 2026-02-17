import React, { useRef, useState, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  colorsV2,
  typographyV2,
  spacingV2,
  borderRadiusV2,
} from '../../constants/themeV2';
import { loadSelfiePhotos } from '../../services/faceAnalysisService';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DUAL_PHOTO_WIDTH = (SCREEN_WIDTH - spacingV2.lg * 2 - spacingV2.md) / 2;
const DUAL_PHOTO_HEIGHT = DUAL_PHOTO_WIDTH * 1.35;
const SOLO_PHOTO_WIDTH = SCREEN_WIDTH * 0.55;
const SOLO_PHOTO_HEIGHT = SOLO_PHOTO_WIDTH * 1.35;

const SCAN_DURATION_MS = 3000;

const STATUS_MESSAGES = [
  'Mapping facial landmarks...',
  'Analyzing bone structure...',
  'Evaluating symmetry...',
  'Measuring proportions...',
  'Assessing skin quality...',
  'Generating your scores...',
];

export default function FakeAnalysisScreen({ navigation }: any) {
  useOnboardingTracking('v2_fake_analysis');
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<{ frontUri: string; sideUri: string | null } | null>(null);
  const [statusText, setStatusText] = useState(STATUS_MESSAGES[0]);

  // Animations
  const scanLineY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotOpacities = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;
  const lineOpacities = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;

  // Load photos and start timer
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    (async () => {
      const saved = await loadSelfiePhotos();
      if (saved) setPhotos(saved);
    })();

    // Auto-navigate after scan duration
    const timer = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('V2ResultsPaywall');
    }, SCAN_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  // Run all animations
  useEffect(() => {
    if (!photos) return;

    // Scan line sweeping
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    scanLoop.start();

    // Glow pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    pulseLoop.start();

    // Dots
    const dotAnims = dotOpacities.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        ])
      )
    );
    dotAnims.forEach(a => a.start());

    // Connection lines
    const lineAnims = lineOpacities.map((line, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 500),
          Animated.timing(line, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(line, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      )
    );
    lineAnims.forEach(a => a.start());

    // Status text fade in
    Animated.timing(statusOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Progress bar fill over the scan duration
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SCAN_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Cycle status messages
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % STATUS_MESSAGES.length;
      setStatusText(STATUS_MESSAGES[idx]);
    }, 500);

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
      dotAnims.forEach(a => a.stop());
      lineAnims.forEach(a => a.stop());
      clearInterval(interval);
    };
  }, [photos]);

  const hasSide = photos?.sideUri != null;
  const photoHeight = hasSide ? DUAL_PHOTO_HEIGHT : SOLO_PHOTO_HEIGHT;
  const photoWidth = hasSide ? DUAL_PHOTO_WIDTH : SOLO_PHOTO_WIDTH;

  const scanTranslateY = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, photoHeight - 4],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const dotPositions = [
    { top: '20%', left: '30%' }, { top: '35%', left: '65%' },
    { top: '50%', left: '25%' }, { top: '65%', left: '70%' },
    { top: '25%', left: '55%' }, { top: '45%', left: '40%' },
    { top: '70%', left: '35%' }, { top: '55%', left: '60%' },
  ];

  const lineConfigs = [
    { top: '28%', left: '20%', width: 60, rotate: '25deg' },
    { top: '45%', left: '40%', width: 45, rotate: '-15deg' },
    { top: '60%', left: '25%', width: 55, rotate: '10deg' },
    { top: '35%', left: '50%', width: 40, rotate: '-30deg' },
  ];

  if (!photos) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Analyzing Your Face</Text>

      <View style={[styles.photosRow, !hasSide && styles.photosRowCentered]}>
        {/* Front photo */}
        <View style={styles.photoWrapper}>
          <Animated.View style={[styles.glowBorder, { opacity: pulse }]}>
            <LinearGradient
              colors={[colorsV2.accentOrange + '60', colorsV2.accentPurple + '60']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glowGradient}
            />
          </Animated.View>
          <View style={[styles.photoFrame, { width: photoWidth, height: photoHeight }]}>
            <Image source={{ uri: photos.frontUri }} style={{ width: photoWidth, height: photoHeight, resizeMode: 'cover' }} />
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanTranslateY }] },
              ]}
            >
              <LinearGradient
                colors={['transparent', colorsV2.accentCyan + '80', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanLineGradient}
              />
            </Animated.View>
            {dotPositions.slice(0, hasSide ? 4 : 8).map((pos, i) => (
              <Animated.View
                key={`fd${i}`}
                style={[
                  styles.dot,
                  { top: pos.top as any, left: pos.left as any, opacity: dotOpacities[i] },
                ]}
              />
            ))}
            {lineConfigs.slice(0, hasSide ? 2 : 4).map((cfg, i) => (
              <Animated.View
                key={`fl${i}`}
                style={[
                  styles.connectionLine,
                  {
                    top: cfg.top as any,
                    left: cfg.left as any,
                    width: cfg.width,
                    transform: [{ rotate: cfg.rotate }],
                    opacity: lineOpacities[i],
                  },
                ]}
              />
            ))}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.photoLabel}>Front</Text>
        </View>

        {/* Side photo — only if captured */}
        {hasSide && (
          <View style={styles.photoWrapper}>
            <Animated.View style={[styles.glowBorder, { opacity: pulse }]}>
              <LinearGradient
                colors={[colorsV2.accentPurple + '60', colorsV2.accentCyan + '60']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.glowGradient}
              />
            </Animated.View>
            <View style={[styles.photoFrame, { width: photoWidth, height: photoHeight }]}>
              <Image source={{ uri: photos.sideUri! }} style={{ width: photoWidth, height: photoHeight, resizeMode: 'cover' }} />
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanTranslateY }] },
                ]}
              >
                <LinearGradient
                  colors={['transparent', colorsV2.accentOrange + '80', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scanLineGradient}
                />
              </Animated.View>
              {dotPositions.slice(4).map((pos, i) => (
                <Animated.View
                  key={`sd${i}`}
                  style={[
                    styles.dot,
                    { top: pos.top as any, left: pos.left as any, opacity: dotOpacities[i + 4] },
                  ]}
                />
              ))}
              {lineConfigs.slice(2).map((cfg, i) => (
                <Animated.View
                  key={`sl${i}`}
                  style={[
                    styles.connectionLine,
                    {
                      top: cfg.top as any,
                      left: cfg.left as any,
                      width: cfg.width,
                      transform: [{ rotate: cfg.rotate }],
                      opacity: lineOpacities[i + 2],
                    },
                  ]}
                />
              ))}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.photoLabel}>Side</Text>
          </View>
        )}
      </View>

      {/* Status text */}
      <Animated.View style={[styles.statusContainer, { opacity: statusOpacity }]}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{statusText}</Text>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
          <LinearGradient
            colors={[colorsV2.accentOrange, colorsV2.accentPurple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacingV2.lg,
  },
  loadingText: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
  },
  title: {
    ...typographyV2.heading,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
  },
  photosRow: {
    flexDirection: 'row',
    gap: spacingV2.md,
  },
  photosRowCentered: {
    justifyContent: 'center',
  },
  photoWrapper: {
    alignItems: 'center',
  },
  glowBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: borderRadiusV2.xl + 3,
    overflow: 'hidden',
  },
  glowGradient: {
    flex: 1,
    borderRadius: borderRadiusV2.xl + 3,
  },
  photoFrame: {
    borderRadius: borderRadiusV2.xl,
    overflow: 'hidden',
    backgroundColor: colorsV2.surface,
  },
  photoLabel: {
    ...typographyV2.label,
    color: colorsV2.textMuted,
    marginTop: spacingV2.sm,
    letterSpacing: 1,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
  },
  scanLineGradient: {
    flex: 1,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colorsV2.accentCyan,
    shadowColor: colorsV2.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  connectionLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: colorsV2.accentCyan + '60',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colorsV2.accentCyan + '80',
  },
  cornerTL: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingV2.xl,
    gap: spacingV2.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorsV2.accentCyan,
    shadowColor: colorsV2.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  statusText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
  },
  progressTrack: {
    width: '80%',
    height: 4,
    backgroundColor: colorsV2.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacingV2.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
});

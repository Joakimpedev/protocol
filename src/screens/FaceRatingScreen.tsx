import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  ScrollView,
  Easing,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, collection, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { LinearGradient } from 'expo-linear-gradient';
import GradientButton from '../components/v2/GradientButton';
import {
  loadSelfiePhotos,
  analyzeFace,
  FaceAnalysisResult,
} from '../services/faceAnalysisService';
import { useOnboardingTracking } from '../hooks/useOnboardingTracking';
import { useDevMode } from '../contexts/DevModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BREAKDOWN_CATEGORIES: { key: keyof FaceAnalysisResult; label: string; improvability: number }[] = [
  { key: 'jawline', label: 'Jawline', improvability: 1.2 },
  { key: 'symmetry', label: 'Symmetry', improvability: 0.1 },
  { key: 'skin_quality', label: 'Skin', improvability: 1.5 },
  { key: 'cheekbones', label: 'Cheekbones', improvability: 0.2 },
  { key: 'eye_area', label: 'Eyes', improvability: 0.3 },
  { key: 'hair', label: 'Hair', improvability: 1.0 },
  { key: 'masculinity', label: 'Masculinity', improvability: 0.4 },
];

/** Per-category potential: score + improvable room capped at 9.5 */
function getCategoryPotential(score: number, improvability: number): number {
  const room = Math.max(0, 9.0 - score);
  const gain = room * improvability * 0.45;
  return Math.min(9.5, score + Math.max(0.3, gain));
}

function getScoreColor(score: number): string {
  if (score >= 7.5) return '#4ADE80';   // Bright green
  if (score >= 5.5) return '#C084FC';   // Bright violet-400
  return '#F87171';                      // Bright red
}

// ─── Scanning Animation Component ────────────────────────────────────────────

function ScanningView({ photos, theme }: { photos: { frontUri: string; sideUri: string | null }; theme: Theme }) {
  const scanStyles = useMemo(() => getScanStyles(theme), [theme]);
  const hasSide = photos.sideUri != null;
  const PHOTO_WIDTH = hasSide
    ? (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.md) / 2
    : SCREEN_WIDTH * 0.55;
  const PHOTO_HEIGHT = PHOTO_WIDTH * 1.35;

  const scanLineY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;
  const dotOpacities = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;
  const lineOpacities = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const [statusText, setStatusText] = useState('Mapping facial landmarks...');

  useEffect(() => {
    // Scan line sweeping up and down
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

    // Pulsing glow on photos
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    pulseLoop.start();

    // Staggered dots appearing
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

    // Connection lines fading in/out
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

    // Cycle status messages
    const messages = [
      'Mapping facial landmarks...',
      'Analyzing bone structure...',
      'Evaluating symmetry...',
      'Measuring proportions...',
      'Assessing skin quality...',
      'Generating your scores...',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setStatusText(messages[idx]);
    }, 2500);

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
      dotAnims.forEach(a => a.stop());
      lineAnims.forEach(a => a.stop());
      clearInterval(interval);
    };
  }, []);

  const scanTranslateY = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PHOTO_HEIGHT - 4],
  });

  // Dot positions scattered on the photos
  const dotPositions = [
    { top: '20%', left: '30%' }, { top: '35%', left: '65%' },
    { top: '50%', left: '25%' }, { top: '65%', left: '70%' },
    { top: '25%', left: '55%' }, { top: '45%', left: '40%' },
    { top: '70%', left: '35%' }, { top: '55%', left: '60%' },
  ];

  // Connection line positions
  const lineConfigs = [
    { top: '28%', left: '20%', width: 60, rotate: '25deg' },
    { top: '45%', left: '40%', width: 45, rotate: '-15deg' },
    { top: '60%', left: '25%', width: 55, rotate: '10deg' },
    { top: '35%', left: '50%', width: 40, rotate: '-30deg' },
  ];

  return (
    <View style={scanStyles.container}>
      <Text style={scanStyles.title}>Analyzing Your Face</Text>

      <View style={[scanStyles.photosRow, !hasSide && scanStyles.photosRowCentered]}>
        {/* Front photo */}
        <View style={scanStyles.photoWrapper}>
          <Animated.View style={[scanStyles.glowBorder, { opacity: pulse }]}>
            <LinearGradient
              colors={[theme.colors.accent + '60', theme.colors.accentSecondary + '60']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={scanStyles.glowGradient}
            />
          </Animated.View>
          <View style={[scanStyles.photoFrame, { width: PHOTO_WIDTH, height: PHOTO_HEIGHT }]}>
            <Image source={{ uri: photos.frontUri }} style={{ width: PHOTO_WIDTH, height: PHOTO_HEIGHT, resizeMode: 'cover' }} />
            <Animated.View
              style={[
                scanStyles.scanLine,
                { transform: [{ translateY: scanTranslateY }] },
              ]}
            >
              <LinearGradient
                colors={['transparent', theme.colors.accentCyan + '80', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={scanStyles.scanLineGradient}
              />
            </Animated.View>
            {dotPositions.slice(0, hasSide ? 4 : 8).map((pos, i) => (
              <Animated.View
                key={`fd${i}`}
                style={[
                  scanStyles.dot,
                  { top: pos.top as any, left: pos.left as any, opacity: dotOpacities[i] },
                ]}
              />
            ))}
            {lineConfigs.slice(0, hasSide ? 2 : 4).map((cfg, i) => (
              <Animated.View
                key={`fl${i}`}
                style={[
                  scanStyles.connectionLine,
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
            <View style={[scanStyles.corner, scanStyles.cornerTL]} />
            <View style={[scanStyles.corner, scanStyles.cornerTR]} />
            <View style={[scanStyles.corner, scanStyles.cornerBL]} />
            <View style={[scanStyles.corner, scanStyles.cornerBR]} />
          </View>
          <Text style={scanStyles.photoLabel}>Front</Text>
        </View>

        {/* Side photo — only if captured */}
        {hasSide && (
          <View style={scanStyles.photoWrapper}>
            <Animated.View style={[scanStyles.glowBorder, { opacity: pulse }]}>
              <LinearGradient
                colors={[theme.colors.accentSecondary + '60', theme.colors.accentCyan + '60']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={scanStyles.glowGradient}
              />
            </Animated.View>
            <View style={[scanStyles.photoFrame, { width: PHOTO_WIDTH, height: PHOTO_HEIGHT }]}>
              <Image source={{ uri: photos.sideUri! }} style={{ width: PHOTO_WIDTH, height: PHOTO_HEIGHT, resizeMode: 'cover' }} />
              <Animated.View
                style={[
                  scanStyles.scanLine,
                  { transform: [{ translateY: scanTranslateY }] },
                ]}
              >
                <LinearGradient
                  colors={['transparent', theme.colors.accent + '80', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={scanStyles.scanLineGradient}
                />
              </Animated.View>
              {dotPositions.slice(4).map((pos, i) => (
                <Animated.View
                  key={`sd${i}`}
                  style={[
                    scanStyles.dot,
                    { top: pos.top as any, left: pos.left as any, opacity: dotOpacities[i + 4] },
                  ]}
                />
              ))}
              {lineConfigs.slice(2).map((cfg, i) => (
                <Animated.View
                  key={`sl${i}`}
                  style={[
                    scanStyles.connectionLine,
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
              <View style={[scanStyles.corner, scanStyles.cornerTL]} />
              <View style={[scanStyles.corner, scanStyles.cornerTR]} />
              <View style={[scanStyles.corner, scanStyles.cornerBL]} />
              <View style={[scanStyles.corner, scanStyles.cornerBR]} />
            </View>
            <Text style={scanStyles.photoLabel}>Side</Text>
          </View>
        )}
      </View>

      {/* Status text */}
      <Animated.View style={[scanStyles.statusContainer, { opacity: statusOpacity }]}>
        <View style={scanStyles.statusDot} />
        <Text style={scanStyles.statusText}>{statusText}</Text>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function FaceRatingScreen({ navigation }: any) {
  useOnboardingTracking('v2_face_rating');
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const PHOTO_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.md) / 2;
  const PHOTO_HEIGHT = PHOTO_WIDTH * 1.35;

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data } = useOnboarding();

  const { isDevModeEnabled } = useDevMode();
  const [result, setResult] = useState<FaceAnalysisResult | null>(null);
  const [photos, setPhotos] = useState<{ frontUri: string; sideUri: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frontOnly, setFrontOnly] = useState(false);
  const lastTapRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  // Dev mode editing
  const [devModalVisible, setDevModalVisible] = useState(false);
  const [devEdits, setDevEdits] = useState<Record<string, string>>({});

  const handleFrontDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setFrontOnly(prev => !prev);
    }
    lastTapRef.current = now;
  }, []);

  // Results animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const photoFade = useRef(new Animated.Value(0)).current;
  const photoSlide = useRef(new Animated.Value(20)).current;
  const scoreCardFade = useRef(new Animated.Value(0)).current;
  const scoreCardSlide = useRef(new Animated.Value(20)).current;
  const overallAnim = useRef(new Animated.Value(0)).current;
  const potentialBarAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(BREAKDOWN_CATEGORIES.map(() => new Animated.Value(0))).current;
  const rowFades = useRef(BREAKDOWN_CATEGORIES.map(() => new Animated.Value(0))).current;
  const breakdownFade = useRef(new Animated.Value(0)).current;
  const adviceFade = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(40)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const [displayOverall, setDisplayOverall] = React.useState('0.0');

  useEffect(() => {
    loadAndAnalyze();
  }, []);

  const loadAndAnalyze = async () => {
    try {
      // Load photos first so scanning view can show them
      const savedPhotos = await loadSelfiePhotos();
      if (!savedPhotos) {
        setError('Photos not found. Please retake your selfies.');
        setLoading(false);
        return;
      }
      setPhotos(savedPhotos);

      // Minimum scanning duration so the animation always plays
      const scanStart = Date.now();
      const MIN_SCAN_MS = 4000;

      let analysisResult: FaceAnalysisResult | null = null;

      // Check Firestore for cached results
      if (user?.uid) {
        const cached = await loadCachedResult(user.uid);
        if (cached) {
          analysisResult = cached;
        }
      }

      // If no cached result, call GPT-4o Vision API
      if (!analysisResult) {
        const gender = data.gender || 'male';
        analysisResult = await analyzeFace(savedPhotos.frontUri, savedPhotos.sideUri ?? null, gender);

        // Save to Firestore
        if (user?.uid) {
          try {
            const analysisRef = doc(collection(db, 'users', user.uid, 'faceAnalysis'));
            await setDoc(analysisRef, {
              ...analysisResult,
              gender,
              timestamp: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[FaceRating] Failed to save to Firestore:', e);
          }
        }
      }

      // Wait for minimum scanning time so animation plays fully
      const elapsed = Date.now() - scanStart;
      if (elapsed < MIN_SCAN_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_SCAN_MS - elapsed));
      }

      setResult(analysisResult);
      setLoading(false);
      runEntryAnimations(analysisResult);
    } catch (e: any) {
      console.error('[FaceRating] Analysis error:', e);
      setError(e.message || 'Analysis failed. Please try again.');
      setLoading(false);
    }
  };

  const loadCachedResult = async (uid: string): Promise<FaceAnalysisResult | null> => {
    try {
      const q = query(
        collection(db, 'users', uid, 'faceAnalysis'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as FaceAnalysisResult;
    } catch {
      return null;
    }
  };

  const runEntryAnimations = (res: FaceAnalysisResult) => {
    // Animated score counter
    const overallListener = overallAnim.addListener(({ value }) => {
      setDisplayOverall(value.toFixed(1));
    });

    // Header
    Animated.timing(headerFade, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();

    // Photos slide in
    Animated.parallel([
      Animated.timing(photoFade, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      Animated.spring(photoSlide, { toValue: 0, delay: 150, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();

    // Score card slide in
    Animated.parallel([
      Animated.timing(scoreCardFade, { toValue: 1, duration: 500, delay: 350, useNativeDriver: true }),
      Animated.spring(scoreCardSlide, { toValue: 0, delay: 350, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();

    // Animated overall number counter
    Animated.timing(overallAnim, {
      toValue: res.overall,
      duration: 1200,
      delay: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Potential bar fill (animates the stacked bar)
    Animated.timing(potentialBarAnim, {
      toValue: 1,
      duration: 1000,
      delay: 600,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Breakdown card fade
    Animated.timing(breakdownFade, {
      toValue: 1, duration: 500, delay: 800, useNativeDriver: true,
    }).start();

    // Category rows staggered
    Animated.stagger(60, rowFades.map((fade) =>
      Animated.timing(fade, { toValue: 1, duration: 400, delay: 900, useNativeDriver: true })
    )).start();

    // Bar fills staggered
    Animated.stagger(80, barAnims.map((anim, i) => {
      const key = BREAKDOWN_CATEGORIES[i].key;
      const score = typeof res[key] === 'number' ? (res[key] as number) : 0;
      return Animated.timing(anim, {
        toValue: score / 10,
        duration: 800,
        delay: 1000,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      });
    })).start();

    // Advice
    Animated.timing(adviceFade, {
      toValue: 1, duration: 500, delay: 1800, useNativeDriver: true,
    }).start();

    // Button
    Animated.parallel([
      Animated.timing(buttonFade, { toValue: 1, duration: 500, delay: 2100, useNativeDriver: true }),
      Animated.spring(buttonSlide, { toValue: 0, delay: 2100, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  };

  const handleContinue = async () => {
    navigation.navigate('V2ProtocolOverview');
  };

  const openDevModal = () => {
    if (!result) return;
    const edits: Record<string, string> = { overall: result.overall.toFixed(1) };
    BREAKDOWN_CATEGORIES.forEach(cat => {
      const val = typeof result[cat.key] === 'number' ? (result[cat.key] as number) : 0;
      edits[cat.key] = val.toFixed(1);
    });
    setDevEdits(edits);
    setDevModalVisible(true);
  };

  const applyDevEdits = () => {
    if (!result) return;
    const updated = { ...result };
    const parseVal = (s: string) => { const n = parseFloat(s); return isNaN(n) ? 0 : Math.min(10, Math.max(0, n)); };
    updated.overall = parseVal(devEdits.overall);
    BREAKDOWN_CATEGORIES.forEach(cat => {
      (updated as any)[cat.key] = parseVal(devEdits[cat.key]);
    });
    // Recalculate potential from updated scores
    let potentialSum = 0;
    BREAKDOWN_CATEGORIES.forEach(cat => {
      const score = typeof updated[cat.key] === 'number' ? (updated[cat.key] as number) : 0;
      potentialSum += getCategoryPotential(score, cat.improvability);
    });
    updated.potential = Math.min(9.5, potentialSum / BREAKDOWN_CATEGORIES.length);
    setResult(updated);
    setDevModalVisible(false);
    // Reset animations to 0, scroll to top, then replay after 500ms
    overallAnim.setValue(0);
    potentialBarAnim.setValue(0);
    barAnims.forEach(a => a.setValue(0));
    rowFades.forEach(a => a.setValue(0));
    headerFade.setValue(0);
    photoFade.setValue(0);
    photoSlide.setValue(20);
    scoreCardFade.setValue(0);
    scoreCardSlide.setValue(20);
    breakdownFade.setValue(0);
    adviceFade.setValue(0);
    buttonFade.setValue(0);
    buttonSlide.setValue(40);
    setDisplayOverall('0.0');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setTimeout(() => runEntryAnimations(updated), 500);
  };

  // ─── Loading: Scanning Animation ────────────────────────────────────────────

  if (loading && photos) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ScanningView photos={photos} theme={theme} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────

  if (error || !result) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error || 'Something went wrong.'}</Text>
        <View style={{ marginTop: theme.spacing.lg, width: '100%', paddingHorizontal: theme.spacing.lg }}>
          <GradientButton title="Continue Anyway" onPress={handleContinue} />
        </View>
      </View>
    );
  }

  // ─── Results ────────────────────────────────────────────────────────────────

  const adviceItems = [
    { title: 'Jawline', text: result.advice_jawline },
    { title: 'Skin', text: result.advice_skin },
    { title: 'Hair', text: result.advice_hair },
    { title: 'Overall', text: result.advice_overall },
  ].filter(a => a.text);

  const potentialGain = Math.max(0, result.potential - result.overall);

  // Animated bar widths for the overall stacked bar
  const overallBarWidth = potentialBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${(result.overall / 10) * 100}%`],
  });
  const potentialBarWidth = potentialBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${(result.potential / 10) * 100}%`],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={{ opacity: headerFade }}>
          <Text style={styles.headline}>Your Rating</Text>
        </Animated.View>

        {/* Photos */}
        <Animated.View style={[styles.photosSection, { opacity: photoFade, transform: [{ translateY: photoSlide }] }]}>
          <View style={[styles.photosRow, (frontOnly || !photos!.sideUri) && styles.photosRowCentered]}>
            <TouchableWithoutFeedback onPress={photos!.sideUri ? handleFrontDoubleTap : undefined}>
              <View style={[styles.photoCard, (frontOnly || !photos!.sideUri) && styles.photoCardSolo, { height: PHOTO_HEIGHT * 0.7 }]}>
                <Image source={{ uri: photos!.frontUri }} style={styles.photo} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={styles.photoGradientOverlay}
                />
                <Text style={styles.photoTag}>FRONT</Text>
              </View>
            </TouchableWithoutFeedback>
            {!frontOnly && photos!.sideUri && (
              <View style={[styles.photoCard, { height: PHOTO_HEIGHT * 0.7 }]}>
                <Image source={{ uri: photos!.sideUri }} style={styles.photo} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={styles.photoGradientOverlay}
                />
                <Text style={styles.photoTag}>SIDE</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Overall Score Card */}
        <Animated.View
          style={[
            styles.scoreCard,
            {
              opacity: scoreCardFade,
              transform: [{ translateY: scoreCardSlide }],
            },
          ]}
        >
          {/* Big score number */}
          <View style={styles.overallSection}>
            <View style={styles.overallRow}>
              <Text style={styles.overallScore}>{displayOverall}</Text>
              <Text style={styles.overallMax}>/10</Text>
            </View>
            <Text style={styles.overallLabel}>Overall Rating</Text>
          </View>

          {/* Stacked bar: current score + potential */}
          <View style={styles.stackedBarContainer}>
            {/* Glow behind the main bar */}
            <Animated.View style={[styles.overallBarGlow, { width: overallBarWidth }]} />
            <View style={styles.stackedBarTrack}>
              {/* Potential layer (behind, lighter) */}
              <Animated.View style={[styles.potentialBarFill, { width: potentialBarWidth }]}>
                <LinearGradient
                  colors={[theme.colors.accentSecondary + 'AA', theme.colors.accentSecondary + '70']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.overallBarGradient}
                />
              </Animated.View>
              {/* Current score layer (front, solid) */}
              <Animated.View style={[styles.currentBarFill, { width: overallBarWidth }]}>
                <LinearGradient
                  colors={theme.gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.overallBarGradient}
                />
              </Animated.View>
            </View>
            {/* Potential indicator */}
            {potentialGain > 0 && (
              <View style={styles.potentialIndicator}>
                <View style={styles.potentialDot} />
                <Text style={styles.potentialText}>
                  Potential: <Text style={styles.potentialValue}>+{potentialGain.toFixed(1)} points</Text>
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Category Breakdown */}
          {BREAKDOWN_CATEGORIES.map((cat, i) => {
            const score = typeof result[cat.key] === 'number' ? (result[cat.key] as number) : 0;
            const catPotential = getCategoryPotential(score, cat.improvability);
            const color = getScoreColor(score);
            const potentialPct = `${(catPotential / 10) * 100}%`;
            const barWidth = barAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            });

            return (
              <Animated.View key={cat.key} style={[styles.ratingRow, { opacity: rowFades[i] }]}>
                <Text style={styles.ratingLabel}>{cat.label}</Text>
                <View style={styles.barWrapper}>
                  {/* Glow layer (not clipped) */}
                  <Animated.View style={[styles.barGlow, { width: barWidth, backgroundColor: color, shadowColor: color }]} />
                  {/* Actual bar track */}
                  <View style={styles.barTrack}>
                    {/* Potential layer (behind, lighter) */}
                    <View style={[styles.catPotentialBar, { width: potentialPct as any, backgroundColor: color + '55' }]} />
                    {/* Current score layer */}
                    <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
                  </View>
                </View>
                <Text style={[styles.ratingScore, { color }]}>
                  {score.toFixed(1)}
                </Text>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Advice Section */}
        {adviceItems.length > 0 && (
          <Animated.View style={[styles.adviceSection, { opacity: adviceFade }]}>
            <Text style={styles.adviceHeading}>Your Improvement Plan</Text>
            <Text style={styles.adviceSubheading}>Personalized tips based on your analysis</Text>
            {adviceItems.map((item) => (
              <View key={item.title} style={styles.adviceCard}>
                <Text style={styles.adviceTitle}>{item.title}</Text>
                <Text style={styles.adviceText}>{item.text}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Continue Button */}
        <Animated.View style={[styles.buttonContainer, { opacity: buttonFade, transform: [{ translateY: buttonSlide }] }]}>
          <GradientButton title="Start Your Protocol" onPress={handleContinue} />
        </Animated.View>

        {/* Dev Mode Button */}
        {isDevModeEnabled && result && (
          <TouchableOpacity style={styles.devButton} onPress={openDevModal} activeOpacity={0.7}>
            <Text style={styles.devButtonText}>Edit Scores</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Dev Mode Modal */}
      {isDevModeEnabled && (
        <Modal visible={devModalVisible} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              style={styles.devOverlay}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.devModal}>
                  <Text style={styles.devModalTitle}>Edit Scores</Text>
                  <ScrollView
                    style={styles.devScroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.devLabel}>Overall</Text>
                    <TextInput
                      style={styles.devInput}
                      value={devEdits.overall}
                      onChangeText={v => setDevEdits(prev => ({ ...prev, overall: v }))}
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    {BREAKDOWN_CATEGORIES.map(cat => (
                      <View key={cat.key}>
                        <Text style={styles.devLabel}>{cat.label}</Text>
                        <TextInput
                          style={styles.devInput}
                          value={devEdits[cat.key]}
                          onChangeText={v => setDevEdits(prev => ({ ...prev, [cat.key]: v }))}
                          keyboardType="decimal-pad"
                          placeholderTextColor={theme.colors.textMuted}
                        />
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.devButtonRow}>
                    <TouchableOpacity style={styles.devCancelBtn} onPress={() => setDevModalVisible(false)}>
                      <Text style={styles.devCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.devApplyBtn} onPress={applyDevEdits}>
                      <Text style={styles.devApplyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

// ─── Scan Styles ──────────────────────────────────────────────────────────────

function getScanStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    title: {
      ...theme.typography.heading,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    photosRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
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
      borderRadius: theme.borderRadius.xl + 3,
      overflow: 'hidden',
    },
    glowGradient: {
      flex: 1,
      borderRadius: theme.borderRadius.xl + 3,
    },
    photoFrame: {
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
    },
    photoLabel: {
      ...theme.typography.label,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.sm,
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
      backgroundColor: theme.colors.accentCyan,
      shadowColor: theme.colors.accentCyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 4,
    },
    connectionLine: {
      position: 'absolute',
      height: 1,
      backgroundColor: theme.colors.accentCyan + '60',
    },
    corner: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderColor: theme.colors.accentCyan + '80',
    },
    cornerTL: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
    cornerTR: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
    cornerBL: { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
    cornerBR: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.accentCyan,
      shadowColor: theme.colors.accentCyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
    },
    statusText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
  });
}

// ─── Main Styles ──────────────────────────────────────────────────────────────

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl + 20,
    },
    centerContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    errorText: {
      ...theme.typography.body,
      color: theme.colors.error,
      textAlign: 'center',
    },

    // Header
    headline: {
      ...theme.typography.heading,
      fontSize: 36,
      fontWeight: '800',
      lineHeight: 42,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    subheadline: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },

    // Photos
    photosSection: {
      marginBottom: theme.spacing.lg,
    },
    photosRow: {
      flexDirection: 'row' as const,
      gap: theme.spacing.sm,
    },
    photosRowCentered: {
      justifyContent: 'center' as const,
    },
    photoCard: {
      flex: 1,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden' as const,
      backgroundColor: theme.colors.surface,
    },
    photoCardSolo: {
      flex: 0 as any,
      width: SCREEN_WIDTH * 0.55,
    },
    photo: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    photoGradientOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 48,
    },
    photoTag: {
      position: 'absolute',
      bottom: 10,
      left: 12,
      ...theme.typography.label,
      fontSize: 10,
      color: 'rgba(255,255,255,0.8)',
      letterSpacing: 1.5,
    },

    // Score Card
    scoreCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    overallSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    overallRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    overallScore: {
      fontSize: 56,
      fontWeight: '800',
      color: theme.colors.accent,
      fontVariant: ['tabular-nums'],
    },
    overallMax: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.colors.textMuted,
      marginLeft: theme.spacing.xs,
    },
    overallLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
    },

    // Stacked bar (current + potential)
    stackedBarContainer: {
      marginBottom: theme.spacing.lg,
      position: 'relative',
    },
    overallBarGlow: {
      position: 'absolute',
      top: -2,
      left: 0,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.accent,
      opacity: 0.3,
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 6,
    },
    stackedBarTrack: {
      height: 12,
      backgroundColor: theme.colors.surfaceLight,
      borderRadius: 6,
      overflow: 'hidden',
      position: 'relative',
    },
    potentialBarFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      borderRadius: 6,
      overflow: 'hidden',
    },
    currentBarFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      borderRadius: 6,
      overflow: 'hidden',
    },
    overallBarGradient: {
      flex: 1,
    },
    potentialIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    potentialDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.accentSecondary + '90',
      marginRight: theme.spacing.xs,
    },
    potentialText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    potentialValue: {
      color: theme.colors.accentSecondary,
      fontWeight: '700',
    },

    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
    },

    // Category rows
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    ratingLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      width: 90,
    },
    barWrapper: {
      flex: 1,
      marginHorizontal: theme.spacing.sm,
      position: 'relative',
    },
    barGlow: {
      position: 'absolute',
      top: -2,
      left: 0,
      height: 12,
      borderRadius: 6,
      opacity: 0.35,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 6,
      elevation: 4,
    },
    barTrack: {
      height: 8,
      backgroundColor: theme.colors.surfaceLight,
      borderRadius: 4,
      overflow: 'hidden',
    },
    catPotentialBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      borderRadius: 4,
    },
    barFill: {
      height: '100%',
      borderRadius: 4,
    },
    ratingScore: {
      ...theme.typography.bodySmall,
      fontWeight: '700',
      width: 30,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },

    // Advice
    adviceSection: {
      marginBottom: theme.spacing.xl,
    },
    adviceHeading: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.xs,
    },
    adviceSubheading: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.md,
    },
    adviceCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    adviceTitle: {
      ...theme.typography.body,
      fontWeight: '700',
      fontSize: 15,
      marginBottom: theme.spacing.xs,
    },
    adviceText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      lineHeight: 21,
    },

    // Button
    buttonContainer: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },

    // Dev mode
    devButton: {
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.xl,
    },
    devButtonText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    devOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    devModal: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      maxHeight: '80%',
    },
    devModalTitle: {
      ...theme.typography.heading,
      fontSize: 20,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    devScroll: {
      marginBottom: theme.spacing.md,
    },
    devLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      marginBottom: 4,
      marginTop: theme.spacing.sm,
    },
    devInput: {
      backgroundColor: theme.colors.surfaceLight,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text,
      fontSize: 16,
      fontVariant: ['tabular-nums'] as any,
    },
    devButtonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    devCancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    devCancelText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    devApplyBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
    },
    devApplyText: {
      ...theme.typography.body,
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
}

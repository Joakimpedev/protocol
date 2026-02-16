import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
  Image,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH - spacingV2.lg * 2;

const CHECKLIST_ITEMS = [
  'Morning cleanser & SPF',
  'Evening treatment serum',
  'Weekly exfoliation schedule',
];

export default function ValuePropScreen({ navigation }: any) {
  useOnboardingTracking('v2_value_prop');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(3); // page area + dots + button
  const [activePage, setActivePage] = useState(0);

  // Score counter animation for page 2
  const scoreValue = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState('0.0');

  // Score glow pulse
  const scoreGlow = useRef(new Animated.Value(0.3)).current;

  // Checklist fade-in animations for page 3
  const checkItem1Opacity = useRef(new Animated.Value(0)).current;
  const checkItem2Opacity = useRef(new Animated.Value(0)).current;
  const checkItem3Opacity = useRef(new Animated.Value(0)).current;
  const checkItemAnims = [checkItem1Opacity, checkItem2Opacity, checkItem3Opacity];

  // Score counter animation when page 2 is active
  useEffect(() => {
    if (activePage === 1) {
      scoreValue.setValue(0);
      const listener = scoreValue.addListener(({ value }) => {
        setDisplayScore(value.toFixed(1));
      });

      Animated.timing(scoreValue, {
        toValue: 8.4,
        duration: 1500,
        delay: 300,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }).start();

      // Start glow pulse
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scoreGlow, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(scoreGlow, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      glowLoop.start();

      return () => {
        scoreValue.removeListener(listener);
        glowLoop.stop();
      };
    }
  }, [activePage]);

  // Checklist fade-in when page 3 is active
  useEffect(() => {
    if (activePage === 2) {
      checkItemAnims.forEach((anim) => anim.setValue(0));

      Animated.stagger(400, [
        Animated.timing(checkItem1Opacity, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(checkItem2Opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(checkItem3Opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    }
  }, [activePage]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / PAGE_WIDTH);
    if (page !== activePage) {
      setActivePage(page);
    }
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2FeaturePreview');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={2} totalSteps={12}>
      <View style={styles.content}>
        {/* Paged ScrollView */}
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
            flex: 1,
          }}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={styles.pager}
            contentContainerStyle={styles.pagerContent}
            decelerationRate="fast"
            snapToInterval={PAGE_WIDTH}
          >
            {/* Page 1: Analyze Your Face */}
            <View style={[styles.page, { width: PAGE_WIDTH }]}>
              <Text style={styles.pageTitle}>Analyze Your Face</Text>
              <Text style={styles.pageBody}>
                Our AI scans and evaluates your face across multiple categories
                for a comprehensive analysis.
              </Text>
              <View style={styles.scanImageContainer}>
                <Image
                  source={require('../../../assets/images/side.png')}
                  style={styles.scanImage}
                  resizeMode="cover"
                />
                <FaceScanOverlay animated />
              </View>
            </View>

            {/* Page 2: Get Your Rating */}
            <View style={[styles.page, { width: PAGE_WIDTH }]}>
              <Text style={styles.pageTitle}>Get Your Rating</Text>
              <Text style={styles.pageBody}>
                Receive a detailed score across each category so you know
                exactly where you stand.
              </Text>
              <View style={styles.scoreContainer}>
                <Animated.View style={[styles.scoreGlow, { opacity: scoreGlow }]} />
                <Text style={styles.scoreNumber}>{displayScore}</Text>
                <Text style={styles.scoreLabel}>/ 10</Text>
              </View>
            </View>

            {/* Page 3: Personalized Routine */}
            <View style={[styles.page, { width: PAGE_WIDTH }]}>
              <Text style={styles.pageTitle}>Personalized Routine</Text>
              <Text style={styles.pageBody}>
                Get a step-by-step routine tailored to your unique needs.
              </Text>
              <View style={styles.checklistContainer}>
                {CHECKLIST_ITEMS.map((item, index) => (
                  <Animated.View
                    key={item}
                    style={[
                      styles.checklistItem,
                      { opacity: checkItemAnims[index] },
                    ]}
                  >
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                    <Text style={styles.checklistText}>{item}</Text>
                  </Animated.View>
                ))}
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Pagination dots */}
        <Animated.View
          style={[
            styles.dotsContainer,
            {
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            },
          ]}
        >
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activePage === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </Animated.View>

        {/* Continue button */}
        <Animated.View
          style={{
            opacity: anims[2].opacity,
            transform: anims[2].transform,
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
  pager: {
    flex: 1,
  },
  pagerContent: {
    alignItems: 'center',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingV2.md,
  },
  pageTitle: {
    ...typographyV2.heading,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  pageBody: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
    paddingHorizontal: spacingV2.sm,
  },
  // Scan image for page 1
  scanImageContainer: {
    width: 200,
    height: 240,
    borderRadius: borderRadiusV2.lg,
    overflow: 'hidden',
  },
  scanImage: {
    width: '100%',
    height: '100%',
  },
  // Score counter
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    position: 'relative',
  },
  scoreGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colorsV2.accentOrange,
    top: -20,
    left: '50%',
    marginLeft: -60,
  },
  scoreNumber: {
    fontSize: 84,
    fontWeight: '700',
    color: colorsV2.accentOrange,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    ...typographyV2.heading,
    color: colorsV2.textMuted,
    marginLeft: spacingV2.xs,
  },
  // Checklist
  checklistContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: spacingV2.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingV2.md,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colorsV2.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingV2.md,
  },
  checkMark: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  checklistText: {
    ...typographyV2.body,
    color: colorsV2.textPrimary,
  },
  // Pagination dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacingV2.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: spacingV2.xs,
  },
  dotActive: {
    backgroundColor: colorsV2.accentOrange,
    width: 24,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: colorsV2.border,
  },
});

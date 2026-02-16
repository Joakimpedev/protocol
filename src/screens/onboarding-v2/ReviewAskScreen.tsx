import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReviewAskScreen({ navigation }: any) {
  useOnboardingTracking('v2_review_ask');
  const insets = useSafeAreaInsets();
  const [reviewPressed, setReviewPressed] = useState(false);
  const bgFade = useRef(new Animated.Value(0)).current;

  const handleReview = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReviewPressed(true);
    try {
      await StoreReview.requestReview();
    } catch (error) {
      console.warn('[ReviewAsk] Store review error:', error);
    }
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2NotificationsAsk');
  };

  return (
    <View style={styles.container}>
      {/* Background image */}
      <Animated.Image
        source={require('../../../assets/images/paywall2.png')}
        style={[styles.bgImage, { opacity: bgFade }]}
        resizeMode="cover"
        onLoad={() => Animated.timing(bgFade, { toValue: 1, duration: 250, useNativeDriver: true }).start()}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)', '#000000']}
        style={StyleSheet.absoluteFillObject}
        locations={[0.15, 0.5, 0.85]}
      />

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.spacerTop} />

        {/* Center section */}
        <View style={styles.centerSection}>
          <Text style={styles.headline}>Help Us Grow</Text>
          <Text style={styles.subheadline}>Be cool and leave a review</Text>

          {/* Social proof with award branches */}
          <View style={styles.socialProof}>
            <Image
              source={require('../../../assets/images/left-awards-branch-gray.png')}
              style={styles.branchLeft}
              resizeMode="contain"
            />
            <View style={styles.socialProofCenter}>
              <Text style={styles.stars}>★★★★★</Text>
              <Text style={styles.downloads}>100,000+</Text>
              <Text style={styles.downloadsLabel}>DOWNLOADS</Text>
            </View>
            <Image
              source={require('../../../assets/images/right-award-banner-branch-gray-77x138.png')}
              style={styles.branchRight}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.spacerBottom} />

        {/* Button at bottom */}
        <View style={styles.bottomSection}>
          {!reviewPressed ? (
            <GradientButton
              title="Leave a Review"
              onPress={handleReview}
            />
          ) : (
            <GradientButton
              title="Continue"
              onPress={handleContinue}
            />
          )}
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
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacingV2.lg,
  },
  spacerTop: {
    flex: 1,
  },
  centerSection: {
    alignItems: 'center',
  },
  headline: {
    ...typographyV2.display,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  subheadline: {
    ...typographyV2.body,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: spacingV2.xl,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchLeft: {
    width: 60,
    height: 110,
  },
  socialProofCenter: {
    alignItems: 'center',
    marginHorizontal: spacingV2.md,
  },
  branchRight: {
    width: 60,
    height: 110,
  },
  stars: {
    fontSize: 28,
    color: '#FFD700',
    marginBottom: spacingV2.sm,
    letterSpacing: 4,
  },
  downloads: {
    fontSize: 36,
    fontWeight: '800',
    color: colorsV2.textPrimary,
    letterSpacing: 1,
  },
  downloadsLabel: {
    ...typographyV2.label,
    color: colorsV2.textSecondary,
    letterSpacing: 3,
    marginTop: spacingV2.xs,
  },
  spacerBottom: {
    flex: 1,
  },
  bottomSection: {
    alignItems: 'center',
  },
});

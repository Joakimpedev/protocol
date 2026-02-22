import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Filter, FeGaussianBlur, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { usePremium } from '../../contexts/PremiumContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { clearOnboardingProgress } from '../../utils/onboardingStorage';
import { buildRoutineFromOnboarding } from '../../utils/buildRoutineFromOnboarding';
import {
  getOfferings,
  getLifetimePackageFromOffering,
  purchasePackage,
  restorePurchases,
  logInRevenueCat,
} from '../../services/subscriptionService';
import { cancelAbandonedCartNotification, clearAbandonedCartQuickAction } from '../../services/notificationService';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import { PurchasesPackage } from 'react-native-purchases';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AbandonedCartOfferScreen({ navigation }: any) {
  useOnboardingTracking('v2_abandoned_cart_offer');
  const insets = useSafeAreaInsets();
  const { user, signInAnonymous } = useAuth();
  const { data } = useOnboarding();
  const { refreshSubscriptionStatus, isPremium } = usePremium();
  const { isDevModeEnabled, clearForceFlags } = useDevMode();

  // GUARD: If user is already premium (trial or paid), skip this screen entirely
  useEffect(() => {
    if (isPremium) {
      console.log('[AbandonedCartOffer] User is already premium, skipping offer');
      cancelAbandonedCartNotification();
      clearAbandonedCartQuickAction();
      navigation.replace('V2FaceRating');
    }
  }, [isPremium]);

  const [lifetimePackage, setLifetimePackage] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const offering = await getOfferings();
        if (cancelled) return;
        const lifetime = getLifetimePackageFromOffering(offering);
        setLifetimePackage(lifetime);
        console.log('[AbandonedCartOffer] Lifetime package:', lifetime?.product?.identifier, lifetime?.product?.priceString);
      } catch (error) {
        console.warn('[AbandonedCartOffer] Failed to load offerings:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const buildRoutinePayload = () => {
    const { ingredientSelections, exerciseSelections } = buildRoutineFromOnboarding(data);
    const signupDate = new Date();
    return {
      concerns: data.selectedProblems || [],
      routineStarted: false,
      routineStartDate: signupDate.toISOString(),
      ingredientSelections, exerciseSelections,
      signupDate: signupDate.toISOString(),
      createdAt: signupDate.toISOString(),
      ...(data.skinType && { skinType: data.skinType }),
      ...(data.budget && { budget: data.budget }),
    };
  };

  const handleClaim = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      let uid = user?.uid;
      if (!uid) { const cred = await signInAnonymous(); uid = cred.user.uid; }

      const routinePayload = buildRoutinePayload();
      const userRef = doc(db, 'users', uid!);

      if (isDevModeEnabled) {
        const existing = await getDoc(userRef);
        if (existing.exists()) { await updateDoc(userRef, routinePayload); }
        else { await setDoc(userRef, routinePayload); }
        await clearOnboardingProgress(); await clearForceFlags();
        cancelAbandonedCartNotification(); clearAbandonedCartQuickAction();
        navigation.navigate('V2FaceRating');
        setPurchasing(false);
        return;
      }

      if (!lifetimePackage) {
        Alert.alert('Not Ready', 'Offer is still loading. Please try again.');
        setPurchasing(false);
        return;
      }

      const result = await purchasePackage(lifetimePackage);
      if (result.success) {
        cancelAbandonedCartNotification(); clearAbandonedCartQuickAction();
        const existing = await getDoc(userRef);
        if (existing.exists()) { await updateDoc(userRef, routinePayload); }
        else { await setDoc(userRef, routinePayload); }
        await refreshSubscriptionStatus(); await clearOnboardingProgress();
        navigation.navigate('V2FaceRating');
      } else {
        if (result.error === 'Purchase cancelled') return;
        Alert.alert('Error', result.error || 'Purchase failed.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to complete purchase.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      let uid = user?.uid;
      if (!uid) { const cred = await signInAnonymous(); uid = cred.user.uid; }
      await logInRevenueCat(uid);
      const result = await restorePurchases(uid);
      if (result.success && result.isPremium) {
        cancelAbandonedCartNotification(); clearAbandonedCartQuickAction();
        const routinePayload = buildRoutinePayload();
        const userRef = doc(db, 'users', uid!);
        const existing = await getDoc(userRef);
        if (existing.exists()) { await updateDoc(userRef, routinePayload); }
        else { await setDoc(userRef, routinePayload); }
        await refreshSubscriptionStatus(); await clearOnboardingProgress();
        navigation.navigate('V2FaceRating');
      } else {
        Alert.alert('No Purchases', 'No previous purchases found.');
      }
    } catch {
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
      setRestoring(false);
    }
  };

  const priceDisplay = lifetimePackage?.product?.priceString || '...';

  return (
    <View style={styles.screen}>
      {/* Top half — collage image with 40% OFF overlay */}
      <View style={styles.imageSection}>
        <ImageBackground
          source={require('../../../assets/images/collage.png')}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          {/* Dark vignette over image */}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)', colorsV2.background]}
            locations={[0.5, 0.6, 0.9, 1]}
            style={styles.imageOverlay}
          />
          {/* Neon 40% OFF — SVG stroke with layered glow */}
          <View style={styles.discountOverlay}>
            <Svg width={SCREEN_WIDTH} height={120} viewBox={`0 0 ${SCREEN_WIDTH} 120`}>
              <Defs>
                <Filter id="glowWide" x="-30%" y="-30%" width="160%" height="160%">
                  <FeGaussianBlur in="SourceGraphic" stdDeviation="10" />
                </Filter>
                <Filter id="glowMed" x="-20%" y="-20%" width="140%" height="140%">
                  <FeGaussianBlur in="SourceGraphic" stdDeviation="5" />
                </Filter>
                <Filter id="glowTight" x="-10%" y="-10%" width="120%" height="120%">
                  <FeGaussianBlur in="SourceGraphic" stdDeviation="2" />
                </Filter>
              </Defs>
              {/* Layer 1: outer ambient glow */}
              <SvgText
                x={SCREEN_WIDTH / 2}
                y={78}
                textAnchor="middle"
                fill={colorsV2.accentOrange}
                fillOpacity={0.4}
                stroke={colorsV2.accentOrange}
                strokeWidth={6}
                fontSize={68}
                fontWeight="900"
                letterSpacing={2}
                filter="url(#glowWide)"
              >
                40% OFF
              </SvgText>
              {/* Layer 2: medium glow — thicker, builds intensity */}
              <SvgText
                x={SCREEN_WIDTH / 2}
                y={78}
                textAnchor="middle"
                fill={colorsV2.accentOrange}
                fillOpacity={0.3}
                stroke={colorsV2.accentOrange}
                strokeWidth={4}
                fontSize={68}
                fontWeight="900"
                letterSpacing={2}
                filter="url(#glowMed)"
              >
                40% OFF
              </SvgText>
              {/* Layer 3: tight hot glow right on the edge */}
              <SvgText
                x={SCREEN_WIDTH / 2}
                y={78}
                textAnchor="middle"
                fill="none"
                stroke={'#FFFFFF'}
                strokeWidth={3}
                fontSize={68}
                fontWeight="900"
                letterSpacing={2}
                filter="url(#glowTight)"
              >
                40% OFF
              </SvgText>
              {/* Layer 4: subtle dark fill inside letters */}
              <SvgText
                x={SCREEN_WIDTH / 2}
                y={78}
                textAnchor="middle"
                fill={'rgba(0,0,0,0.5)'}
                stroke="none"
                fontSize={68}
                fontWeight="900"
                letterSpacing={2}
              >
                40% OFF
              </SvgText>
              {/* Layer 5: crisp bright core stroke */}
              <SvgText
                x={SCREEN_WIDTH / 2}
                y={78}
                textAnchor="middle"
                fill="none"
                stroke={colorsV2.accentOrange}
                strokeWidth={2}
                fontSize={68}
                fontWeight="900"
                letterSpacing={2}
              >
                40% OFF
              </SvgText>
            </Svg>
          </View>
        </ImageBackground>
      </View>

      {/* Bottom half — copy + CTA on solid dark bg */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + spacingV2.sm }]}>
        <Text style={styles.headline}>Reach Your Maximum{'\n'}Attractiveness Potential</Text>
        <Text style={styles.subtitle}>Your personal protocol based on your photos</Text>

        <Text style={styles.priceText}>Lifetime Access: {priceDisplay}</Text>
        <Text style={styles.onetime}>One-time opportunity</Text>

        <View style={styles.ctaSection}>
          <GradientButton
            title={purchasing ? '...' : 'Continue'}
            onPress={handleClaim}
            disabled={purchasing}
          />
        </View>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://protocol.app/terms')}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://protocol.app/privacy')}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.footerLink}>{restoring ? 'Restoring...' : 'Restore'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },

  // Top image area
  imageSection: {
    flex: 1,
    overflow: 'hidden' as const,
  },
  imageBackground: {
    flex: 1,
    marginTop: -160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  discountOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 200, // adjust to move neon text up (negative) or down (positive)
  },

  // Bottom content area
  bottomSection: {
    paddingHorizontal: spacingV2.lg,
    paddingTop: spacingV2.lg,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: colorsV2.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacingV2.sm,
  },
  subtitle: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: colorsV2.textPrimary,
    textAlign: 'center',
    marginBottom: spacingV2.xs,
  },
  onetime: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    textAlign: 'center',
    marginBottom: spacingV2.lg,
  },
  ctaSection: {
    marginBottom: spacingV2.md,
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacingV2.sm,
  },
  footerLink: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
});

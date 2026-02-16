import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import * as Notifications from 'expo-notifications';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import AnimatedCard from '../../components/v2/AnimatedCard';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';

export default function ReviewPermissionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  // 1 headline + 1 button = 2
  const anims = useScreenEntrance(2);

  const handleReview = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await StoreReview.requestReview();
    } catch (error) {
      console.warn('[ReviewPermissions] Store review error:', error);
    }
  };

  const handleNotifications = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Notifications.requestPermissionsAsync();
    } catch (error) {
      console.warn('[ReviewPermissions] Notifications error:', error);
    }
  };

  const handleTracking = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await requestTrackingPermissionsAsync();
    } catch (error) {
      console.warn('[ReviewPermissions] Tracking error:', error);
    }
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2ResultsPaywall');
  };

  return (
    <V2ScreenWrapper showProgress={false} scrollable>
      {/* Headline */}
      <Animated.View
        style={{
          opacity: anims[0].opacity,
          transform: anims[0].transform,
        }}
      >
        <Text style={styles.headline}>One last thing...</Text>
      </Animated.View>

      {/* Section 1: App Review */}
      <AnimatedCard delay={0}>
        <Text style={styles.sectionTitle}>Rate Us</Text>
        <Text style={styles.sectionBody}>
          Your review helps others discover Protocol
        </Text>
        <GradientButton
          title="Leave a Review"
          variant="secondary"
          onPress={handleReview}
          style={styles.sectionButton}
        />
      </AnimatedCard>

      {/* Section 2: Notifications */}
      <AnimatedCard delay={200}>
        <Text style={styles.sectionTitle}>Daily Reminders</Text>
        <Text style={styles.sectionBody}>
          Get reminders for your daily routine
        </Text>
        <GradientButton
          title="Enable Notifications"
          variant="secondary"
          onPress={handleNotifications}
          style={styles.sectionButton}
        />
      </AnimatedCard>

      {/* Section 3: Tracking (ATT) */}
      <AnimatedCard delay={400}>
        <Text style={styles.sectionTitle}>Better Recommendations</Text>
        <Text style={styles.sectionBody}>
          Help us improve Protocol for you
        </Text>
        <GradientButton
          title="Allow Tracking"
          variant="secondary"
          onPress={handleTracking}
          style={styles.sectionButton}
        />
      </AnimatedCard>

      {/* Continue Button */}
      <Animated.View
        style={[
          styles.continueContainer,
          {
            opacity: anims[1].opacity,
            transform: anims[1].transform,
          },
        ]}
      >
        <GradientButton
          title="Continue"
          onPress={handleContinue}
        />
      </Animated.View>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.lg,
  },
  sectionTitle: {
    ...typographyV2.subheading,
    color: colorsV2.textPrimary,
    marginBottom: spacingV2.sm,
  },
  sectionBody: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    marginBottom: spacingV2.md,
  },
  sectionButton: {
    marginBottom: spacingV2.sm,
  },
  continueContainer: {
    marginTop: spacingV2.md,
  },
});

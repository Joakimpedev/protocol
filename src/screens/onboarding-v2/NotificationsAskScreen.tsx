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
import * as Notifications from 'expo-notifications';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NotificationsAskScreen({ navigation }: any) {
  useOnboardingTracking('v2_notifications_ask');
  const insets = useSafeAreaInsets();
  const [notifPressed, setNotifPressed] = useState(false);
  const bgFade = useRef(new Animated.Value(0)).current;

  const handleEnable = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifPressed(true);
    try {
      await Notifications.requestPermissionsAsync();
    } catch (error) {
      console.warn('[NotificationsAsk] Notifications error:', error);
    }
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2FriendCode');
  };

  return (
    <View style={styles.container}>
      {/* Background image - hero */}
      <Animated.Image
        source={require('../../../assets/images/hero.png')}
        style={[styles.bgImage, { opacity: bgFade }]}
        resizeMode="cover"
        onLoad={() => Animated.timing(bgFade, { toValue: 1, duration: 250, useNativeDriver: true }).start()}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)', '#000000']}
        style={StyleSheet.absoluteFillObject}
        locations={[0.05, 0.4, 0.75]}
      />

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {/* Top section */}
        <View style={[styles.topSection, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.headline}>Allow{'\n'}Notifications</Text>
          <Text style={styles.subheadline}>
            Get notified when your friends get their ratings & when we launch new features
          </Text>
        </View>

        <View style={styles.spacerTop} />

        {/* Mock notification */}
        <View style={styles.centerSection}>
          <View style={styles.mockNotification}>
            <View style={styles.mockIcon}>
              <Image
                source={require('../../../assets/images/small-icon.png')}
                style={styles.mockIconImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.mockTextContainer}>
              <Text style={styles.mockAppName}>Protocol</Text>
              <Text style={styles.mockMessage}>David got an 8.4 rating</Text>
            </View>
            <View style={styles.bellBadge}>
              <Text style={styles.bellIcon}>🔔</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacerBottom} />

        {/* Button at bottom */}
        <View style={styles.bottomSection}>
          {!notifPressed ? (
            <GradientButton
              title="Enable Notifications"
              onPress={handleEnable}
              colors={['#7C3AED', '#A855F7']}
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
  topSection: {
    alignItems: 'center',
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
    marginBottom: spacingV2.md,
  },
  subheadline: {
    ...typographyV2.body,
    color: '#D1D5DB',
    textAlign: 'center',
    paddingHorizontal: spacingV2.md,
    marginBottom: spacingV2.xl,
  },
  mockNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
    alignSelf: 'stretch',
  },
  mockIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: spacingV2.md,
  },
  mockIconImage: {
    width: '100%',
    height: '100%',
  },
  mockTextContainer: {
    flex: 1,
  },
  mockAppName: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  mockMessage: {
    ...typographyV2.body,
    fontWeight: '600',
    color: colorsV2.textPrimary,
    fontSize: 14,
  },
  bellBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colorsV2.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacingV2.sm,
  },
  bellIcon: {
    fontSize: 20,
  },
  spacerBottom: {
    flex: 1,
  },
  bottomSection: {
    alignItems: 'center',
  },
});

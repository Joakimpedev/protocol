import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useAuth } from '../../contexts/AuthContext';
import { joinRoom } from '../../services/referralService';
import { identifyUser as identifyTikTokUser, trackRoomJoined as trackTikTokRoomJoined } from '../../services/tiktok';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FriendCodeScreen({ navigation }: any) {
  useOnboardingTracking('v2_friend_code');
  const insets = useSafeAreaInsets();
  const { user, signInAnonymous } = useAuth();
  const anims = useScreenEntrance(3);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bgFade = useRef(new Animated.Value(0)).current;

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If no code entered, just skip ahead
    if (!code.trim()) {
      navigation.navigate('V2FakeAnalysis');
      return;
    }

    if (code.length !== 6) {
      setError('Code must be 6 characters');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let uid = user?.uid;
      if (!uid) {
        const cred = await signInAnonymous();
        uid = cred.user.uid;
      }

      const result = await joinRoom(code.toUpperCase(), uid, name.trim());
      if (result.success) {
        try { await identifyTikTokUser(uid); } catch {}
        try { await trackTikTokRoomJoined(); } catch {}
        navigation.navigate('V2FakeAnalysis');
      } else {
        setError(result.error || 'Invalid code');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background image */}
      <Animated.Image
        source={require('../../../assets/images/paywall1.png')}
        style={[styles.bgImage, { opacity: bgFade }]}
        resizeMode="cover"
        onLoad={() => Animated.timing(bgFade, { toValue: 1, duration: 250, useNativeDriver: true }).start()}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.7)', '#000000']}
        style={StyleSheet.absoluteFillObject}
        locations={[0.1, 0.45, 0.8]}
      />

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.spacerTop} />

          <Animated.View
            style={[
              styles.topSection,
              { opacity: anims[0].opacity, transform: anims[0].transform },
            ]}
          >
            <Text style={styles.headline}>Have a Friend's Code?</Text>
            <Text style={styles.subheadline}>
              Enter it below to join their room. When 4 friends join, everyone gets free access.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.inputSection,
              { opacity: anims[1].opacity, transform: anims[1].transform },
            ]}
          >
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                setError('');
              }}
              placeholder="ABC123"
              placeholderTextColor={colorsV2.textMuted}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              textAlign="center"
            />

            {code.length > 0 && (
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError('');
                }}
                placeholder="Your name"
                placeholderTextColor={colorsV2.textMuted}
                autoCorrect={false}
                textAlign="center"
              />
            )}

            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </Animated.View>

          <View style={styles.spacerBottom} />

          <Animated.View
            style={[
              styles.bottomSection,
              { opacity: anims[2].opacity, transform: anims[2].transform },
            ]}
          >
            <GradientButton
              title={submitting ? '...' : 'Continue'}
              onPress={handleContinue}
              disabled={submitting}
            />

            {code.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setCode('');
                  setName('');
                  setError('');
                  navigation.navigate('V2FakeAnalysis');
                }}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacingV2.lg,
  },
  spacerTop: {
    flex: 1,
  },
  topSection: {
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
  },
  inputSection: {
    alignItems: 'center',
  },
  codeInput: {
    ...typographyV2.heading,
    color: colorsV2.textPrimary,
    backgroundColor: colorsV2.surface,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.lg,
    paddingHorizontal: spacingV2.xl,
    paddingVertical: spacingV2.md,
    width: '80%',
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: '700',
  },
  nameInput: {
    ...typographyV2.body,
    color: colorsV2.textPrimary,
    backgroundColor: colorsV2.surface,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.lg,
    paddingHorizontal: spacingV2.lg,
    paddingVertical: spacingV2.md,
    width: '80%',
    marginTop: spacingV2.md,
  },
  errorText: {
    ...typographyV2.bodySmall,
    color: colorsV2.danger,
    marginTop: spacingV2.sm,
    textAlign: 'center',
  },
  spacerBottom: {
    flex: 1,
  },
  bottomSection: {
    alignItems: 'center',
  },
  skipButton: {
    marginTop: spacingV2.md,
    paddingVertical: spacingV2.sm,
  },
  skipText: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
});

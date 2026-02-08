import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useResponsive } from '../../utils/responsive';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function OnboardingSignUpScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { signUp, signInWithApple } = useAuth();
  const { data, updateData } = useOnboarding();
  const responsive = useResponsive();

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Create account
      const userCredential = await signUp(email, password);
      const user = userCredential.user;

      // Save onboarding data to Firestore
      // Remove undefined values (Firestore doesn't allow undefined)
      const signupDate = new Date();
      const photoDay = signupDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      const userData: any = {
        email: user.email,
        concerns: data.selectedCategories || [],
        routineStarted: false,
        signupDate: signupDate.toISOString(),
        photoDay,
        createdAt: signupDate.toISOString(),
      };

      // Only include optional fields if they have values
      if (data.skinType) {
        userData.skinType = data.skinType;
      }
      if (data.budget) {
        userData.budget = data.budget;
      }
      if (data.dailyTime) {
        userData.dailyTime = data.dailyTime;
      }
      if (data.timeAvailability) {
        userData.timeAvailability = data.timeAvailability;
      }
      if (data.experienceLevel) {
        userData.experienceLevel = data.experienceLevel;
      }
      if (data.hasCurrentRoutine !== undefined) {
        userData.hasCurrentRoutine = data.hasCurrentRoutine;
      }

      await setDoc(doc(db, 'users', user.uid), userData);

      // Navigate to plan screen
      navigation.navigate('Shopping');
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to create account';
      
      // Check if account already exists
      if (error.code === 'auth/email-already-in-use' || error.code === 'auth/email-already-exists') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      return;
    }

    setAppleLoading(true);
    try {
      const userCredential = await signInWithApple();
      const user = userCredential.user;

      // Check if user already exists (sign in vs sign up)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Existing user - update with onboarding data if needed
        const userData = userDoc.data();
        if (userData.routineStarted) {
          // Will be handled by RootNavigator
          return;
        } else {
          // Update with current onboarding data
          const updateData: any = {};
          if (data.selectedCategories) {
            updateData.concerns = data.selectedCategories;
          }
          if (data.skinType) {
            updateData.skinType = data.skinType;
          }
          if (data.budget) {
            updateData.budget = data.budget;
          }
          if (data.dailyTime) {
            updateData.dailyTime = data.dailyTime;
          }
          if (data.timeAvailability) {
            updateData.timeAvailability = data.timeAvailability;
          }
          if (data.experienceLevel) {
            updateData.experienceLevel = data.experienceLevel;
          }
          if (data.hasCurrentRoutine !== undefined) {
            updateData.hasCurrentRoutine = data.hasCurrentRoutine;
          }
          
          if (Object.keys(updateData).length > 0) {
            await updateDoc(doc(db, 'users', user.uid), updateData);
          }
          navigation.navigate('Shopping');
        }
      } else {
        // New user - create Firestore document
        const signupDate = new Date();
        const photoDay = signupDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        const userData: any = {
          email: user.email,
          concerns: data.selectedCategories || [],
          routineStarted: false,
          signupDate: signupDate.toISOString(),
          photoDay,
          createdAt: signupDate.toISOString(),
        };

        // Only include optional fields if they have values
        if (data.skinType) {
          userData.skinType = data.skinType;
        }
        if (data.budget) {
          userData.budget = data.budget;
        }
        if (data.dailyTime) {
          userData.dailyTime = data.dailyTime;
        }
        if (data.timeAvailability) {
          userData.timeAvailability = data.timeAvailability;
        }
        if (data.experienceLevel) {
          userData.experienceLevel = data.experienceLevel;
        }
        if (data.hasCurrentRoutine !== undefined) {
          userData.hasCurrentRoutine = data.hasCurrentRoutine;
        }

        await setDoc(doc(db, 'users', user.uid), userData);

        // Navigate to plan screen
        navigation.navigate('Shopping');
      }
    } catch (error: any) {
      if (error.message !== 'Sign in cancelled') {
        Alert.alert('Error', error.message || 'Failed to sign in with Apple');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingHorizontal: responsive.safeHorizontalPadding }]}>
      <Text style={[styles.heading, { fontSize: responsive.font(24) }]}>Create your account.</Text>
      
      <View style={styles.form}>
        <Text style={[styles.label, { fontSize: responsive.font(12) }]}>Email</Text>
        <TextInput
          style={[styles.input, { padding: responsive.sz(16), fontSize: responsive.font(16) }]}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <Text style={[styles.label, { fontSize: responsive.font(12) }]}>Password</Text>
        <TextInput
          style={[styles.input, { padding: responsive.sz(16), fontSize: responsive.font(16) }]}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />

        <AnimatedButton
          style={[styles.button, { padding: responsive.sz(16) }, (loading || appleLoading) && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading || appleLoading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[styles.buttonText, { fontSize: responsive.font(16) }]}>Create Account</Text>
          )}
        </AnimatedButton>

        {Platform.OS === 'ios' && (
          <>
            <View style={styles.divider} />
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={4}
              style={[styles.appleButton, { height: responsive.sz(44) }]}
              onPress={handleAppleSignIn}
              disabled={loading || appleLoading}
            />
          </>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.lg,
    // paddingHorizontal is set dynamically
    justifyContent: 'center',
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.xl,
  },
  form: {
    width: '100%',
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  linkText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  appleButton: {
    width: '100%',
    height: 44,
  },
});


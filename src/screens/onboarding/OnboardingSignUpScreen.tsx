import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function OnboardingSignUpScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [anonymousLoading, setAnonymousLoading] = useState(false);
  const { signUp, signInAnonymous } = useAuth();
  const { data, updateData } = useOnboarding();

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

      await setDoc(doc(db, 'users', user.uid), userData);

      // Navigate to plan screen
      navigation.navigate('Plan');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setAnonymousLoading(true);
    try {
      // Sign in anonymously
      const userCredential = await signInAnonymous();
      const user = userCredential.user;

      // Save onboarding data to Firestore
      // Remove undefined values (Firestore doesn't allow undefined)
      const signupDate = new Date();
      const photoDay = signupDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      const userData: any = {
        email: null, // Anonymous users don't have email
        isAnonymous: true,
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

      await setDoc(doc(db, 'users', user.uid), userData);

      // Navigate to plan screen
      navigation.navigate('Plan');
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to sign in anonymously';
      
      // Provide helpful error message for admin-restricted-operation
      if (error.code === 'auth/admin-restricted-operation' || errorMessage.includes('admin-restricted-operation')) {
        errorMessage = 'Anonymous authentication is not enabled in Firebase Console.\n\nTo enable:\n1. Go to Firebase Console\n2. Authentication → Sign-in method\n3. Enable Anonymous\n4. Click Save';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setAnonymousLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create your account.</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading || anonymousLoading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.button, styles.anonymousButton, anonymousLoading && styles.buttonDisabled]}
          onPress={handleAnonymousSignIn}
          disabled={loading || anonymousLoading}
        >
          {anonymousLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Continue Anonymously (Testing)</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={() => {
            navigation.navigate('OnboardingSignIn');
          }}
          disabled={loading || anonymousLoading}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
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
  anonymousButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
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
});


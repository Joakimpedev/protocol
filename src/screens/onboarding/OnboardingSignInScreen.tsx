import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function OnboardingSignInScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { data } = useOnboarding();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Sign in
      const userCredential = await signIn(email, password);
      const user = userCredential.user;

      // Check if user already has onboarding data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // If they already have a routine started, they'll be navigated to main app
        // Otherwise, navigate to plan screen
        if (userData.routineStarted) {
          // Will be handled by RootNavigator
          return;
        } else {
          // Update with current onboarding data if needed
          // Remove undefined values (Firestore doesn't allow undefined)
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
          
          if (Object.keys(updateData).length > 0) {
            await updateDoc(doc(db, 'users', user.uid), updateData);
          }
          navigation.navigate('Plan');
        }
      } else {
        // New user signing in for first time - save onboarding data
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

        navigation.navigate('Plan');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Sign in.</Text>
      
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
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={() => navigation.navigate('OnboardingSignUp')}
          disabled={loading}
        >
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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


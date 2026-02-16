import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function SignUpScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { signUp, signInWithApple } = useAuth();

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
      await signUp(email, password);
      // Navigation will happen automatically via AuthContext
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
      await signInWithApple();
      // Navigation will happen automatically via AuthContext
    } catch (error: any) {
      if (error.message !== 'Sign in cancelled') {
        Alert.alert('Error', error.message || 'Failed to sign in with Apple');
      }
    } finally {
      setAppleLoading(false);
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
          placeholderTextColor={theme.colors.textMuted}
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
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, (loading || appleLoading) && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading || appleLoading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <>
            <View style={styles.divider} />
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={4}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              disabled={loading || appleLoading}
            />
          </>
        )}

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={() => navigation.navigate('SignIn')}
          disabled={loading || appleLoading}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    heading: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.xl,
    },
    form: {
      width: '100%',
    },
    label: {
      ...theme.typography.label,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    input: {
      ...theme.typography.body,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    button: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      ...theme.typography.body,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.lg,
    },
    linkText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    appleButton: {
      width: '100%',
      height: 44,
    },
  });
}

import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { sendFriendRequest, getUserIdFromFriendCode } from '../services/friendService';

export default function AddFriendScreen({ navigation }: any) {
  const { user } = useAuth();
  const [friendCode, setFriendCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddFriend = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add friends');
      return;
    }

    const trimmedCode = friendCode.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-character friend code');
      return;
    }

    setLoading(true);
    try {
      // Check if friend code exists
      const friendUserId = await getUserIdFromFriendCode(trimmedCode);
      if (!friendUserId) {
        Alert.alert('Error', 'Friend code not found');
        setLoading(false);
        return;
      }

      // Send friend request
      await sendFriendRequest(user.uid, trimmedCode);
      Alert.alert('Success', 'Friend request sent! Your friend will see it in their pending requests.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.heading}>Add Friend</Text>
        <Text style={styles.subheading}>Enter your friend's 6-character code</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={friendCode}
          onChangeText={(text) => setFriendCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABCD12"
          placeholderTextColor={colors.textMuted}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAddFriend}
        disabled={loading || !friendCode.trim()}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Send Request</Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Your friend code is displayed in the Social tab. Share it with others to connect.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 120,
  },
  header: {
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  subheading: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    ...typography.headingSmall,
    fontFamily: MONOSPACE_FONT,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  infoContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});






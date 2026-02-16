/**
 * Referral Modal Component
 *
 * Bottom sheet modal for referral system
 * - Shows user's invite code
 * - "Got a code?" button to enter friend's code
 * - "Check Status" button to see if eligible for free trial
 */

import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';

interface ReferralModalProps {
  visible: boolean;
  onClose: () => void;
  userCode: string;
  onEnterCode: (code: string) => Promise<{ success: boolean; error?: string; appliedLater?: boolean }>;
  onCheckStatus: () => Promise<{ eligible: boolean; message: string }>;
  waitingForFriend?: boolean;
  hasUsedCode?: boolean;
  initialMode?: 'share' | 'enter';
}

export default function ReferralModal({
  visible,
  onClose,
  userCode,
  onEnterCode,
  onCheckStatus,
  waitingForFriend = false,
  hasUsedCode = false,
  initialMode = 'share',
}: ReferralModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [viewMode, setViewMode] = useState<'share' | 'enter'>(initialMode);
  const [inputCode, setInputCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  // Sync viewMode with initialMode when modal opens
  useEffect(() => {
    if (visible) {
      setViewMode(initialMode);
    }
  }, [visible, initialMode]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join Protocol with my code: ${userCode}\n\nWe both get 7 days free!\n\nhttps://apps.apple.com/app/protocol-mens-face-routine/id6757006000`,
      });
    } catch (error) {
      console.warn('Share failed:', error);
    }
  };

  const handleCopyCode = () => {
    Clipboard.setString(userCode);
    Alert.alert('Copied', `Code ${userCode} copied to clipboard`);
  };

  const handleEnterCode = async () => {
    if (!inputCode || inputCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-character code');
      return;
    }

    if (hasUsedCode) {
      Alert.alert('Already Used', 'You have already used a referral code. Each account can only use one code.');
      return;
    }

    setSubmitting(true);
    const result = await onEnterCode(inputCode.toUpperCase());
    setSubmitting(false);

    if (result.success) {
      const message = result.appliedLater
        ? 'Your code is saved. When you start your trial it will be applied and you both get 7 days free.'
        : 'Start your trial now to unlock 7 days free for both you and your friend';
      Alert.alert(
        result.appliedLater ? 'Code Saved!' : 'Code Applied!',
        message,
        [{ text: 'OK', onPress: () => {
          setViewMode('share');
          setInputCode('');
          onClose();
        }}]
      );
    } else {
      Alert.alert('Invalid Code', result.error || 'Code not found or already used');
    }
  };

  const toggleViewMode = () => {
    if (hasUsedCode) return; // Can't toggle if already used code
    setViewMode(viewMode === 'share' ? 'enter' : 'share');
    setInputCode(''); // Clear input when toggling
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    const result = await onCheckStatus();
    setChecking(false);

    if (result.eligible) {
      onClose();
    } else {
      Alert.alert('Not Yet', result.message, [{ text: 'OK' }]);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <View style={styles.topBar}>
              <View style={styles.handle} />
            </View>

          {/* Action buttons row - only show Check Status in share mode */}
          {viewMode === 'share' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, checking && styles.actionButtonDisabled]}
                onPress={handleCheckStatus}
                disabled={checking}
              >
                <Text style={styles.actionButtonText}>
                  {checking ? 'Checking...' : 'Check Status'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Already used badge */}
          {hasUsedCode && (
            <View style={styles.usedBadge}>
              <Text style={styles.usedText}>You've already used a referral code</Text>
            </View>
          )}

          {/* SHARE MODE: Show invite code */}
          {viewMode === 'share' && (
            <View style={styles.contentSection}>
              <Text style={styles.contentTitle}>Share your invite code</Text>
              <Text style={styles.contentSubtitle}>
                {waitingForFriend
                  ? 'Waiting for your friend to start their trial...'
                  : 'Invite 1 friend. Both get 7 days free'}
              </Text>

              {/* Code display */}
              <View style={styles.codeContainer}>
                <Text style={styles.code}>{userCode || 'LOADING'}</Text>
              </View>

              <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                <Text style={styles.copyButtonText}>Copy Code</Text>
              </TouchableOpacity>

              {/* Waiting indicator */}
              {waitingForFriend && (
                <View style={styles.waitingBadge}>
                  <Text style={styles.waitingText}>Friend claimed - waiting for trial start</Text>
                </View>
              )}

              {/* Share button */}
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ENTER MODE: Input friend's code */}
          {viewMode === 'enter' && !hasUsedCode && (
            <View style={styles.contentSection}>
              <Text style={styles.contentTitle}>Enter your friend's code</Text>
              <Text style={styles.contentSubtitle}>
                Enter friend's code to unlock 7 days free
              </Text>

              <TextInput
                style={styles.input}
                value={inputCode}
                onChangeText={(text) => setInputCode(text.toUpperCase())}
                placeholder="ABC123"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleEnterCode}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Checking...' : 'Apply Code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    keyboardAvoidingView: {
      flex: 1,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: theme.spacing.xl,
      minHeight: 400,
    },
    topBar: {
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
    },
    actionRow: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl, // Increased spacing before content
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionButtonText: {
      ...theme.typography.body,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    usedBadge: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    usedText: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    contentSection: {
      paddingHorizontal: theme.spacing.lg,
    },
    contentTitle: {
      ...theme.typography.headingSmall,
      fontSize: 24,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    contentSubtitle: {
      ...theme.typography.bodySmall,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    input: {
      ...theme.typography.body,
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 20,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    submitButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      ...theme.typography.body,
      fontSize: 17,
      fontWeight: '600',
      color: '#000',
    },
    codeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing.sm,
    },
    code: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 4,
    },
    copyButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      alignSelf: 'center',
      marginBottom: theme.spacing.md,
    },
    copyButtonText: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.textSecondary,
      textDecorationLine: 'underline',
    },
    waitingBadge: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: 8,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    waitingText: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.accent,
      textAlign: 'center',
    },
    shareButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    shareButtonText: {
      ...theme.typography.body,
      fontSize: 17,
      fontWeight: '600',
      color: '#000',
    },
  });
}

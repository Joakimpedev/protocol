/**
 * Referral Modal Component
 *
 * Bottom sheet modal for referral system
 * - Shows user's invite code
 * - "Got a code?" button to enter friend's code
 * - "Check Status" button to see if eligible for free trial
 */

import { useState, useEffect } from 'react';
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
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';

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
                placeholderTextColor={colors.textMuted}
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

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
    minHeight: 400,
  },
  topBar: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl, // Increased spacing before content
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  usedBadge: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usedText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  contentSection: {
    paddingHorizontal: spacing.lg,
  },
  contentTitle: {
    ...typography.headingSmall,
    fontSize: 24,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  contentSubtitle: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    ...typography.body,
    fontFamily: MONOSPACE_FONT,
    fontSize: 20,
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  codeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  code: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 4,
  },
  copyButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  copyButtonText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  waitingBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  waitingText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.accent,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
});

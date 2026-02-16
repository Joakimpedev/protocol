import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
import GradientButton from './GradientButton';
import {
  createRoom,
  getUserRoom,
  joinRoom,
  devFillRoom,
  ReferralRoom,
} from '../../services/referralService';
import { useAuth } from '../../contexts/AuthContext';
import { useDevMode } from '../../contexts/DevModeContext';

interface RoomModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToReferralPaywall: () => void;
}

export default function RoomModal({
  visible,
  onClose,
  onNavigateToReferralPaywall,
}: RoomModalProps) {
  const { user, signInAnonymous } = useAuth();
  const { isDevModeEnabled } = useDevMode();
  const [mode, setMode] = useState<'create' | 'room'>('create');
  const [room, setRoom] = useState<ReferralRoom | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // "Got a code?" state
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeNameInput, setCodeNameInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);

  /** Ensure we have an authenticated uid, signing in anonymously if needed */
  const ensureUid = async (): Promise<string> => {
    if (user?.uid) return user.uid;
    const cred = await signInAnonymous();
    return cred.user.uid;
  };

  useEffect(() => {
    if (!visible) {
      // Reset code entry state when modal closes
      setShowCodeEntry(false);
      setCodeInput('');
      setCodeNameInput('');
      setCodeError('');
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const uid = await ensureUid();
        const existingRoom = await getUserRoom(uid);
        if (cancelled) return;
        if (existingRoom) {
          setRoom(existingRoom);
          setMode('room');
        } else {
          setMode('create');
          setRoom(null);
        }
      } catch (e) {
        console.warn('[RoomModal] Failed to fetch room:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible]);

  const handleCreateRoom = async () => {
    if (!nameInput.trim()) return;
    setCreating(true);
    try {
      const uid = await ensureUid();
      const newRoom = await createRoom(uid, nameInput.trim());
      setRoom(newRoom);
      setMode('room');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('[RoomModal] Failed to create room:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!codeInput || codeInput.length !== 6) {
      setCodeError('Code must be 6 characters');
      return;
    }
    if (!codeNameInput.trim()) {
      setCodeError('Please enter your name');
      return;
    }

    setJoiningRoom(true);
    setCodeError('');

    try {
      const uid = await ensureUid();
      const result = await joinRoom(codeInput.toUpperCase(), uid, codeNameInput.trim());
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Refresh to show the room they just joined
        const joinedRoom = await getUserRoom(uid);
        if (joinedRoom) {
          setRoom(joinedRoom);
          setMode('room');
        }
        setShowCodeEntry(false);
        setCodeInput('');
        setCodeNameInput('');
      } else {
        setCodeError(result.error || 'Invalid code');
      }
    } catch (e: any) {
      setCodeError(e.message || 'Something went wrong');
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleCopyCode = async () => {
    if (!room) return;
    Clipboard.setString(room.code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShare = async () => {
    if (!room) return;
    try {
      await Share.share({
        message: `Join my room on Protocol with code: ${room.code}\n\nWhen 4 friends join, everyone gets free access!\n\nhttps://apps.apple.com/app/protocol-mens-face-routine/id6757006000`,
      });
    } catch (e) {
      console.warn('[RoomModal] Share failed:', e);
    }
  };

  const handleClaimTrial = () => {
    onClose();
    onNavigateToReferralPaywall();
  };

  const handleDevFillRoom = async () => {
    try {
      const uid = await ensureUid();
      const filled = await devFillRoom(uid);
      if (filled) {
        setRoom(filled);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.warn('[RoomModal] Dev fill failed:', e);
    }
  };

  const neededCount = room ? Math.max(0, 4 - room.memberCount) : 4;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
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
            {/* Handle */}
            <View style={styles.topBar}>
              <View style={styles.handle} />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colorsV2.textPrimary} />
              </View>
            ) : mode === 'create' ? (
              /* ── Create Room Mode ── */
              <View style={styles.contentSection}>
                {!showCodeEntry ? (
                  <>
                    <Text style={styles.title}>Create a Room</Text>
                    <Text style={styles.subtitle}>
                      Start a room and invite 3 friends. When all 4 join, everyone gets free access.
                    </Text>

                    <TextInput
                      style={styles.nameInput}
                      value={nameInput}
                      onChangeText={setNameInput}
                      placeholder="Your name"
                      placeholderTextColor={colorsV2.textMuted}
                      autoCorrect={false}
                      textAlign="center"
                    />

                    <GradientButton
                      title={creating ? '...' : 'Create Room'}
                      onPress={handleCreateRoom}
                      disabled={creating || !nameInput.trim()}
                    />

                    {/* Divider */}
                    <View style={styles.orDivider}>
                      <View style={styles.orDividerLine} />
                      <Text style={styles.orDividerText}>OR</Text>
                      <View style={styles.orDividerLine} />
                    </View>

                    {/* Got a code? button */}
                    <TouchableOpacity
                      style={styles.gotCodeButton}
                      onPress={() => setShowCodeEntry(true)}
                    >
                      <Text style={styles.gotCodeButtonText}>Got a friend's code?</Text>
                      <Text style={styles.gotCodeButtonSubtext}>Enter it to join their room</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.title}>Join a Room</Text>
                    <Text style={styles.subtitle}>
                      Enter your friend's code to join their room.
                    </Text>

                    <TextInput
                      style={styles.codeInput}
                      value={codeInput}
                      onChangeText={(text) => {
                        setCodeInput(text.toUpperCase());
                        setCodeError('');
                      }}
                      placeholder="ABC123"
                      placeholderTextColor={colorsV2.textMuted}
                      maxLength={6}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      textAlign="center"
                    />

                    {codeInput.length > 0 && (
                      <TextInput
                        style={styles.nameInput}
                        value={codeNameInput}
                        onChangeText={(text) => {
                          setCodeNameInput(text);
                          setCodeError('');
                        }}
                        placeholder="Your name"
                        placeholderTextColor={colorsV2.textMuted}
                        autoCorrect={false}
                        textAlign="center"
                      />
                    )}

                    {!!codeError && (
                      <Text style={styles.codeErrorText}>{codeError}</Text>
                    )}

                    <GradientButton
                      title={joiningRoom ? '...' : 'Join Room'}
                      onPress={handleJoinRoom}
                      disabled={joiningRoom}
                    />

                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => {
                        setShowCodeEntry(false);
                        setCodeInput('');
                        setCodeNameInput('');
                        setCodeError('');
                      }}
                    >
                      <Text style={styles.backButtonText}>Create your own room instead</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              /* ── Room View Mode ── */
              <View style={styles.contentSection}>
                {room?.isUnlocked && (
                  <View style={styles.unlockedBanner}>
                    <Text style={styles.unlockedText}>Room Unlocked!</Text>
                  </View>
                )}

                <Text style={styles.title}>Your Room</Text>

                {/* Code display */}
                <TouchableOpacity onPress={handleCopyCode} style={styles.codeContainer}>
                  <Text style={styles.codeText}>{room?.code || '------'}</Text>
                  <Text style={styles.tapToCopy}>Tap to copy</Text>
                </TouchableOpacity>

                {/* Member list */}
                <View style={styles.memberList}>
                  {Array.from({ length: 4 }).map((_, i) => {
                    const member = room?.members[i];
                    return (
                      <View key={i} style={styles.memberRow}>
                        <View style={[styles.memberDot, member ? styles.memberDotFilled : null]} >
                          {member && <Text style={styles.memberCheck}>{'\u2713'}</Text>}
                        </View>
                        <Text style={[styles.memberName, !member && styles.memberNameEmpty]}>
                          {member ? member.name : 'Waiting...'}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {!room?.isUnlocked && (
                  <Text style={styles.neededText}>
                    {neededCount} more friend{neededCount !== 1 ? 's' : ''} needed
                  </Text>
                )}

                {/* Dev: fill spots */}
                {isDevModeEnabled && !room?.isUnlocked && (
                  <TouchableOpacity style={styles.devFillButton} onPress={handleDevFillRoom}>
                    <Text style={styles.devFillButtonText}>DEV: Fill all spots</Text>
                  </TouchableOpacity>
                )}

                {/* Actions */}
                {room?.isUnlocked ? (
                  <GradientButton
                    title="Claim Free Trial"
                    onPress={handleClaimTrial}
                  />
                ) : (
                  <GradientButton
                    title="Share Code"
                    onPress={handleShare}
                  />
                )}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colorsV2.surface,
    borderTopLeftRadius: borderRadiusV2.xl,
    borderTopRightRadius: borderRadiusV2.xl,
    paddingBottom: spacingV2.xl,
    minHeight: 400,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderBottomWidth: 0,
  },
  topBar: {
    alignItems: 'center',
    paddingTop: spacingV2.sm,
    paddingBottom: spacingV2.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colorsV2.textMuted,
    borderRadius: 2,
  },
  loadingContainer: {
    padding: spacingV2.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    paddingHorizontal: spacingV2.lg,
  },
  title: {
    ...typographyV2.heading,
    textAlign: 'center',
    marginBottom: spacingV2.xs,
  },
  subtitle: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    marginBottom: spacingV2.lg,
  },
  nameInput: {
    ...typographyV2.body,
    color: colorsV2.textPrimary,
    backgroundColor: colorsV2.surfaceLight,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.lg,
    paddingHorizontal: spacingV2.lg,
    paddingVertical: spacingV2.md,
    marginBottom: spacingV2.lg,
  },
  // "Or" divider
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacingV2.lg,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colorsV2.border,
  },
  orDividerText: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    marginHorizontal: spacingV2.md,
    letterSpacing: 1,
  },
  // "Got a code?" button
  gotCodeButton: {
    backgroundColor: colorsV2.surfaceLight,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.lg,
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.lg,
    alignItems: 'center',
  },
  gotCodeButtonText: {
    ...typographyV2.body,
    fontWeight: '600',
    color: colorsV2.accentPurple,
    marginBottom: 2,
  },
  gotCodeButtonSubtext: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  // Code entry input
  codeInput: {
    ...typographyV2.heading,
    color: colorsV2.textPrimary,
    backgroundColor: colorsV2.surfaceLight,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.lg,
    paddingHorizontal: spacingV2.xl,
    paddingVertical: spacingV2.md,
    marginBottom: spacingV2.md,
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: '700',
  },
  codeErrorText: {
    ...typographyV2.bodySmall,
    color: colorsV2.danger,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  backButton: {
    marginTop: spacingV2.md,
    paddingVertical: spacingV2.sm,
    alignItems: 'center',
  },
  backButtonText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textMuted,
  },
  // Code display
  codeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: borderRadiusV2.lg,
    paddingVertical: spacingV2.lg,
    paddingHorizontal: spacingV2.xl,
    marginBottom: spacingV2.lg,
    borderWidth: 1,
    borderColor: colorsV2.border,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    color: colorsV2.textPrimary,
    letterSpacing: 6,
  },
  tapToCopy: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    marginTop: spacingV2.xs,
  },
  // Members
  memberList: {
    marginBottom: spacingV2.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingV2.sm,
    borderBottomWidth: 1,
    borderBottomColor: colorsV2.border,
  },
  memberDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colorsV2.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingV2.md,
  },
  memberDotFilled: {
    backgroundColor: colorsV2.success,
    borderColor: colorsV2.success,
  },
  memberCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  memberName: {
    ...typographyV2.body,
    color: colorsV2.textPrimary,
  },
  memberNameEmpty: {
    color: colorsV2.textMuted,
    fontStyle: 'italic',
  },
  neededText: {
    ...typographyV2.bodySmall,
    color: colorsV2.accentOrange,
    textAlign: 'center',
    marginBottom: spacingV2.lg,
    fontWeight: '600',
  },
  // Dev fill button
  devFillButton: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderRadius: borderRadiusV2.sm,
    paddingVertical: spacingV2.sm,
    paddingHorizontal: spacingV2.md,
    alignItems: 'center',
    marginBottom: spacingV2.md,
  },
  devFillButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colorsV2.accentPurple,
  },
  // Unlocked banner
  unlockedBanner: {
    backgroundColor: colorsV2.success + '20',
    borderWidth: 1,
    borderColor: colorsV2.success,
    borderRadius: borderRadiusV2.md,
    paddingVertical: spacingV2.sm,
    paddingHorizontal: spacingV2.md,
    marginBottom: spacingV2.md,
    alignItems: 'center',
  },
  unlockedText: {
    ...typographyV2.body,
    color: colorsV2.success,
    fontWeight: '700',
  },
});

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import PaywallModal from '../components/PaywallModal';
import {
  getFriends,
  getPendingFriendRequests,
  acceptFriendRequest,
  removeFriend,
  toggleMuteFriend,
  getOrCreateFriendCode,
  subscribeToFriends,
  FriendProfile,
} from '../services/friendService';

export default function FriendsListScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendProfile[]>([]);
  const [myFriendCode, setMyFriendCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Load initial data
    const loadData = async () => {
      try {
        const [friendsList, requests, code] = await Promise.all([
          getFriends(user.uid),
          getPendingFriendRequests(user.uid),
          getOrCreateFriendCode(user.uid),
        ]);
        setFriends(friendsList);
        setPendingRequests(requests);
        setMyFriendCode(code);
      } catch (error) {
        console.error('Error loading friends data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to friends changes
    const unsubscribe = subscribeToFriends(user.uid, (updatedFriends) => {
      setFriends(updatedFriends);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptRequest = async (friendId: string) => {
    if (!user) return;

    try {
      await acceptFriendRequest(user.uid, friendId);
      // Reload pending requests
      const requests = await getPendingFriendRequests(user.uid);
      setPendingRequests(requests);
      // Reload friends
      const friendsList = await getFriends(user.uid);
      setFriends(friendsList);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept friend request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(user.uid, friendId);
              const friendsList = await getFriends(user.uid);
              setFriends(friendsList);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleToggleMute = async (friendId: string, currentlyMuted: boolean) => {
    if (!user) return;

    try {
      await toggleMuteFriend(user.uid, friendId, !currentlyMuted);
      const friendsList = await getFriends(user.uid);
      setFriends(friendsList);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update mute setting');
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <Image 
          source={require('../../assets/icons/gear.png')} 
          style={styles.settingsButtonIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.heading}>Social</Text>
        </View>

      {/* My Friend Code */}
      <View style={styles.friendCodeContainer}>
        <Text style={styles.friendCodeLabel}>Your Friend Code</Text>
        <Text style={styles.friendCode}>{myFriendCode}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddFriend')}
        >
          <Text style={styles.addButtonText}>+ Add Friend</Text>
        </TouchableOpacity>
      </View>

      {/* Public Stats Card */}
      <TouchableOpacity
        style={styles.publicStatsCard}
        onPress={() => {
          if (isPremium) {
            navigation.navigate('PublicStats');
          } else {
            setShowPaywall(true);
          }
        }}
      >
        <View style={styles.publicStatsContent}>
          <View style={styles.publicStatsTextContainer}>
            <Text style={styles.publicStatsTitle}>See how you rank</Text>
            <Text style={styles.publicStatsSubtitle}>Compare your consistency score</Text>
          </View>
          <Image 
            source={require('../../assets/icons/leaderboard.png')} 
            style={styles.leaderboardIcon}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          {pendingRequests.map((request) => (
            <View key={request.userId} style={styles.friendCard}>
              <View style={styles.friendInfo}>
                <Text style={styles.friendEmail}>{request.email || 'Unknown'}</Text>
                <Text style={styles.friendCodeText}>Code: {request.friendCode}</Text>
              </View>
              <View style={styles.friendActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(request.userId)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Friends List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
        {friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No friends yet.</Text>
            <Text style={styles.emptyStateSubtext}>Add friends to see their progress.</Text>
          </View>
        ) : (
          friends.map((friend) => (
            <View key={friend.userId} style={styles.friendCard}>
              <View style={styles.friendInfo}>
                <View style={styles.friendHeader}>
                  <Text style={styles.friendEmail}>{friend.email || 'Unknown'}</Text>
                  {friend.muted && (
                    <Text style={styles.mutedBadge}>Muted</Text>
                  )}
                </View>
                <Text style={styles.friendCodeText}>Code: {friend.friendCode}</Text>
                <View style={styles.friendStats}>
                  <Text style={styles.statText}>
                    Last completed: {formatDate(friend.lastCompletionDate)}
                  </Text>
                  {friend.weeklyConsistency !== undefined && (
                    <Text style={styles.statText}>
                      This week: {friend.weeklyConsistency}%
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.friendActions}>
                <TouchableOpacity
                  style={styles.muteButton}
                  onPress={() => handleToggleMute(friend.userId, friend.muted)}
                >
                  <Text style={styles.muteButtonText}>
                    {friend.muted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFriend(friend.userId)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
      </ScrollView>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={() => {
          setShowPaywall(false);
          navigation.navigate('PublicStats');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 120,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonIcon: {
    width: 24,
    height: 24,
    tintColor: colors.text,
  },
  header: {
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.heading,
  },
  friendCodeContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  friendCodeLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  friendCode: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  addButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
  },
  friendCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  friendInfo: {
    marginBottom: spacing.sm,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  friendEmail: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  mutedBadge: {
    ...typography.bodySmall,
    color: colors.textMuted,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 2,
  },
  friendCodeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  friendStats: {
    marginTop: spacing.xs,
  },
  statText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  friendActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
    padding: spacing.sm,
    flex: 1,
    alignItems: 'center',
  },
  acceptButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.accent,
  },
  muteButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.sm,
    flex: 1,
    alignItems: 'center',
  },
  muteButtonText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  removeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 4,
    padding: spacing.sm,
    flex: 1,
    alignItems: 'center',
  },
  removeButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.error,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  publicStatsCard: {
    backgroundColor: colors.buttonAccent,
    borderWidth: 1,
    borderColor: colors.buttonAccent,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  publicStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  publicStatsTextContainer: {
    flex: 1,
  },
  publicStatsTitle: {
    ...typography.body,
    fontFamily: MONOSPACE_FONT,
    fontWeight: '600',
    color: '#000000',
    marginBottom: spacing.xs,
  },
  publicStatsSubtitle: {
    ...typography.bodySmall,
    color: '#000000',
  },
  leaderboardIcon: {
    width: 45,
    height: 45,
    marginLeft: spacing.md,
    tintColor: '#000000',
  },
});



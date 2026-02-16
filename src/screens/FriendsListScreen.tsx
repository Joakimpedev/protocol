import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import PaywallModal from '../components/PaywallModal';
import NamePromptModal from '../components/NamePromptModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  getFriends,
  getPendingFriendRequests,
  acceptFriendRequest,
  removeFriend,
  toggleMuteFriend,
  getOrCreateFriendCode,
  subscribeToFriends,
  subscribeToPendingRequests,
  FriendProfile,
} from '../services/friendService';

export default function FriendsListScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const isPro = theme.key === 'pro';

  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendProfile[]>([]);
  const [myFriendCode, setMyFriendCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [checkingName, setCheckingName] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setCheckingName(false);
      return;
    }

    // Check if user has a display name
    const checkDisplayName = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (!userData.displayName) {
            setShowNamePrompt(true);
          }
        } else {
          setShowNamePrompt(true);
        }
      } catch (error) {
        console.error('Error checking display name:', error);
      } finally {
        setCheckingName(false);
      }
    };

    checkDisplayName();

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

    // Subscribe to pending requests changes
    const pendingRequestsUnsubscribe = subscribeToPendingRequests(user.uid, (updatedRequests) => {
      setPendingRequests(updatedRequests);
    });

    return () => {
      unsubscribe();
      pendingRequestsUnsubscribe();
    };
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
      setMenuVisible(false);
      setSelectedFriend(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update mute setting');
    }
  };

  const handleOpenMenu = (friend: FriendProfile) => {
    setSelectedFriend(friend);
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedFriend(null);
  };

  const handleMenuMute = () => {
    if (selectedFriend && user) {
      handleToggleMute(selectedFriend.userId, selectedFriend.muted);
    }
  };

  const handleMenuRemove = () => {
    if (selectedFriend && user) {
      handleRemoveFriend(selectedFriend.userId);
      setMenuVisible(false);
      setSelectedFriend(null);
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
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  const renderPublicStatsCard = () => {
    const cardContent = (
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
    );

    if (isPro) {
      return (
        <TouchableOpacity
          onPress={() => {
            if (isPremium) {
              navigation.navigate('PublicStats');
            } else {
              setShowPaywall(true);
            }
          }}
        >
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.publicStatsCard}
          >
            {cardContent}
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    return (
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
        {cardContent}
      </TouchableOpacity>
    );
  };

  const renderAddButton = () => {
    if (isPro) {
      return (
        <TouchableOpacity onPress={() => navigation.navigate('AddFriend')}>
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <Text style={styles.addButtonTextPro}>+ Add Friend</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddFriend')}
      >
        <Text style={styles.addButtonText}>+ Add Friend</Text>
      </TouchableOpacity>
    );
  };

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
        {renderAddButton()}
      </View>

      {/* Public Stats Card */}
      {renderPublicStatsCard()}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          {pendingRequests.map((request) => (
            <View key={request.userId} style={styles.friendCard}>
              <View style={styles.friendInfo}>
                <Text style={styles.friendEmail}>{request.displayName || request.email || 'Unknown'}</Text>
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
                  <Text style={styles.friendEmail}>{friend.displayName || friend.email || 'Unknown'}</Text>
                  {friend.muted && (
                    <Text style={styles.mutedBadge}>Muted</Text>
                  )}
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => handleOpenMenu(friend)}
                  >
                    <Text style={styles.menuButtonText}>⋯</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.friendCodeText}>Code: {friend.friendCode}</Text>
                <View style={styles.friendStats}>
                  <Text style={styles.statText}>
                    Last completed: {formatDate(friend.lastCompletionDate)}
                  </Text>
                  {friend.weeklyConsistency !== undefined && (
                    <Text style={styles.statText}>
                      Score this week: {friend.weeklyConsistency.toFixed(1)}
                    </Text>
                  )}
                </View>
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
      <NamePromptModal
        visible={showNamePrompt && !checkingName}
        userId={user?.uid || ''}
        onNameSet={() => {
          setShowNamePrompt(false);
          // Reload friends to show updated name
          if (user) {
            getFriends(user.uid).then(setFriends);
            getPendingFriendRequests(user.uid).then(setPendingRequests);
          }
        }}
      />
      {/* Friend Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={handleCloseMenu}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleMenuMute}
            >
              <Text style={styles.menuItemText}>
                {selectedFriend?.muted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleMenuRemove}
            >
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
      paddingTop: 120,
    },
    settingsButton: {
      position: 'absolute',
      top: 60,
      right: theme.spacing.lg,
      zIndex: 1000,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsButtonIcon: {
      width: 24,
      height: 24,
      tintColor: theme.colors.text,
    },
    header: {
      marginBottom: theme.spacing.xl,
    },
    heading: {
      ...theme.typography.heading,
    },
    friendCodeContainer: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      alignItems: 'center',
    },
    friendCodeLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    friendCode: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 32,
      fontWeight: '600',
      color: theme.colors.text,
      letterSpacing: 4,
      marginBottom: theme.spacing.lg,
    },
    addButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      width: '100%',
      alignItems: 'center',
    },
    addButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    addButtonGradient: {
      borderRadius: theme.borderRadius.pill,
      padding: theme.spacing.md,
      width: '100%',
      alignItems: 'center',
    },
    addButtonTextPro: {
      ...theme.typography.body,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.md,
    },
    friendCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    friendInfo: {
      marginBottom: theme.spacing.sm,
    },
    friendHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    friendEmail: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    menuButton: {
      padding: theme.spacing.xs,
      marginLeft: theme.spacing.sm,
    },
    menuButtonText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
      lineHeight: 24,
    },
    mutedBadge: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: 2,
    },
    friendCodeText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    friendStats: {
      marginTop: theme.spacing.xs,
    },
    statText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    friendActions: {},
    acceptButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      flex: 1,
      alignItems: 'center',
    },
    acceptButtonText: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuContainer: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      minWidth: 200,
      overflow: 'hidden',
    },
    menuItem: {
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    menuItemText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    menuItemTextDanger: {
      color: theme.colors.error,
      fontWeight: '600',
    },
    menuDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
    },
    emptyState: {
      padding: theme.spacing.xl,
      alignItems: 'center',
    },
    emptyStateText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    emptyStateSubtext: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
    },
    publicStatsCard: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.xl,
      overflow: 'hidden',
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
      ...theme.typography.body,
      fontFamily: theme.typography.heading.fontFamily,
      fontWeight: '600',
      color: '#000000',
      marginBottom: theme.spacing.xs,
    },
    publicStatsSubtitle: {
      ...theme.typography.bodySmall,
      color: '#000000',
    },
    leaderboardIcon: {
      width: 45,
      height: 45,
      marginLeft: theme.spacing.md,
      tintColor: '#000000',
    },
  });
}

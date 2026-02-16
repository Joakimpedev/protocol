import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes/types';
import { useDevMode } from '../contexts/DevModeContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { clearUserRoom } from '../services/referralService';
import { clearPreloadedAssets } from '../utils/onboardingAssetPreloader';

/**
 * Single dev menu button for onboarding. When pressed, opens a modal with:
 * - Previous Page
 * - Back to Start
 * - Go to start of paywall (TrialOffer)
 */
export function OnboardingDevMenu() {
  const navigation = useNavigation<any>();
  const { isDevModeEnabled, hideDevToolsInOnboarding, simulateFriendUsedReferral, setSimulateFriendUsedReferral } = useDevMode();
  const { reset } = useOnboarding();
  const { user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const canGoBack = navigation.canGoBack();

  if (!isDevModeEnabled || hideDevToolsInOnboarding) return null;

  const goPrevious = () => {
    setMenuVisible(false);
    if (canGoBack) {
      navigation.goBack();
    }
  };

  const goBackToStart = async () => {
    setMenuVisible(false);
    reset();
    clearPreloadedAssets();
    if (user?.uid) {
      await clearUserRoom(user.uid).catch(() => {});
    }
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const goToPaywallStart = () => {
    setMenuVisible(false);
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('OnboardingFlow', { screen: 'TrialPaywall' });
    } else {
      navigation.navigate('TrialPaywall');
    }
  };

  const toggleSimulateFriendUsedReferral = () => {
    setSimulateFriendUsedReferral(!simulateFriendUsedReferral);
  };

  return (
    <>
      <View style={styles.devSection}>
        <TouchableOpacity
          style={styles.devMenuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.devMenuButtonText}>Dev menu</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuTitle}>Dev options</Text>
            <TouchableOpacity
              style={[styles.menuItem, !canGoBack && styles.menuItemDisabled]}
              onPress={goPrevious}
              disabled={!canGoBack}
            >
              <Text style={[styles.menuItemText, !canGoBack && styles.menuItemTextDisabled]}>
                ← Previous Page
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={goBackToStart}>
              <Text style={styles.menuItemText}>Back to Start</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={goToPaywallStart}>
              <Text style={styles.menuItemText}>Go to start of paywall</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={toggleSimulateFriendUsedReferral}>
              <Text style={styles.menuItemText}>
                Simulate friend used my code: {simulateFriendUsedReferral ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItemCancel} onPress={() => setMenuVisible(false)}>
              <Text style={styles.menuItemTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  devSection: {
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  devMenuButton: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  devMenuButtonText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  menuBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: theme.spacing.sm,
    minWidth: 220,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  menuItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  menuItemText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemTextDisabled: {
    color: theme.colors.textMuted,
  },
  menuItemCancel: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  menuItemTextCancel: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

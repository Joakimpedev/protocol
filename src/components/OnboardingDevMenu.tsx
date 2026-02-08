import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../constants/theme';
import { useDevMode } from '../contexts/DevModeContext';
import { useOnboarding } from '../contexts/OnboardingContext';

/**
 * Single dev menu button for onboarding. When pressed, opens a modal with:
 * - Previous Page
 * - Back to Start
 * - Go to start of paywall (TrialOffer)
 */
export function OnboardingDevMenu() {
  const navigation = useNavigation<any>();
  const { isDevModeEnabled } = useDevMode();
  const { reset } = useOnboarding();
  const [menuVisible, setMenuVisible] = useState(false);

  const canGoBack = navigation.canGoBack();

  const goPrevious = () => {
    setMenuVisible(false);
    if (canGoBack) {
      navigation.goBack();
    }
  };

  const goBackToStart = () => {
    setMenuVisible(false);
    reset();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const goToPaywallStart = () => {
    setMenuVisible(false);
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('OnboardingFlow', { screen: 'TrialOffer' });
    } else {
      navigation.navigate('TrialOffer');
    }
  };

  if (!isDevModeEnabled) return null;

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
            <TouchableOpacity style={styles.menuItemCancel} onPress={() => setMenuVisible(false)}>
              <Text style={styles.menuItemTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  devSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  devMenuButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  devMenuButtonText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    minWidth: 220,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  menuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemText: {
    fontSize: 15,
    color: colors.text,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemTextDisabled: {
    color: colors.textMuted,
  },
  menuItemCancel: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuItemTextCancel: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

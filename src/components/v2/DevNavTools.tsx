import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useDevMode } from '../../contexts/DevModeContext';
import { useAuth } from '../../contexts/AuthContext';
import { clearFaceAnalysisCache } from '../../services/faceAnalysisService';
import { clearPreloadedAssets } from '../../utils/onboardingAssetPreloader';
import { clearUserRoom } from '../../services/referralService';
import { colorsV2 } from '../../constants/themeV2';

interface DevNavToolsProps {
  screenOrder: string[];
  currentScreenIndex: number;
}

export default function DevNavTools({ screenOrder, currentScreenIndex }: DevNavToolsProps) {
  const { isDevModeEnabled, hideDevToolsInOnboarding } = useDevMode();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  if (!isDevModeEnabled || hideDevToolsInOnboarding) return null;

  const handlePrevious = () => {
    if (currentScreenIndex > 0) {
      const prevScreen = screenOrder[currentScreenIndex - 1];
      navigation.dispatch(
        CommonActions.navigate({ name: prevScreen })
      );
    }
  };

  const handleBackToStart = async () => {
    // Clear cached face analysis and preloaded images so everything runs fresh
    clearPreloadedAssets();
    if (user?.uid) {
      clearFaceAnalysisCache(user.uid);
      await clearUserRoom(user.uid).catch(() => {});
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: screenOrder[0] }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, currentScreenIndex <= 0 && styles.disabled]}
        onPress={handlePrevious}
        disabled={currentScreenIndex <= 0}
      >
        <Text style={styles.buttonText}>← Prev</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleBackToStart}>
        <Text style={styles.buttonText}>↩ Start</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  button: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  buttonText: {
    color: colorsV2.accentPurple,
    fontSize: 10,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.3,
  },
});

import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, spacingV2 } from '../../constants/themeV2';
import V2ProgressBar from './V2ProgressBar';

interface V2ScreenWrapperProps {
  children: React.ReactNode;
  showProgress?: boolean;
  currentStep?: number;
  totalSteps?: number;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}

export default function V2ScreenWrapper({
  children,
  showProgress = false,
  currentStep = 0,
  totalSteps = 14,
  style,
  scrollable = true,
}: V2ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const progressBarHeight = showProgress ? insets.top + 24 : 0;

  const content = (
    <View style={[styles.container, style]}>
      {showProgress && (
        <V2ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      )}
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: progressBarHeight + spacingV2.lg,
              paddingBottom: insets.bottom + spacingV2.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.nonScrollContent,
            {
              paddingTop: progressBarHeight + spacingV2.lg,
              paddingBottom: insets.bottom + spacingV2.lg,
            },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacingV2.lg,
  },
  nonScrollContent: {
    flex: 1,
    paddingHorizontal: spacingV2.lg,
  },
});

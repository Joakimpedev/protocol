import React from 'react';
import { Modal, View, StyleProp, ViewStyle, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ThemedModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function ThemedModal({ visible, onRequestClose, children, contentStyle }: ThemedModalProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.overlay,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={[
              {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                width: '90%',
                maxWidth: 400,
                ...theme.shadows.card,
              },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

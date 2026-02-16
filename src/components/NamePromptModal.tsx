import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface NamePromptModalProps {
  visible: boolean;
  userId: string;
  onNameSet: () => void;
}

export default function NamePromptModal({ visible, userId, onNameSet }: NamePromptModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (trimmedName.length > 50) {
      Alert.alert('Error', 'Name must be 50 characters or less');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        displayName: trimmedName,
      });
      onNameSet();
    } catch (error: any) {
      console.error('Error saving name:', error);
      Alert.alert('Error', 'Failed to save name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing without entering name
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
            maxLength={50}
            editable={!loading}
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity
            style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!name.trim() || loading}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      width: '95%',
      maxWidth: 400,
    },
    title: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    button: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
  });
}

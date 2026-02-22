/**
 * HabitPickerScreen
 * Allows users to select which daily habits to track + create custom ones
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { DAILY_HABITS, DailyHabit } from '../data/daily_habits';
import {
  getUserSelectedHabits,
  toggleHabitSelection,
  getCustomHabits,
  addCustomHabit,
  removeCustomHabit,
  CustomHabit,
} from '../services/dailyTaskService';

const ICON_OPTIONS = [
  'star',
  'heart',
  'lightning-bolt',
  'target',
  'fire',
  'trophy',
  'music',
  'palette',
  'meditation',
  'hand-heart',
];

const CATEGORY_OPTIONS: { key: 'morning' | 'anytime' | 'evening'; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'anytime', label: 'Anytime' },
  { key: 'evening', label: 'Evening' },
];

export default function HabitPickerScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customHabits, setCustomHabits] = useState<CustomHabit[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(ICON_OPTIONS[0]);
  const [newCategory, setNewCategory] = useState<'morning' | 'anytime' | 'evening'>('anytime');
  const isPro = theme.key === 'pro';
  const accentColor = isPro ? '#A855F7' : '#22C55E';
  const iconColor = '#C084FC';

  useEffect(() => {
    if (user) {
      getUserSelectedHabits(user.uid).then(setSelectedIds);
      getCustomHabits(user.uid).then(setCustomHabits);
    }
  }, [user]);

  const handleToggle = async (habitId: string) => {
    if (!user) return;
    try {
      const updated = await toggleHabitSelection(user.uid, habitId);
      setSelectedIds(updated);
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  };

  const handleCreateHabit = async () => {
    if (!user) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    const habit: CustomHabit = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      icon: newIcon,
      iconColor,
      category: newCategory,
    };

    try {
      await addCustomHabit(user.uid, habit);
      setCustomHabits(prev => [...prev, habit]);
      setSelectedIds(prev => [...prev, habit.id]);
      resetForm();
    } catch (error) {
      console.error('Error creating custom habit:', error);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewIcon(ICON_OPTIONS[0]);
    setNewCategory('anytime');
    setShowCreate(false);
  };

  const handleRemoveCustom = (habitId: string) => {
    if (!user) return;
    Alert.alert('Remove Habit', 'Delete this custom habit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeCustomHabit(user.uid, habitId);
          setCustomHabits(prev => prev.filter(h => h.id !== habitId));
          setSelectedIds(prev => prev.filter(id => id !== habitId));
        },
      },
    ]);
  };

  const renderHabit = (habit: DailyHabit) => {
    const isSelected = selectedIds.includes(habit.id);
    return (
      <TouchableOpacity
        key={habit.id}
        style={[
          styles.habitCard,
          isSelected && { borderColor: accentColor },
        ]}
        onPress={() => handleToggle(habit.id)}
        activeOpacity={0.7}
      >
        <View style={styles.habitRow}>
          <View style={styles.habitIconContainer}>
            <MaterialCommunityIcons name={habit.icon as any} size={22} color={iconColor} />
          </View>
          <View style={styles.habitInfo}>
            <Text style={styles.habitName}>{habit.name}</Text>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isSelected ? accentColor : theme.colors.textSecondary,
                backgroundColor: isSelected ? accentColor : 'transparent',
              },
            ]}
          >
            {isSelected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCustomHabit = (habit: CustomHabit) => {
    const isSelected = selectedIds.includes(habit.id);
    return (
      <TouchableOpacity
        key={habit.id}
        style={[
          styles.habitCard,
          isSelected && { borderColor: accentColor },
        ]}
        onPress={() => handleToggle(habit.id)}
        onLongPress={() => handleRemoveCustom(habit.id)}
        activeOpacity={0.7}
      >
        <View style={styles.habitRow}>
          <View style={styles.habitIconContainer}>
            <MaterialCommunityIcons name={habit.icon as any} size={22} color={iconColor} />
          </View>
          <View style={styles.habitInfo}>
            <Text style={styles.habitName}>{habit.name}</Text>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isSelected ? accentColor : theme.colors.textSecondary,
                backgroundColor: isSelected ? accentColor : 'transparent',
              },
            ]}
          >
            {isSelected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const morningHabits = DAILY_HABITS.filter(h => h.category === 'morning');
  const anytimeHabits = DAILY_HABITS.filter(h => h.category === 'anytime');
  const eveningHabits = DAILY_HABITS.filter(h => h.category === 'evening');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Daily Habits</Text>
        <Text style={styles.subtitle}>
          Select habits to add to your daily checklist. Each completed habit earns +10 XP.
        </Text>

        {morningHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>MORNING</Text>
            {morningHabits.map(renderHabit)}
          </>
        )}

        {anytimeHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ANYTIME</Text>
            {anytimeHabits.map(renderHabit)}
          </>
        )}

        {eveningHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>EVENING</Text>
            {eveningHabits.map(renderHabit)}
          </>
        )}

        {/* Custom habits */}
        {customHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>YOUR HABITS</Text>
            {customHabits.map(renderCustomHabit)}
            <Text style={styles.customHint}>Long press to delete</Text>
          </>
        )}

        {/* Create custom habit button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.createButtonText}>+ Create your own</Text>
        </TouchableOpacity>

        <Text style={styles.selectedCount}>
          {selectedIds.length} habit{selectedIds.length !== 1 ? 's' : ''} selected
        </Text>
      </ScrollView>

      {/* Create habit modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={resetForm}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={resetForm}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Habit</Text>

            <TextInput
              style={styles.nameInput}
              placeholder="Habit name"
              placeholderTextColor={theme.colors.textSecondary}
              value={newName}
              onChangeText={setNewName}
              maxLength={40}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newIcon === icon && { borderColor: accentColor, backgroundColor: accentColor + '20' },
                  ]}
                  onPress={() => setNewIcon(icon)}
                >
                  <View style={styles.iconGlow}>
                    <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>When</Text>
            <View style={styles.categoryRow}>
              {CATEGORY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.categoryChip,
                    newCategory === opt.key && { borderColor: accentColor, backgroundColor: accentColor + '20' },
                  ]}
                  onPress={() => setNewCategory(opt.key)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      newCategory === opt.key && { color: accentColor },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={resetForm}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, !newName.trim() && { opacity: 0.4 }]}
                onPress={handleCreateHabit}
                disabled={!newName.trim()}
              >
                <Text style={styles.addBtnText}>Add Habit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function getStyles(theme: Theme) {
  const isPro = theme.key === 'pro';
  const accentColor = isPro ? '#A855F7' : '#22C55E';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    title: {
      ...theme.typography.heading,
      marginBottom: 8,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: theme.colors.textSecondary,
      marginBottom: 10,
      marginTop: 16,
    },
    habitCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    habitRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    habitIconContainer: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      shadowColor: '#C084FC',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 6,
      elevation: 5,
    },
    habitInfo: {
      flex: 1,
    },
    habitName: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    customHint: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
      marginBottom: 4,
      fontStyle: 'italic',
    },
    createButton: {
      alignItems: 'center',
      paddingVertical: 14,
      marginTop: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    createButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    selectedCount: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: 24,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalSheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    nameInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    iconOption: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconGlow: {
      shadowColor: '#C084FC',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 6,
      elevation: 5,
    },
    categoryRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    categoryChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    addBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: accentColor,
      alignItems: 'center',
    },
    addBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}

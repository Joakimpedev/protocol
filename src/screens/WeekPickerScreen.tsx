/**
 * Week Picker Screen
 * 
 * Grid view of all photos for selecting a week
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../constants/theme';
import { loadAllPhotos, ProgressPhoto } from '../services/photoService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_PADDING = spacing.md * 2;
const GRID_GAP = spacing.xs * 2;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING - (GRID_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

interface WeekPickerScreenProps {
  route: {
    params: {
      currentWeek: number;
      isTopPhoto?: boolean;
    };
  };
  navigation: any;
}

export default function WeekPickerScreen({ route, navigation }: WeekPickerScreenProps) {
  const { currentWeek, isTopPhoto } = route.params;
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const allPhotos = await loadAllPhotos();
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const allAvailableWeeks = Array.from(new Set(photos.map(p => p.weekNumber)))
    .sort((a, b) => b - a); // Newest first

  const getPhotoForWeek = (week: number): ProgressPhoto | null => {
    return photos.find(p => p.weekNumber === week) || null;
  };

  const handleWeekSelect = (week: number) => {
    // Pass the selected week back through navigation params
    navigation.navigate('PhotoComparison', {
      selectedWeek: week,
      isTopPhoto: isTopPhoto,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Week</Text>
        <View style={styles.backButton} />
      </View>

      {/* Grid */}
      <FlatList
        data={allAvailableWeeks}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => `week-${item}`}
        contentContainerStyle={styles.gridContainer}
        renderItem={({ item }) => {
          const photo = getPhotoForWeek(item);
          const isSelected = currentWeek === item;
          
          return (
            <TouchableOpacity
              style={[
                styles.gridItem,
                { width: ITEM_SIZE, height: ITEM_SIZE },
                isSelected && styles.gridItemSelected
              ]}
              onPress={() => handleWeekSelect(item)}
            >
              {photo ? (
                <>
                  <Image source={{ uri: photo.uri }} style={styles.gridPhoto} resizeMode="cover" />
                  <Text style={styles.gridLabel}>Week {item}</Text>
                </>
              ) : (
                <View style={styles.gridPlaceholder}>
                  <Text style={styles.gridPlaceholderText}>Week {item}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    minWidth: 60,
  },
  backButtonText: {
    ...typography.body,
    color: colors.text,
  },
  headerTitle: {
    ...typography.headingSmall,
    fontSize: 18,
  },
  gridContainer: {
    padding: spacing.md,
  },
  gridItem: {
    margin: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gridItemSelected: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  gridLabel: {
    ...typography.label,
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
    color: '#FFFFFF',
    fontSize: 10,
  },
  gridPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  gridPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
  },
});


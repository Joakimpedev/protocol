/**
 * Week Picker Screen
 *
 * Grid view of all photos for selecting a week
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { loadAllPhotos, ProgressPhoto } from '../services/photoService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;

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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const GRID_PADDING = theme.spacing.md * 2;
  const GRID_GAP = theme.spacing.xs * 2;
  const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING - (GRID_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

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

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      minWidth: 60,
    },
    backButtonText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    headerTitle: {
      ...theme.typography.headingSmall,
      fontSize: 18,
    },
    gridContainer: {
      padding: theme.spacing.md,
    },
    gridItem: {
      margin: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    gridItemSelected: {
      borderColor: theme.colors.text,
      borderWidth: 3,
    },
    gridPhoto: {
      width: '100%',
      height: '100%',
    },
    gridLabel: {
      ...theme.typography.label,
      position: 'absolute',
      bottom: theme.spacing.xs,
      left: theme.spacing.xs,
      backgroundColor: theme.colors.overlay,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: 2,
      color: '#FFFFFF',
      fontSize: 10,
    },
    gridPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    gridPlaceholderText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
  });
}

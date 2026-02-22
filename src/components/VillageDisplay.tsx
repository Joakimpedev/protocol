/**
 * VillageDisplay
 * Horizontal-scrollable village diorama — shows current level + past levels,
 * plus a blurred preview of the next village stage.
 */

import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, FlatList, ViewToken } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { getVillageImageForLevel, getBalancedVillageImage } from '../services/villageService';
import { LEVELS } from '../data/levels';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VILLAGE_HEIGHT = Math.round(SCREEN_HEIGHT / 3);
const IMAGE_WIDTH = SCREEN_WIDTH - 32; // side padding

// Village stage names — these replace generic level names for the diorama
const VILLAGE_STAGE_NAMES: Record<number, string> = {
  1: 'Campfire',
  2: 'Clearing',
  3: 'Homestead',
  4: 'Settlement',
  5: 'Village',
};

interface VillageDisplayProps {
  level: number;
  levelName: string; // XP rank name (unused now but kept for interface compat)
  choices: number[];
}

interface VillagePage {
  level: number;
  stageName: string;
  isNextLevel?: boolean;
  totalXPRequired?: number;
}

export default function VillageDisplay({ level, choices }: VillageDisplayProps) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);

  // Build pages: one per level from 1 to min(level, 5), plus a blurred "next level" preview
  const pages: VillagePage[] = useMemo(() => {
    const maxVillageLevel = Math.min(level, 5);
    const result: VillagePage[] = [];
    for (let i = 1; i <= maxVillageLevel; i++) {
      result.push({
        level: i,
        stageName: VILLAGE_STAGE_NAMES[i] || `Level ${i}`,
      });
    }
    // Add blurred next level preview if not at max village level (5)
    const nextVillageLevel = maxVillageLevel + 1;
    if (nextVillageLevel <= 5) {
      const nextLevelDef = LEVELS.find(l => l.level === level + 1);
      result.push({
        level: nextVillageLevel,
        stageName: VILLAGE_STAGE_NAMES[nextVillageLevel] || `Level ${nextVillageLevel}`,
        isNextLevel: true,
        totalXPRequired: nextLevelDef?.xpRequired,
      });
    }
    return result;
  }, [level]);

  // Track which page is currently visible
  const [activeIndex, setActiveIndex] = useState(() =>
    pages.filter(p => !p.isNextLevel).length - 1
  );

  const currentLevelIndex = useMemo(() => {
    return pages.filter(p => !p.isNextLevel).length - 1;
  }, [pages]);

  // When level changes, scroll to the current level page
  const prevLevelRef = useRef(level);
  useEffect(() => {
    if (level !== prevLevelRef.current) {
      prevLevelRef.current = level;
      if (flatListRef.current && currentLevelIndex >= 0) {
        try {
          flatListRef.current.scrollToIndex({ index: currentLevelIndex, animated: false });
        } catch {}
        setActiveIndex(currentLevelIndex);
      }
    }
  }, [level, currentLevelIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < pages.length - 1;
  const activePage = pages[activeIndex];

  const renderItem = ({ item }: { item: VillagePage }) => {
    if (item.isNextLevel) {
      // Blurred preview of next village level — use the balanced/middle image
      const villageImage = getBalancedVillageImage(item.level);

      return (
        <View style={styles.page}>
          <View style={styles.imageWrapper}>
            <Image
              source={villageImage}
              style={[styles.villageImage, { opacity: 0.4 }]}
              resizeMode="contain"
              blurRadius={20}
            />
            {/* Overlay with lock container */}
            <View style={styles.nextLevelOverlay}>
              <View style={[styles.lockContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <MaterialCommunityIcons name="lock" size={24} color={theme.colors.textSecondary} />
                <Text style={[styles.lockXPText, { color: theme.colors.text }]}>
                  {item.totalXPRequired ? `${item.totalXPRequired.toLocaleString()} XP` : 'Locked'}
                </Text>
                <Text style={[styles.lockSubtext, { color: theme.colors.textSecondary }]}>
                  Total XP to unlock
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // For past/current levels, use choices up to that point
    const choicesForLevel = choices.slice(0, Math.max(item.level - 1, 0));
    const villageImage = getVillageImageForLevel(item.level, choicesForLevel);

    return (
      <View style={styles.page}>
        <View style={styles.imageWrapper}>
          <Image
            source={villageImage}
            style={styles.villageImage}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderItem}
        keyExtractor={(item) => `village-${item.level}${item.isNextLevel ? '-next' : ''}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={currentLevelIndex}
        getItemLayout={(_, index) => ({
          length: IMAGE_WIDTH,
          offset: IMAGE_WIDTH * index,
          index,
        })}
        snapToInterval={IMAGE_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      {/* Stage name with chevron navigation indicators */}
      <View style={styles.nameRow}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={20}
          color={hasPrev ? theme.colors.textSecondary : 'transparent'}
        />
        <Text
          style={[
            styles.stageName,
            { color: activePage?.isNextLevel ? theme.colors.textMuted : theme.colors.textSecondary },
          ]}
        >
          {activePage?.stageName ?? ''}
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={hasNext ? theme.colors.textSecondary : 'transparent'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  listContent: {
    // no extra padding — pages fill width
  },
  page: {
    width: IMAGE_WIDTH,
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: VILLAGE_HEIGHT,
    paddingHorizontal: 4,
  },
  villageImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  stageName: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  nextLevelOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  lockXPText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 8,
  },
  lockSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});

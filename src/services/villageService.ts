/**
 * Village Service
 * Manages village progression system: image mapping, choices, and Firestore persistence
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ImageSourcePropType } from 'react-native';

// Static require map — React Native needs static requires
// VILLAGE_IMAGES[level][position] where position is 1-indexed
const VILLAGE_IMAGES: Record<number, Record<number, ImageSourcePropType>> = {
  1: {
    1: require('../../assets/city/level_1/1.png'),
  },
  2: {
    1: require('../../assets/city/level_2/1.png'),
    2: require('../../assets/city/level_2/2.png'),
  },
  3: {
    1: require('../../assets/city/level_3/1.png'),
    2: require('../../assets/city/level_3/2.png'),
    3: require('../../assets/city/level_3/3.png'),
  },
  4: {
    1: require('../../assets/city/level_4/1.png'),
    2: require('../../assets/city/level_4/2.png'),
    3: require('../../assets/city/level_4/3.png'),
    4: require('../../assets/city/level_4/4.png'),
  },
  5: {
    1: require('../../assets/city/level_5/1.png'),
    2: require('../../assets/city/level_5/2.png'),
    3: require('../../assets/city/level_5/3.png'),
    4: require('../../assets/city/level_5/4.png'),
    5: require('../../assets/city/level_5/5.png'),
  },
};

/**
 * Get the balanced (middle) village image for a given level — used for blurred previews
 */
export function getBalancedVillageImage(level: number): ImageSourcePropType {
  const clampedLevel = Math.min(Math.max(level, 1), 5);
  const maxIndex = clampedLevel;
  // Pick the middle image (e.g. level 3 has images 1,2,3 → pick 2)
  const middleIndex = Math.ceil(maxIndex / 2);
  return VILLAGE_IMAGES[clampedLevel][middleIndex];
}

/**
 * Get both possible village images for a choice at a given level.
 * Returns { power, wisdom } images based on what the user would get
 * if they chose Power (1) or Wisdom (0) at this level.
 */
export function getChoiceImages(
  level: number,
  currentChoices: number[]
): { power: ImageSourcePropType; wisdom: ImageSourcePropType } {
  const clampedLevel = Math.min(Math.max(level, 1), 5);
  const powerChoices = [...currentChoices, 1];
  const wisdomChoices = [...currentChoices, 0];
  return {
    power: getVillageImageForLevel(clampedLevel, powerChoices),
    wisdom: getVillageImageForLevel(clampedLevel, wisdomChoices),
  };
}

/**
 * Calculate the number of Power choices made
 */
export function getVillagePosition(choices: number[]): number {
  return choices.reduce((sum, c) => sum + c, 0);
}

/**
 * Get the correct village image for a given level and choices
 * Lower number = more wisdom, higher number = more power
 * Image index = powerCount + 1 (1-indexed file naming)
 */
export function getVillageImageForLevel(level: number, choices: number[]): ImageSourcePropType {
  // Clamp level to 1-5 (village images only go to level 5)
  const clampedLevel = Math.min(Math.max(level, 1), 5);

  if (clampedLevel === 1) {
    return VILLAGE_IMAGES[1][1];
  }

  const powerCount = getVillagePosition(choices);
  const imageIndex = powerCount + 1;

  // Clamp image index to available range for this level
  const maxIndex = clampedLevel;
  const clampedIndex = Math.min(Math.max(imageIndex, 1), maxIndex);

  return VILLAGE_IMAGES[clampedLevel][clampedIndex];
}

/**
 * Save a village choice (Power=1, Wisdom=0) to Firestore
 */
export async function saveVillageChoice(userId: string, choice: 0 | 1): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User document not found');
    }

    const data = userSnap.data();
    const currentChoices: number[] = data.village?.choices || [];
    const updatedChoices = [...currentChoices, choice];

    await updateDoc(userRef, {
      'village.choices': updatedChoices,
    });
  } catch (error) {
    console.error('Error saving village choice:', error);
    throw error;
  }
}

/**
 * Get village choices from Firestore
 */
export async function getVillageChoices(userId: string): Promise<number[]> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return [];
    }

    const data = userSnap.data();
    return data.village?.choices || [];
  } catch (error) {
    console.error('Error getting village choices:', error);
    return [];
  }
}

/**
 * Photo Service - Local Photo Storage Management
 * 
 * Handles saving, loading, and managing progress photos stored locally
 * using expo-file-system (new API)
 */

// Temporarily using legacy API until new API migration is fully tested
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const PHOTO_DIR = FileSystem.documentDirectory + 'progress_photos/';

export interface ProgressPhoto {
  uri: string;
  weekNumber: number;
  timestamp: number;
  filename: string;
}

/**
 * Ensure the photo directory exists
 */
export async function ensurePhotoDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

/**
 * Compress and save a photo from camera
 */
export async function saveProgressPhoto(
  photoUri: string,
  weekNumber: number
): Promise<string> {
  await ensurePhotoDirectory();

  // Crop to square and compress (target ~500KB-1MB)
  // Resize with both width and height to force square crop (centers the image)
  const squareSize = 1080;
  
  const manipulatedImage = await ImageManipulator.manipulateAsync(
    photoUri,
    [
      { flip: ImageManipulator.FlipType.Horizontal }, // Flip horizontally to correct front camera mirroring
      { resize: { width: squareSize, height: squareSize } }, // Force square resize (centers and crops)
    ],
    {
      compress: 0.8, // 80% quality
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  // Generate filename: week_X_timestamp.jpg
  const timestamp = Date.now();
  const filename = `week_${weekNumber}_${timestamp}.jpg`;
  const destination = PHOTO_DIR + filename;

  // Copy from manipulated image to permanent storage
  await FileSystem.copyAsync({
    from: manipulatedImage.uri,
    to: destination,
  });

  return destination;
}

/**
 * Load all saved progress photos
 */
export async function loadAllPhotos(): Promise<ProgressPhoto[]> {
  await ensurePhotoDirectory();

  try {
    const files = await FileSystem.readDirectoryAsync(PHOTO_DIR);
    const photos: ProgressPhoto[] = [];

    for (const file of files) {
      if (file.startsWith('week_') && file.endsWith('.jpg')) {
        const match = file.match(/week_(\d+)_(\d+)\.jpg/);
        if (match) {
          const weekNumber = parseInt(match[1], 10);
          const timestamp = parseInt(match[2], 10);
          const uri = PHOTO_DIR + file;

          photos.push({
            uri,
            weekNumber,
            timestamp,
            filename: file,
          });
        }
      }
    }

    // Sort by week number, then by timestamp
    photos.sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) {
        return a.weekNumber - b.weekNumber;
      }
      return a.timestamp - b.timestamp;
    });

    return photos;
  } catch (error) {
    console.error('Error loading photos:', error);
    return [];
  }
}

/**
 * Get photo for a specific week (returns the most recent if multiple)
 */
export async function getPhotoForWeek(weekNumber: number): Promise<ProgressPhoto | null> {
  const photos = await loadAllPhotos();
  const weekPhotos = photos.filter(p => p.weekNumber === weekNumber);
  
  if (weekPhotos.length === 0) {
    return null;
  }

  // Return the most recent photo for this week
  return weekPhotos[weekPhotos.length - 1];
}

/**
 * Delete a photo
 */
export async function deletePhoto(filename: string): Promise<void> {
  const fileUri = PHOTO_DIR + filename;
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(fileUri);
  }
}

/**
 * Delete all progress photos (dev tool)
 */
export async function deleteAllPhotos(): Promise<void> {
  await ensurePhotoDirectory();
  
  try {
    const files = await FileSystem.readDirectoryAsync(PHOTO_DIR);
    
    for (const file of files) {
      if (file.startsWith('week_') && file.endsWith('.jpg')) {
        const fileUri = PHOTO_DIR + file;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(fileUri);
        }
      }
    }
  } catch (error) {
    console.error('Error deleting all photos:', error);
    throw error;
  }
}

/**
 * Calculate current week number based on signup date
 */
export function getCurrentWeekNumber(signupDate: string): number {
  const signup = new Date(signupDate);
  const now = new Date();
  
  // Calculate days difference
  const diffTime = now.getTime() - signup.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Week 0 is the signup week, Week 1 is the first full week after
  const weekNumber = Math.floor(diffDays / 7);
  
  return Math.max(0, weekNumber);
}

/**
 * Check if it's time for a weekly photo based on signup day
 */
export function shouldPromptForWeeklyPhoto(
  signupDate: string,
  photoDay: string
): boolean {
  const signup = new Date(signupDate);
  const now = new Date();
  
  // Get the day of week (0 = Sunday, 6 = Saturday)
  const currentDay = now.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDayIndex = dayNames.indexOf(photoDay.toLowerCase());
  
  if (targetDayIndex === -1) {
    return false;
  }
  
  // Check if today is the photo day
  return currentDay === targetDayIndex;
}


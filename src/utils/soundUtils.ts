/**
 * Sound Utilities
 * Exports audio sources for use in components
 * 
 * IMPORTANT: You must add these files to assets/sounds/:
 * - click_countdown.mp3 (for countdown at 2 and 1 seconds)
 * - click_complete.mp3 (for set completion)
 */

import { AudioSource } from 'expo-audio';

// Load audio sources
export const countdownSource: AudioSource = require('../../assets/sounds/click_countdown.mp3');
export const completeSource: AudioSource = require('../../assets/sounds/click_complete.mp3');

/**
 * Level Definitions
 * Exponential XP curve across ~20 levels
 */

export interface LevelDefinition {
  level: number;
  xpRequired: number;
  name: string;
  description: string;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, xpRequired: 0, name: 'Beginner', description: 'Just getting started' },
  { level: 2, xpRequired: 100, name: 'Novice', description: 'Building the habit' },
  { level: 3, xpRequired: 250, name: 'Apprentice', description: 'Consistency is forming' },
  { level: 4, xpRequired: 500, name: 'Dedicated', description: 'Showing real commitment' },
  { level: 5, xpRequired: 850, name: 'Committed', description: 'Your routine is locked in' },
  { level: 6, xpRequired: 1300, name: 'Disciplined', description: 'Nothing stops you' },
  { level: 7, xpRequired: 1900, name: 'Focused', description: 'Laser focus on your goals' },
  { level: 8, xpRequired: 2600, name: 'Driven', description: 'Pushing past limits' },
  { level: 9, xpRequired: 3500, name: 'Relentless', description: 'Unstoppable momentum' },
  { level: 10, xpRequired: 4600, name: 'Veteran', description: 'Battle-tested consistency' },
  { level: 11, xpRequired: 5900, name: 'Elite', description: 'Top tier dedication' },
  { level: 12, xpRequired: 7500, name: 'Master', description: 'Mastery of the process' },
  { level: 13, xpRequired: 9400, name: 'Champion', description: 'Leading by example' },
  { level: 14, xpRequired: 11700, name: 'Legend', description: 'Your discipline is legendary' },
  { level: 15, xpRequired: 14500, name: 'Titan', description: 'Unmovable force' },
  { level: 16, xpRequired: 17800, name: 'Apex', description: 'Peak performance' },
  { level: 17, xpRequired: 21700, name: 'Mythic', description: 'Beyond ordinary limits' },
  { level: 18, xpRequired: 26300, name: 'Transcendent', description: 'Operating on another level' },
  { level: 19, xpRequired: 31700, name: 'Immortal', description: 'Your legacy is cemented' },
  { level: 20, xpRequired: 38000, name: 'Protocol God', description: 'The absolute pinnacle' },
];

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

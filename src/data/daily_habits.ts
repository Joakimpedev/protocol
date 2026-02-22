/**
 * Daily Habits
 * Free checkbox-based habits that don't require products.
 * Icons are MaterialCommunityIcons names (from @expo/vector-icons).
 */

export interface DailyHabit {
  id: string;
  name: string;
  icon: string;       // MaterialCommunityIcons icon name
  iconColor: string;  // Accent color for the icon circle
  category: 'morning' | 'anytime' | 'evening';
}

// ── Morning habits ──
export const MORNING_HABITS: DailyHabit[] = [
  {
    id: 'no_phone_morning',
    name: 'No phone first 30 min',
    icon: 'cellphone-off',
    iconColor: '#818CF8', // indigo-400
    category: 'morning',
  },
  {
    id: 'cold_shower',
    name: 'Cold shower',
    icon: 'water',
    iconColor: '#60A5FA', // blue-400
    category: 'morning',
  },
  {
    id: 'morning_workout',
    name: 'Morning workout',
    icon: 'run-fast',
    iconColor: '#F87171', // red-400
    category: 'morning',
  },
  {
    id: 'make_bed',
    name: 'Make your bed',
    icon: 'bed',
    iconColor: '#818CF8', // indigo-400
    category: 'morning',
  },
  {
    id: 'morning_walk',
    name: 'Morning walk',
    icon: 'walk',
    iconColor: '#F87171', // red-400
    category: 'morning',
  },
  {
    id: 'healthy_breakfast',
    name: 'Healthy breakfast',
    icon: 'food-apple-outline',
    iconColor: '#FB923C', // orange-400
    category: 'morning',
  },
  {
    id: 'sunscreen',
    name: 'Apply sunscreen',
    icon: 'white-balance-sunny',
    iconColor: '#FBBF24', // amber-400
    category: 'morning',
  },
];

// ── Anytime habits ──
export const ANYTIME_HABITS: DailyHabit[] = [
  {
    id: 'workout',
    name: 'Workout',
    icon: 'dumbbell',
    iconColor: '#F87171', // red-400
    category: 'anytime',
  },
  {
    id: 'read_20_pages',
    name: 'Read 20 pages',
    icon: 'book-open-page-variant',
    iconColor: '#2DD4BF', // teal-400
    category: 'anytime',
  },
  {
    id: 'go_for_walk',
    name: 'Go for a walk',
    icon: 'walk',
    iconColor: '#F87171', // red-400
    category: 'anytime',
  },
  {
    id: 'deep_work',
    name: 'Deep work session',
    icon: 'head-cog-outline',
    iconColor: '#C084FC', // violet-400
    category: 'anytime',
  },
  {
    id: 'no_social_media',
    name: 'No social media (2hr)',
    icon: 'shield-off-outline',
    iconColor: '#FB923C', // orange-400
    category: 'anytime',
  },
  {
    id: 'spend_time_outside',
    name: 'Spend time outside',
    icon: 'weather-sunny',
    iconColor: '#FBBF24', // amber-400
    category: 'anytime',
  },
  {
    id: 'water_intake',
    name: 'Drink 2L water',
    icon: 'cup-water',
    iconColor: '#60A5FA', // blue-400
    category: 'anytime',
  },
];

// ── Evening habits ──
export const EVENING_HABITS: DailyHabit[] = [
  {
    id: 'phone_away_10pm',
    name: 'Phone away by 10pm',
    icon: 'cellphone-off',
    iconColor: '#818CF8', // indigo-400
    category: 'evening',
  },
  {
    id: 'journal',
    name: 'Journal',
    icon: 'lead-pencil',
    iconColor: '#C084FC', // violet-400
    category: 'evening',
  },
  {
    id: 'read_before_bed',
    name: 'Read before bed',
    icon: 'book-open-variant',
    iconColor: '#9CA3AF', // gray-400
    category: 'evening',
  },
  {
    id: 'evening_stretch',
    name: 'Evening stretch/yoga',
    icon: 'yoga',
    iconColor: '#F472B6', // pink-400
    category: 'evening',
  },
  {
    id: 'plan_tomorrow',
    name: 'Plan tomorrow',
    icon: 'calendar-check-outline',
    iconColor: '#818CF8', // indigo-400
    category: 'evening',
  },
  {
    id: 'sleep_7h',
    name: 'Sleep 7+ hours',
    icon: 'moon-waning-crescent',
    iconColor: '#60A5FA', // blue-400
    category: 'evening',
  },
];

/** All habits combined (for backward compat) */
export const DAILY_HABITS: DailyHabit[] = [
  ...MORNING_HABITS,
  ...ANYTIME_HABITS,
  ...EVENING_HABITS,
];

export function getHabitById(habitId: string): DailyHabit | undefined {
  return DAILY_HABITS.find(h => h.id === habitId);
}

export function getHabitsByCategory(category: 'morning' | 'anytime' | 'evening'): DailyHabit[] {
  return DAILY_HABITS.filter(h => h.category === category);
}

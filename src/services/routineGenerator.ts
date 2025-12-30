/**
 * Routine Generator
 * Assembles routine blocks based on user selections
 */

export interface RoutineBlock {
  id: string;
  ingredient: string;
  purpose: string;
  usage: string;
  examples: string[];
  section: 'morning' | 'evening' | 'exercises';
  categories: string[];
  budget?: 'low' | 'medium' | 'flexible';
  timeRequired?: number; // minutes
}

// Pre-built routine blocks (simplified for MVP)
const ROUTINE_BLOCKS: RoutineBlock[] = [
  // Morning Routine
  {
    id: 'morning_cleanser',
    ingredient: 'Gentle Cleanser',
    purpose: 'Remove overnight oil and prepare skin',
    usage: 'Morning cleanser, massage for 60 sec, rinse with lukewarm water',
    examples: ['CeraVe Foaming Cleanser (~$15)', 'Cetaphil Daily Cleanser (~$12)', 'La Roche-Posay Toleriane (~$16)'],
    section: 'morning',
    categories: ['oily_skin', 'dry_skin', 'acne', 'blackheads'],
    budget: 'low',
    timeRequired: 2,
  },
  {
    id: 'morning_moisturizer',
    ingredient: 'Moisturizer',
    purpose: 'Hydrate and protect skin barrier',
    usage: 'Apply after cleansing, while skin is slightly damp',
    examples: ['CeraVe Moisturizing Lotion (~$15)', 'Cetaphil Daily Moisturizer (~$14)', 'Neutrogena Hydro Boost (~$18)'],
    section: 'morning',
    categories: ['oily_skin', 'dry_skin', 'acne'],
    budget: 'low',
    timeRequired: 1,
  },
  {
    id: 'morning_spf',
    ingredient: 'SPF',
    purpose: 'Protect from UV damage and prevent premature aging',
    usage: 'Apply as final step, 15 min before sun exposure',
    examples: ['Neutrogena Ultra Sheer (~$12)', 'CeraVe AM Moisturizer SPF 30 (~$18)', 'EltaMD UV Clear (~$35)'],
    section: 'morning',
    categories: ['oily_skin', 'dry_skin', 'hyperpigmentation', 'skin_texture'],
    budget: 'low',
    timeRequired: 1,
  },
  {
    id: 'morning_bha',
    ingredient: 'Salicylic Acid (BHA)',
    purpose: 'Blackheads, oily skin, pore control',
    usage: 'Morning cleanser or treatment, 2-3x per week',
    examples: ['CeraVe SA Cleanser (~$15)', "Paula's Choice 2% BHA (~$22)", 'The Ordinary Salicylic (~$8)'],
    section: 'morning',
    categories: ['blackheads', 'oily_skin'],
    budget: 'low',
    timeRequired: 2,
  },
  {
    id: 'morning_niacinamide',
    ingredient: 'Niacinamide',
    purpose: 'Oil control, pore refinement, skin barrier support',
    usage: 'Apply after cleansing, before moisturizer',
    examples: ['The Ordinary Niacinamide (~$7)', 'CeraVe PM Moisturizer (~$15)', 'Paula\'s Choice Niacinamide (~$32)'],
    section: 'morning',
    categories: ['oily_skin', 'blackheads'],
    budget: 'low',
    timeRequired: 1,
  },
  // Evening Routine
  {
    id: 'evening_cleanser',
    ingredient: 'Cleanser',
    purpose: 'Remove dirt, oil, and impurities from the day',
    usage: 'Evening cleanser, massage for 60 sec, rinse thoroughly',
    examples: ['CeraVe Foaming Cleanser (~$15)', 'Cetaphil Daily Cleanser (~$12)', 'La Roche-Posay Toleriane (~$16)'],
    section: 'evening',
    categories: ['oily_skin', 'dry_skin', 'acne', 'blackheads'],
    budget: 'low',
    timeRequired: 2,
  },
  {
    id: 'evening_retinol',
    ingredient: 'Retinol',
    purpose: 'Cell turnover, anti-aging, texture improvement',
    usage: 'Apply 2-3x per week, start with low concentration',
    examples: ['The Ordinary Retinol 0.5% (~$10)', 'CeraVe Retinol Serum (~$20)', 'Paula\'s Choice 1% Retinol (~$32)'],
    section: 'evening',
    categories: ['skin_texture', 'hyperpigmentation', 'acne'],
    budget: 'medium',
    timeRequired: 2,
  },
  {
    id: 'evening_benzoyl',
    ingredient: 'Benzoyl Peroxide',
    purpose: 'Acne treatment, kills bacteria',
    usage: 'Apply to affected areas, start with 2.5% concentration',
    examples: ['Neutrogena On-the-Spot (~$8)', 'PanOxyl 4% BP Wash (~$10)', 'CeraVe Acne Foaming Cream (~$16)'],
    section: 'evening',
    categories: ['acne'],
    budget: 'low',
    timeRequired: 2,
  },
  {
    id: 'evening_moisturizer',
    ingredient: 'Moisturizer',
    purpose: 'Repair and hydrate overnight',
    usage: 'Apply after treatment, while skin is slightly damp',
    examples: ['CeraVe PM Moisturizer (~$15)', 'Cetaphil Rich Night Cream (~$16)', 'La Roche-Posay Toleriane (~$20)'],
    section: 'evening',
    categories: ['oily_skin', 'dry_skin', 'acne'],
    budget: 'low',
    timeRequired: 1,
  },
  // Exercises
  {
    id: 'mewing',
    ingredient: 'Mewing',
    purpose: 'Proper tongue posture for jawline development',
    usage: '5-10 min daily, maintain tongue on roof of mouth',
    examples: [],
    section: 'exercises',
    categories: ['jawline'],
    timeRequired: 5,
  },
  {
    id: 'jaw_exercises',
    ingredient: 'Jaw Exercises',
    purpose: 'Strengthen jaw muscles and improve definition',
    usage: '10-15 min daily, jaw curls and resistance exercises',
    examples: [],
    section: 'exercises',
    categories: ['jawline'],
    timeRequired: 10,
  },
];

/**
 * Generate routine based on user selections
 */
export function generateRoutine(
  categories: string[],
  budget?: 'low' | 'medium' | 'flexible',
  dailyTime?: number
): RoutineBlock[] {
  const selectedBlocks: RoutineBlock[] = [];

  // Filter blocks by selected categories
  for (const block of ROUTINE_BLOCKS) {
    const hasMatchingCategory = block.categories.some((cat) => categories.includes(cat));
    
    if (hasMatchingCategory) {
      // Filter by budget if specified
      if (block.budget && budget) {
        if (budget === 'low' && block.budget !== 'low') {
          continue;
        }
        if (budget === 'medium' && block.budget === 'flexible') {
          continue;
        }
      }

      // Filter by time if specified
      if (dailyTime && block.timeRequired) {
        // Simple check: if total time would exceed, skip optional items
        // For MVP, we'll include all matching blocks
      }

      selectedBlocks.push(block);
    }
  }

  // Remove duplicates (same ingredient in different sections)
  const uniqueBlocks: RoutineBlock[] = [];
  const seenIngredients = new Set<string>();

  for (const block of selectedBlocks) {
    const key = `${block.section}_${block.ingredient}`;
    if (!seenIngredients.has(key)) {
      seenIngredients.add(key);
      uniqueBlocks.push(block);
    }
  }

  // Sort by section: morning, evening, exercises
  const sectionOrder = { morning: 0, evening: 1, exercises: 2 };
  uniqueBlocks.sort((a, b) => sectionOrder[a.section] - sectionOrder[b.section]);

  return uniqueBlocks;
}









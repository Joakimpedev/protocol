/**
 * Village Choice Copy
 * Mantras and display text for Power vs Wisdom choices at each level-up
 */

export interface ChoiceCopy {
  icon: string;
  title: string;
  quote: string;
}

export interface LevelChoiceCopy {
  power: ChoiceCopy;
  wisdom: ChoiceCopy;
}

export const VILLAGE_CHOICE_COPY: Record<number, LevelChoiceCopy> = {
  2: {
    power: { icon: '\u2694\uFE0F', title: 'POWER', quote: '"Protect what\'s yours."' },
    wisdom: { icon: '\uD83C\uDFDB\uFE0F', title: 'WISDOM', quote: '"Understand your surroundings."' },
  },
  3: {
    power: { icon: '\u2694\uFE0F', title: 'POWER', quote: '"Strength earns respect."' },
    wisdom: { icon: '\uD83C\uDFDB\uFE0F', title: 'WISDOM', quote: '"Knowledge earns loyalty."' },
  },
  4: {
    power: { icon: '\u2694\uFE0F', title: 'POWER', quote: '"Let them fear your name."' },
    wisdom: { icon: '\uD83C\uDFDB\uFE0F', title: 'WISDOM', quote: '"Let them seek your counsel."' },
  },
  5: {
    power: { icon: '\u2694\uFE0F', title: 'POWER', quote: '"Dominance is peace."' },
    wisdom: { icon: '\uD83C\uDFDB\uFE0F', title: 'WISDOM', quote: '"Prosperity is peace."' },
  },
};

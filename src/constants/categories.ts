/**
 * Problem Categories for Protocol
 * Order matches Phase 1 guide (priority: Acne first, Hyperpigmentation last)
 */

export interface Category {
  id: string;
  label: string;
  description?: string;
}

export const CATEGORIES: Category[] = [
  { id: 'acne', label: 'Acne / breakouts', description: 'Active breakouts' },
  { id: 'jawline', label: 'Jawline / face structure', description: 'Weak jaw, double chin, mewing' },
  { id: 'facial_hair', label: 'Facial hair', description: 'Patchy beard, growth tips' },
  { id: 'oily_skin', label: 'Oily skin', description: 'Shine, large pores' },
  { id: 'dry_skin', label: 'Dry skin', description: 'Flaking, tightness' },
  { id: 'blackheads', label: 'Blackheads', description: 'Nose, chin area' },
  { id: 'dark_circles', label: 'Dark circles', description: 'Under-eye bags' },
  { id: 'skin_texture', label: 'Skin texture', description: 'Uneven, rough' },
  { id: 'hyperpigmentation', label: 'Hyperpigmentation', description: 'Dark spots, uneven tone' },
];

/** @deprecated Phase 0 flow allows unlimited selections - kept for legacy */
export const MAX_CATEGORIES = 9;









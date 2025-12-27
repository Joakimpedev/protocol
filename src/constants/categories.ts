/**
 * Problem Categories for Protocol
 */

export interface Category {
  id: string;
  label: string;
  description?: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'jawline',
    label: 'Jawline / face structure',
    description: 'Weak jaw, double chin, mewing',
  },
  {
    id: 'acne',
    label: 'Acne / breakouts',
    description: 'Active breakouts',
  },
  {
    id: 'oily_skin',
    label: 'Oily skin',
    description: 'Shine, large pores',
  },
  {
    id: 'dry_skin',
    label: 'Dry skin',
    description: 'Flaking, tightness',
  },
  {
    id: 'blackheads',
    label: 'Blackheads',
    description: 'Nose, chin area',
  },
  {
    id: 'dark_circles',
    label: 'Dark circles',
    description: 'Under-eye bags',
  },
  {
    id: 'skin_texture',
    label: 'Skin texture',
    description: 'Uneven, rough',
  },
  {
    id: 'hyperpigmentation',
    label: 'Hyperpigmentation',
    description: 'Dark spots, uneven tone',
  },
  {
    id: 'facial_hair',
    label: 'Facial hair',
    description: 'Patchy beard, growth tips',
  },
];

export const MAX_CATEGORIES = 3;







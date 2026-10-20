import type { CategoryId } from '../services/types';

export interface CategoryInfo {
  id: CategoryId;
  icon: string;
  hue: number;
  hue2: number;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'football', icon: '⚽', hue: 142, hue2: 170 },
  { id: 'barbershop', icon: '💈', hue: 24, hue2: 350 },
  { id: 'beauty', icon: '💅', hue: 330, hue2: 290 },
  { id: 'massage', icon: '💆', hue: 270, hue2: 240 },
  { id: 'pool', icon: '🏊', hue: 200, hue2: 230 },
  { id: 'sauna', icon: '🧖', hue: 12, hue2: 340 },
  { id: 'gym', icon: '🏋️', hue: 230, hue2: 270 },
  { id: 'restaurant', icon: '🍽️', hue: 45, hue2: 15 },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function category(id: CategoryId): CategoryInfo {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as string[]).includes(value);
}

/** Inline style that feeds the category colours to CSS. */
export function hueStyle(id: CategoryId): React.CSSProperties {
  const c = category(id);
  return { ['--h' as string]: c.hue, ['--h2' as string]: c.hue2 };
}

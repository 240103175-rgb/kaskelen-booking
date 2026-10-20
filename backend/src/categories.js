// Service categories. Names live in i18n.js under `cat_<id>`.
export const CATEGORIES = [
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

export function category(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

// Shared data types and mock content used across demo components.

export interface ContentItem {
  id: string;
  title: string;
  year: number;
  // Background color for the poster area — replaces real artwork in the demo
  color: string;
}

export const MENU_ITEMS = ['Home', 'Favourites', 'Series', 'Live', 'Options'];

const CARD_COLORS = [
  '#1a3a5c', '#2d1b4e', '#1a4a2e', '#4a2a1a',
  '#1a3a4a', '#3a1a4a', '#4a3a1a', '#1a4a3a',
  '#3a1a2a', '#1a2a4a', '#4a1a1a', '#2a4a1a',
];

function makeItems(prefix: string, count: number): ContentItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    title: `${prefix} ${i + 1}`,
    year: 2020 + (i % 5),
    color: CARD_COLORS[(i + prefix.charCodeAt(0)) % CARD_COLORS.length]!,
  }));
}

// Three content rows shown in the main screen
export const ROWS: { label: string; items: ContentItem[] }[] = [
  { label: 'Action',  items: makeItems('Action',  8) },
  { label: 'Series',  items: makeItems('Series',  7) },
  { label: 'Live TV', items: makeItems('Channel', 6) },
];

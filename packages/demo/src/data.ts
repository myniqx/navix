// Shared data types and mock content used across demo components.

export interface ContentItem {
  id: string;
  title: string;
  year: number;
  // Background color for the poster area — replaces real artwork in the demo
  color: string;
}

export const MENU_ITEMS = ['Home', 'Movie', 'Series', 'Live', 'Options'];

export const OPTIONS_CONFIG = [
  { key: 'language', label: 'Language', choices: ['English', 'Turkish', 'German', 'French'] },
  { key: 'subtitles', label: 'Subtitles', choices: ['Off', 'English', 'Turkish'] },
  { key: 'audio', label: 'Audio', choices: ['Stereo', 'Surround 5.1', 'Dolby Atmos'] },
  { key: 'theme', label: 'Theme', choices: ['Dark', 'Light', 'Auto'] },
] as const;

export type OptionKey = (typeof OPTIONS_CONFIG)[number]['key'];

export type OptionsState = Record<OptionKey, string>;

export const DEFAULT_OPTIONS: OptionsState = {
  language: 'English',
  subtitles: 'Off',
  audio: 'Stereo',
  theme: 'Dark',
};

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

// Horizontal rows shown on the Series tab
export const ROWS: { label: string; items: ContentItem[] }[] = [
  { label: 'Action',  items: makeItems('Action',  8) },
  { label: 'Series',  items: makeItems('Series',  7) },
  { label: 'Live TV', items: makeItems('Channel', 6) },
];

// Flat grid shown on the Live tab
export const LIVE_GRID: ContentItem[] = [
  ...makeItems('Live', 24),
];

// Paginated grid shown on the Movie tab
export const MOVIE_CHANNELS: ContentItem[] = [
  ...makeItems('Movie', 120),
];

// Paginated rows shown on the Home tab
export const HOME_ROWS: { label: string; items: ContentItem[] }[] = [
  { label: 'Drama',    items: makeItems('Drama',    18) },
  { label: 'Thriller', items: makeItems('Thriller', 15) },
  { label: 'Comedy',   items: makeItems('Comedy',   20) },
];

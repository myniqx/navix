import { NavixPaginatedList } from '@navix/react';

import { HOME_ROWS } from '../data';
import type { ContentItem, HomeRowCardType } from '../data';
import { MediaCard } from './MediaCard';
import type { PlayerState } from './PlayerView';

const VISIBLE_COUNT = 6;
const THRESHOLD = 1;

// Disabled predicates per row — demonstrates single skip, double skip, and
// items disabled outside the visible window (tests full-range canReceiveFocus).
const ROW_DISABLED_FNS: Array<(i: number) => boolean> = [
  // Movies (18): index 2 in view, 7-8 just outside, 14-15 far outside
  (i) => i === 2 || i === 7 || i === 8 || i === 14 || i === 15,
  // Tv Series (15): index 1 in view, 8-9 outside
  (i) => i === 1 || i === 8 || i === 9,
  // Live Streams (20): index 3 in view, 10-11 outside
  (i) => i === 3 || i === 10 || i === 11,
];

interface HomeViewProps {
  onSelect: (state: PlayerState) => void;
}

export function HomeView({ onSelect }: HomeViewProps) {
  return (
    <>
      {HOME_ROWS.map((row, i) => (
        <div key={row.label} style={{ padding: '24px 32px 0' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#4fc3f7',
              marginBottom: 14,
            }}
          >
            {row.label}
          </div>
          <HomeRow
            items={row.items}
            rowIndex={i}
            cardType={row.cardType}
            onSelect={(item) =>
              onSelect({ channels: row.items, current: item, paused: false })
            }
          />
        </div>
      ))}
    </>
  );
}

function HomeRow({
  items,
  rowIndex,
  cardType,
  onSelect,
}: {
  items: ContentItem[];
  rowIndex: number;
  cardType: HomeRowCardType;
  onSelect: (item: ContentItem) => void;
}) {
  const variant =
    cardType === 'live' ? 'live' : cardType === 'series' ? 'series' : 'movie';
  const isItemDisabled = ROW_DISABLED_FNS[rowIndex];

  return (
    <NavixPaginatedList
      fKey={`home-row-${rowIndex}`}
      visibleCount={VISIBLE_COUNT}
      threshold={THRESHOLD}
      items={items}
      gap={12}
      isItemDisabled={isItemDisabled}
      outerStyle={{ padding: '16px 4px' }}
      slotStyle={{ alignItems: 'stretch' }}
      renderItem={(item, fKey, index) => (
        <MediaCard
          fKey={fKey}
          item={item}
          variant={variant}
          disabled={isItemDisabled?.(index) ?? false}
          onClick={() => onSelect(item)}
        />
      )}
    />
  );
}

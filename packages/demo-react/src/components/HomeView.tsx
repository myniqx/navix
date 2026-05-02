import { PaginatedList } from '@navix/react';

import { HOME_ROWS } from '../data';
import type { ContentItem, HomeRowCardType } from '../data';
import { MediaCard } from './MediaCard';
import type { PlayerState } from './PlayerView';

const VISIBLE_COUNT = 6;
const THRESHOLD = 1;

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

  return (
    <PaginatedList
      fKey={`home-row-${rowIndex}`}
      visibleCount={VISIBLE_COUNT}
      threshold={THRESHOLD}
      items={items}
      gap={12}
      outerStyle={{ padding: '16px 4px' }}
      slotStyle={{ alignItems: 'stretch' }}
      renderItem={(item, fKey) => (
        <MediaCard
          fKey={fKey}
          item={item}
          variant={variant}
          onClick={() => onSelect(item)}
        />
      )}
    />
  );
}

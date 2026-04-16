import { useState, useRef } from 'react';
import { PaginatedList } from '@navix/react';
import type { PaginatedListAction } from '@navix/react';
import { HOME_ROWS } from '../data';
import type { ContentItem } from '../data';
import { SeriesCard } from './SeriesCard';

const VISIBLE_COUNT = 6;
const THRESHOLD = 1;

interface HomeViewProps {
  onPlay: (item: ContentItem) => void;
}

export function HomeView({ onPlay: _onPlay }: HomeViewProps) {
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
              color: '#4caf7d',
              marginBottom: 14,
            }}
          >
            {row.label}
            <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 10, color: '#4caf7d88', letterSpacing: '0.05em' }}>
              smart cache demo
            </span>
          </div>

          <SeriesRow items={row.items} rowIndex={i} />
        </div>
      ))}
    </>
  );
}

function SeriesRow({ items, rowIndex }: { items: ContentItem[]; rowIndex: number }) {
  const actionsRef = useRef<Map<string, PaginatedListAction>>(new Map());
  const [, setTick] = useState(0);

  return (
    <PaginatedList
      fKey={`series-row-${rowIndex}`}
      visibleCount={VISIBLE_COUNT}
      threshold={THRESHOLD}
      items={items}
      gap={12}
      outerStyle={{ padding: '32px 4px' }}
      slotStyle={{ alignItems: 'stretch' }}
      onItemAction={(action, item) => {
        actionsRef.current.set(item.id, action);
        setTick((n) => n + 1);
      }}
      renderItem={(item, fKey) => (
        <SeriesCard
          fKey={fKey}
          item={item}
          action={actionsRef.current.get(item.id) ?? null}
        />
      )}
    />
  );
}

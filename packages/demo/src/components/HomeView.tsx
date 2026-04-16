import { useState, useRef } from 'react';
import { PaginatedList } from '@navix/react';
import type { PaginatedListAction } from '@navix/react';
import { HOME_ROWS } from '../data';
import type { ContentItem, HomeRowCardType } from '../data';
import { MovieCard } from './MovieCard';
import { SeriesCard } from './SeriesCard';
import { LiveCard } from './LiveCard';

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
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#4fc3f7',
            marginBottom: 14,
          }}>
            {row.label}
          </div>

          <HomeRow items={row.items} rowIndex={i} cardType={row.cardType} />
        </div>
      ))}
    </>
  );
}

function HomeRow({ items, rowIndex, cardType }: { items: ContentItem[]; rowIndex: number; cardType: HomeRowCardType }) {
  const actionsRef = useRef<Map<string, PaginatedListAction>>(new Map());
  const [, setTick] = useState(0);

  return (
    <PaginatedList
      fKey={`home-row-${rowIndex}`}
      visibleCount={VISIBLE_COUNT}
      threshold={THRESHOLD}
      items={items}
      gap={12}
      outerStyle={{ padding: '16px 4px' }}
      slotStyle={{ alignItems: 'stretch' }}
      onItemAction={(action, item) => {
        actionsRef.current.set(item.id, action);
        setTick((n) => n + 1);
      }}
      renderItem={(item, fKey) => {
        const action = actionsRef.current.get(item.id) ?? null;
        if (cardType === 'movie') return <MovieCard fKey={fKey} item={item} action={action} />;
        if (cardType === 'live')  return <LiveCard  fKey={fKey} item={item} action={action} />;
        return <SeriesCard fKey={fKey} item={item} action={action} />;
      }}
    />
  );
}

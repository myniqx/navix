import { useState, useRef } from 'react';
import { PaginatedGrid } from '@navix/react';
import type { PaginatedGridAction } from '@navix/react';
import { MOVIE_CHANNELS } from '../data';
import type { ContentItem } from '../data';
import { LiveCard } from './LiveCard';

const ROWS = 4;
const COLUMNS = 6;
const THRESHOLD = 1;

export function MovieView() {
  const actionsRef = useRef<Map<string, PaginatedGridAction>>(new Map());
  const [, setTick] = useState(0);

  return (
    <div style={{ padding: '24px 32px 0' }}>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#e53935',
        marginBottom: 14,
      }}>
        Live TV
        <span style={{
          fontSize: 10,
          fontWeight: 400,
          marginLeft: 10,
          color: '#e5393588',
          letterSpacing: '0.05em',
        }}>
          {MOVIE_CHANNELS.length} movies
        </span>
      </div>

      <PaginatedGrid
        fKey="live-grid"
        rows={ROWS}
        columns={COLUMNS}
        threshold={THRESHOLD}
        items={MOVIE_CHANNELS}
        gap={8}
        outerStyle={{ padding: '12px 4px', height: 'calc(90vh - 120px)' }}
        slotStyle={{ alignItems: 'stretch' }}
        onItemAction={(action, item) => {
          actionsRef.current.set(item.id, action);
          setTick((n) => n + 1);
        }}
        renderItem={(item, fKey) => (
          <LiveCard
            fKey={fKey}
            item={item}
            action={actionsRef.current.get(item.id) ?? null}
          />
        )}
      />
    </div>
  );
}

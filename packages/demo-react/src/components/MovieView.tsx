import { PaginatedGrid } from '@navix/react';

import { MOVIE_CHANNELS } from '../data';
import { MediaCard } from './MediaCard';
import type { PlayerState } from './PlayerView';

const ROWS = 4;
const COLUMNS = 6;
const THRESHOLD = 1;

interface MovieViewProps {
  onSelect: (state: PlayerState) => void;
}

export function MovieView({ onSelect }: MovieViewProps) {
  return (
    <div style={{ padding: '24px 32px 0' }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#e53935',
          marginBottom: 14,
        }}
      >
        Movies
        <span
          style={{
            fontSize: 10,
            fontWeight: 400,
            marginLeft: 10,
            color: '#e5393588',
            letterSpacing: '0.05em',
          }}
        >
          {MOVIE_CHANNELS.length} movies
        </span>
      </div>

      <PaginatedGrid
        fKey="movie-grid"
        rows={ROWS}
        columns={COLUMNS}
        threshold={THRESHOLD}
        items={MOVIE_CHANNELS}
        gap={8}
        outerStyle={{ padding: '12px 4px', height: 'calc(90vh - 120px)' }}
        slotStyle={{ alignItems: 'stretch' }}
        renderItem={(item, fKey) => (
          <MediaCard
            fKey={fKey}
            item={item}
            variant="movie"
            onClick={() =>
              onSelect({
                channels: MOVIE_CHANNELS,
                current: item,
                paused: false,
              })
            }
          />
        )}
      />
    </div>
  );
}

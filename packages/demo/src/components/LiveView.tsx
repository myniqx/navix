/**
 * FavouritesView
 *
 * Favourites tab — shows all saved items as a 4-column grid.
 * Uses <Grid> from the react adapter which attaches GridBehavior to the node:
 *   - left/right moves between columns
 *   - up/down moves between rows (calculated from the `columns` prop)
 *
 * The grid is a single focus node, not multiple HorizontalLists,
 * so up/down wraps within the grid before bubbling to the parent VerticalList.
 *
 * Props:
 *   onPlay — called when the user confirms Play on a card.
 */

import { Grid } from '@navix/react';
import { LIVE_GRID } from '../data';
import type { ContentItem } from '../data';
import { ContentCard } from './ContentCard';

const COLUMNS = 8;

interface LiveViewProps {
  onPlay: (item: ContentItem) => void;
}

export function LiveView({ onPlay }: LiveViewProps) {
  return (
    <div style={{ padding: '24px 32px 0' }}>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#4fc3f7',
        marginBottom: 14,
      }}>
        Favourites
      </div>

      {/*
        Grid attaches GridBehavior(node, COLUMNS).
        Arrow keys navigate in 2D — up/down jumps COLUMNS positions in the
        children array, left/right moves by 1.
      */}
      <Grid fKey="live-grid" columns={COLUMNS}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gap: '16px',
          overflow: 'visible',
          padding: '12px 4px',
        }}>
          {LIVE_GRID.map((item) => (
            <ContentCard
              key={item.id}
              fKey={`live-${item.id}`}
              item={item}
              onPlay={() => onPlay(item)}
            />
          ))}
        </div>
      </Grid>
    </div>
  );
}

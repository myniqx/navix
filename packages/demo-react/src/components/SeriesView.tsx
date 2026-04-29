/**
 * HomeView
 *
 * Default tab content — three horizontal shelves (Action, Series, Live TV).
 * Each shelf is an independent HorizontalList in the focus tree.
 * The parent VerticalList in App.tsx handles up/down between shelves.
 *
 * Props:
 *   onPlay — forwarded to each ContentCard; called when the user confirms Play.
 */

import { ROWS } from '../data';
import type { ContentItem } from '../data';
import { ContentRow } from './ContentRow';

interface HomeViewProps {
  onPlay: (item: ContentItem) => void;
}

export function SeriesView({ onPlay }: HomeViewProps) {
  return (
    <>
      {ROWS.map((row, i) => (
        <ContentRow
          key={row.label}
          rowKey={`home-row-${i}`}
          label={row.label}
          items={row.items}
          onPlay={onPlay}
        />
      ))}
    </>
  );
}

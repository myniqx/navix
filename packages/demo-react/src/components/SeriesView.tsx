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
import { ContentRow } from './ContentRow';
import type { PlayerState } from './PlayerView';

interface SeriesViewProps {
  onSelect: (state: PlayerState) => void;
}

export function SeriesView({ onSelect }: SeriesViewProps) {
  return (
    <>
      {ROWS.map((row, i) => (
        <ContentRow
          key={row.label}
          rowKey={`home-row-${i}`}
          label={row.label}
          items={row.items}
          onPlay={(item) =>
            onSelect({ channels: row.items, current: item, paused: false })
          }
        />
      ))}
    </>
  );
}

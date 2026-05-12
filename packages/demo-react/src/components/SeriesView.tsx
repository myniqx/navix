/**
 * HomeView
 *
 * Default tab content — three horizontal shelves (Action, Series, Live TV).
 * Each shelf is an independent NavixHorizontalList in the focus tree.
 * The parent NavixVerticalList in App.tsx handles up/down between shelves.
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

// One disabled predicate per row, demonstrating single-skip and double-skip.
const ROW_DISABLED: Array<(i: number) => boolean> = [
  (i) => i === 2,             // Drama: single disabled (index 2)
  (i) => i === 3 || i === 4, // Action: two consecutive disabled (3-4)
  (i) => i === 1,             // Romantic: single disabled at index 1
];

export function SeriesView({ onSelect }: SeriesViewProps) {
  return (
    <>
      {ROWS.map((row, i) => (
        <ContentRow
          key={row.label}
          rowKey={`home-row-${i}`}
          label={row.label}
          items={row.items}
          isItemDisabled={ROW_DISABLED[i]}
          onPlay={(item) =>
            onSelect({ channels: row.items, current: item, paused: false })
          }
        />
      ))}
    </>
  );
}

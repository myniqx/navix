/**
 * ContentRow
 *
 * A labeled horizontal shelf of content cards.
 * Each row is independently navigable with left/right arrow keys.
 * Up/down switches between rows — handled by the parent NavixVerticalList.
 *
 * Props:
 *   rowKey  — unique key for this row's NavixHorizontalList node in the focus tree.
 *             Also used as a prefix for each card's fKey to guarantee uniqueness.
 *   label   — section heading displayed above the cards (e.g. "Action", "Series").
 *   items   — array of content items to render as cards.
 *   onPress — called with the selected ContentItem when the user presses Enter.
 */

import { NavixHorizontalList } from '@navix/react';

import type { ContentItem } from '../data';
import { ContentCard } from './ContentCard';

interface ContentRowProps {
  rowKey: string;
  label: string;
  items: ContentItem[];
  onPlay: (item: ContentItem) => void;
}

export function ContentRow({ rowKey, label, items, onPlay }: ContentRowProps) {
  return (
    <div style={{ padding: '24px 32px 0' }}>
      {/* Section heading */}
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
        {label}
      </div>

      {/*
        NavixHorizontalList creates a focus node keyed by `rowKey`.
        It handles left/right navigation between its child ContentCards.
        Up/down events are not consumed here — they bubble to the parent
        NavixVerticalList which moves focus between rows.
      */}
      <NavixHorizontalList fKey={rowKey}>
        {/*
          overflow: visible — allows scaled cards to render outside the row bounds.
          padding: 12px 4px — reserves space so the scale(1.08) shadow/border
          is not clipped by the parent. Without this, focused cards get cut off.
        */}
        <div
          style={{ display: 'flex', overflow: 'visible', padding: '12px 4px' }}
        >
          {items.map((item) => (
            <ContentCard
              key={item.id}
              // Prefix with rowKey so card fKeys are unique across all rows
              fKey={`${rowKey}-${item.id}`}
              item={item}
              onPlay={() => onPlay(item)}
            />
          ))}
        </div>
      </NavixHorizontalList>
    </div>
  );
}

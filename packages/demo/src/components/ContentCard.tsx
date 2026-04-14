/**
 * ContentCard
 *
 * A focusable media card with two states:
 *
 * NORMAL state (isSelected = false):
 *   - Card node has no children in the focus tree
 *   - directlyFocused = true when this card is the active leaf
 *   - enter → opens the action overlay (isSelected = true)
 *   - left/right/up/down → return false, parent HorizontalList handles navigation
 *
 * SELECTED state (isSelected = true):
 *   - Card node gets two child nodes (Play, Info) via HorizontalList
 *   - Events now travel DOWN into the child nodes first (core handleEvent flow)
 *   - left/right → caught by the inner HorizontalList, navigates between Play/Info
 *   - up/down → children return false, card's onEvent returns false, parent row handles it
 *   - back → card's onEvent catches it, closes the overlay
 *   - enter on Play/Info → each button handles it independently
 *
 * This is pure core behavior — no extra API needed. The tree structure itself
 * controls which component receives events at any given moment.
 *
 * Props:
 *   fKey    — unique key within the parent HorizontalList's focus scope.
 *   item    — content data (title, year, background color).
 *   onPress — called when the user selects Play (reported to the event log).
 */

import { useState, useRef } from 'react';
import { useFocusable, HorizontalList } from '@navix/react';
import type { NavEvent } from '@navix/core';
import type { ContentItem } from '../data';

interface ContentCardProps {
  fKey: string;
  item: ContentItem;
  onPress: () => void;
}

export function ContentCard({ fKey, item, onPress }: ContentCardProps) {
  const [isSelected, setIsSelected] = useState(false);

  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const { focused, directlyFocused, FocusProvider } = useFocusable(fKey, {
    onEvent: (e: NavEvent) => {
      // When selected, back closes the overlay and returns focus to this card.
      // The card node is still active in the parent row — no focus shift needed.
      if (isSelected && e.action === 'back' && e.type === 'press') {
        setIsSelected(false);
        return true;
      }

      // When not selected, enter opens the overlay.
      // Once selected, enter travels to the child HorizontalList first (core flow),
      // so this branch only fires when there are no children to consume it.
      if (!isSelected && e.action === 'enter' && e.type === 'press') {
        setIsSelected(true);
        return true;
      }

      // All other events (directional) bubble up to the parent row.
      return false;
    },
  });

  // Card is visually "active" when directly focused OR when the overlay is open
  const isActive = directlyFocused || (focused && isSelected);

  return (
    <FocusProvider>
      <div
        style={{
          width: 140,
          marginRight: 12,
          cursor: 'pointer',
          userSelect: 'none',
          transform: isActive ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          boxShadow: isActive
            ? '0 0 0 2px #4fc3f7, 0 8px 24px rgba(0,0,0,0.6)'
            : '0 2px 8px rgba(0,0,0,0.4)',
          borderRadius: 6,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Poster area */}
        <div
          style={{
            height: 200,
            background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}99 100%)`,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '10px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 3,
              padding: '2px 6px',
              fontSize: 10,
              color: '#aaa',
            }}
          >
            {item.year}
          </div>
          <div
            style={{
              fontSize: isActive ? 13 : 12,
              fontWeight: 700,
              color: isActive ? '#fff' : '#ddd',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              lineHeight: 1.2,
              transition: 'font-size 0.15s',
            }}
          >
            {item.title}
          </div>
        </div>

        {/* Bottom bar — replaced by action buttons when selected */}
        {!isSelected ? (
          <div
            style={{
              background: isActive ? '#1a2a3a' : '#111',
              padding: '6px 10px',
              fontSize: 11,
              color: isActive ? '#4fc3f7' : '#555',
              transition: 'all 0.15s',
            }}
          >
            ▶ Play
          </div>
        ) : (
          /*
           * Action overlay — only mounted when isSelected = true.
           * Mounting adds two child nodes to this card's focus node.
           * Core's handleEvent will now route events into these children first,
           * intercepting left/right before they reach the parent row.
           */
          <HorizontalList fKey={`${fKey}-actions`}>
            <div style={{ display: 'flex' }}>
              <ActionButton
                fKey={`${fKey}-play`}
                label="▶ Play"
                onPress={() => { onPressRef.current(); setIsSelected(false); }}
              />
              <ActionButton
                fKey={`${fKey}-info`}
                label="ℹ Info"
                onPress={() => { setIsSelected(false); }}
              />
            </div>
          </HorizontalList>
        )}
      </div>
    </FocusProvider>
  );
}

// ── ActionButton ──────────────────────────────────────────────────────────────

/**
 * ActionButton
 *
 * A leaf focus node inside the card's action overlay.
 * Registers into the parent HorizontalList when mounted,
 * unregisters automatically when the overlay closes (unmount).
 *
 * Props:
 *   fKey    — unique key within the card's HorizontalList.
 *   label   — button text.
 *   onPress — called on Enter press.
 */
function ActionButton({
  fKey,
  label,
  onPress,
}: {
  fKey: string;
  label: string;
  onPress: () => void;
}) {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const { directlyFocused, FocusProvider } = useFocusable(fKey, {
    onEvent: (e: NavEvent) => {
      if (e.action === 'enter' && e.type === 'press') {
        onPressRef.current();
        return true;
      }
      return false;
    },
  });

  return (
    <FocusProvider>
      <div
        style={{
          flex: 1,
          padding: '8px 4px',
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 600,
          background: directlyFocused ? '#4fc3f7' : '#1a2a3a',
          color: directlyFocused ? '#000' : '#aaa',
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
      >
        {label}
      </div>
    </FocusProvider>
  );
}

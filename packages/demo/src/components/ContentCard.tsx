/**
 * ContentCard
 *
 * A focusable media card built on <Expandable>.
 *
 * COLLAPSED state (isExpanded = false):
 *   - Shows poster + "▶ Play" bar
 *   - directlyFocused = true when this card is the active leaf
 *   - Enter → Expandable opens (isExpanded = true)
 *   - Left/right/up/down → bubble to parent HorizontalList / VerticalList
 *
 * EXPANDED state (isExpanded = true):
 *   - Shows poster + action buttons (Play, Info)
 *   - Inner HorizontalList mounts, its children register into the focus tree
 *   - Left/right → navigate between action buttons (caught by inner HorizontalList)
 *   - Back → Expandable closes (core ExpandableBehavior handles this)
 *   - Enter on a button → button's onEvent consumes it
 *
 * Props:
 *   fKey    — unique key within the parent HorizontalList's focus scope.
 *   item    — content data (title, year, background color).
 *   onPress — called when the user confirms Play.
 */

import { useRef } from 'react';
import { HorizontalList, useFocusable, Expandable } from '@navix/react';
import type { NavEvent } from '@navix/core';
import type { ContentItem } from '../data';

interface ContentCardProps {
  fKey: string;
  item: ContentItem;
  onPress: () => void;
}

export function ContentCard({ fKey, item, onPress }: ContentCardProps) {
  return (
    <Expandable fKey={fKey}>
      {({ isExpanded, focused, directlyFocused, collapse }) => {
        // Card is visually highlighted when directly focused OR when expanded
        // (expanded means focus went into children but card stays "active")
        const isActive = directlyFocused || (focused && isExpanded);

        return (
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
            }}
          >
            {/* Poster — always visible */}
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

            {/* Bottom area — switches between hint bar and action buttons */}
            {!isExpanded ? (
              // Collapsed: simple play hint
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
              // Expanded: action buttons mount into the focus tree.
              // HorizontalList registers as a child of this card's Expandable node.
              // Left/right now navigates between Play and Info instead of between cards.
              <HorizontalList fKey={`${fKey}-actions`}>
                <div style={{ display: 'flex' }}>
                  <ActionButton
                    fKey={`${fKey}-play`}
                    label="▶ Play"
                    onPress={() => { onPress(); collapse(); }}
                  />
                  <ActionButton
                    fKey={`${fKey}-info`}
                    label="ℹ Info"
                    onPress={() => { collapse(); }}
                  />
                </div>
              </HorizontalList>
            )}
          </div>
        );
      }}
    </Expandable>
  );
}

// ── ActionButton ──────────────────────────────────────────────────────────────

/**
 * ActionButton
 *
 * A leaf focus node inside the card's expanded action row.
 * Mounts into the focus tree when the card expands, unmounts when it collapses.
 *
 * Uses useFocusable directly (not <Expandable>) because it is a leaf —
 * it has no children and does not need expand/collapse behavior.
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

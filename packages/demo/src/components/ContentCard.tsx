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

import { useState } from 'react';
import { HorizontalList, Expandable, Button } from '@navix/react';
import type { ContentItem } from '../data';

// Accent colors applied to the poster when an action is triggered
const COLOR_PLAY = '#0d3b2e'; // dark green — now playing
const COLOR_INFO = '#1a1a4a'; // dark blue  — info viewed

interface ContentCardProps {
  fKey: string;
  item: ContentItem;
  // Called when the user confirms Play — used by the parent to log the event
  onPlay: () => void;
}

export function ContentCard({ fKey, item, onPlay }: ContentCardProps) {
  // posterColor starts as the item's original color, changes on Play/Info
  const [posterColor, setPosterColor] = useState(item.color);

  return (
    <Expandable fKey={fKey}>
      {({ isExpanded, focused, directlyFocused, collapse }) => {
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
            {/* Poster — color transitions when Play or Info is activated */}
            <div
              style={{
                height: 200,
                background: `linear-gradient(135deg, ${posterColor} 0%, ${posterColor}99 100%)`,
                display: 'flex',
                alignItems: 'flex-end',
                padding: '10px',
                position: 'relative',
                transition: 'background 0.3s ease',
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

            {!isExpanded ? (
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
              // Action overlay — HorizontalList mounts two Button nodes into the tree.
              // left/right navigates between them, back collapses via ExpandableBehavior.
              <HorizontalList fKey={`${fKey}-actions`}>
                <div style={{ display: 'flex' }}>
                  <Button
                    fKey={`${fKey}-play`}
                    style={{ flex: 1, padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, background: '#1a2a3a', color: '#aaa', transition: 'all 0.15s' }}
                    focusedStyle={{ background: '#4fc3f7', color: '#000' }}
                    onClick={() => {
                      setPosterColor(COLOR_PLAY);
                      onPlay();
                    }}
                  >
                    ▶ Play
                  </Button>
                  <Button
                    fKey={`${fKey}-info`}
                    style={{ flex: 1, padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, background: '#1a2a3a', color: '#aaa', transition: 'all 0.15s' }}
                    focusedStyle={{ background: '#4fc3f7', color: '#000' }}
                    onClick={() => {
                      setPosterColor(COLOR_INFO);
                      collapse();
                    }}
                  >
                    ℹ Info
                  </Button>
                </div>
              </HorizontalList>
            )}
          </div>
        );
      }}
    </Expandable>
  );
}

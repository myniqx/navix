/**
 * MenuItem
 *
 * A single focusable item inside the top navigation bar.
 * Uses `useFocusable` directly instead of the <FocusButton> wrapper so we can
 * apply TV-style focus styles (underline, color change) without any extra DOM node.
 *
 * Props:
 *   fKey     — unique key passed to useFocusable. Must be unique within the
 *              parent HorizontalList's focus tree scope.
 *   label    — display text for the menu item.
 *   onPress  — called when the user confirms selection with Enter.
 */

import { useRef } from 'react';
import { useFocusable } from '@navix/react';
import type { NavEvent } from '@navix/core';

interface MenuItemProps {
  fKey: string;
  label: string;
  onPress: () => void;
}

export function MenuItem({ fKey, label, onPress }: MenuItemProps) {
  // Keep onPress in a ref so the onEvent closure never goes stale
  // even if the parent re-renders with a new function reference.
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const { directlyFocused, FocusProvider } = useFocusable(fKey, {
    // onEvent receives every NavEvent that bubbles up to this node.
    // Return true to mark the event as consumed, false to let the parent handle it.
    onEvent: (e: NavEvent) => {
      if (e.action === 'enter' && e.type === 'press') {
        onPressRef.current();
        return true;
      }
      return false;
    },
  });

  return (
    // FocusProvider puts this node into React context so children can register.
    // MenuItem is a leaf — no focusable children — but FocusProvider is still
    // required to make this node visible to the parent HorizontalList.
    <FocusProvider>
      <div
        style={{
          padding: '8px 20px',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.05em',
          // directlyFocused: this exact node is the active leaf in the focus tree
          color: directlyFocused ? '#fff' : '#888',
          borderBottom: directlyFocused ? '2px solid #4fc3f7' : '2px solid transparent',
          transition: 'all 0.15s',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </FocusProvider>
  );
}

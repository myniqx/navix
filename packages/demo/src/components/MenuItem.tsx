/**
 * MenuItem
 *
 * A single focusable item inside the top navigation bar.
 * Uses `useFocusable` directly because it needs `directlyFocused` to apply
 * custom focus styling (underline + color). For simpler cases where you don't
 * need to read focus state in children, use <Button> instead.
 *
 * Props:
 *   fKey    — unique key within the parent HorizontalList's focus scope.
 *   label   — display text.
 *   onPress — called when the user confirms with Enter.
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
          padding: '8px 20px',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.05em',
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

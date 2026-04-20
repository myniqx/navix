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

import type { NavEvent } from '@navix/core';
import { useFocusable } from '@navix/react';
import { useRef } from 'react';

interface MenuItemProps {
  fKey: string;
  label: string;
  onClick: () => void;
}

export function MenuItem({ fKey, label, onClick }: MenuItemProps) {
  const onPressRef = useRef(onClick);
  onPressRef.current = onClick;

  const { directlyFocused, focusSelf, FocusProvider } = useFocusable(
    fKey,
    {},
    () => ({
      onEvent: (e: NavEvent) => {
        if (e.action === 'enter' && e.type === 'press') {
          onPressRef.current();
          return true;
        }
        return false;
      },
    }),
  );

  return (
    <FocusProvider>
      <div
        onMouseEnter={focusSelf}
        onClick={() => onPressRef.current()}
        style={{
          padding: '8px 20px',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: directlyFocused ? '#fff' : '#888',
          borderBottom: directlyFocused
            ? '2px solid #4fc3f7'
            : '2px solid transparent',
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

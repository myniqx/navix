/**
 * MenuItem
 *
 * A single focusable item inside the top navigation bar.
 * Uses `useFocusable` directly because it needs `directlyFocused` to apply
 * custom focus styling (underline + color). For simpler cases where you don't
 * need to read focus state in children, use <NavixButton> instead.
 *
 * Props:
 *   fKey    — unique key within the parent NavixHorizontalList's focus scope.
 *   label   — display text.
 *   onPress — called when the user confirms with Enter.
 */

import type { NavEvent } from '@navix/react';
import { useFocusable } from '@navix/react';
import { useRef } from 'react';

interface MenuItemProps {
  fKey: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function MenuItem({ fKey, label, onClick, disabled = false }: MenuItemProps) {
  const onPressRef = useRef(onClick);
  onPressRef.current = onClick;

  const { directlyFocused, focusSelf, FocusProvider } = useFocusable(
    fKey,
    { disabled },
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
        onMouseEnter={disabled ? undefined : focusSelf}
        onClick={disabled ? undefined : () => onPressRef.current()}
        style={{
          padding: '8px 20px',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: disabled ? '#444' : directlyFocused ? '#fff' : '#888',
          borderBottom: directlyFocused
            ? '2px solid #4fc3f7'
            : '2px solid transparent',
          transition: 'all 0.15s',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          opacity: disabled ? 0.5 : 1,
          textDecoration: disabled ? 'line-through' : 'none',
        }}
      >
        {label}
      </div>
    </FocusProvider>
  );
}

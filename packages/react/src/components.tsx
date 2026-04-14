import { useRef, useEffect, type ReactNode } from 'react';
import {
  HorizontalListBehavior,
  VerticalListBehavior,
  GridBehavior,
} from '@navix/core';
import type { NavEvent } from '@navix/core';
import { useFocusable } from './useFocusable';

// Horizontal container — left/right navigation
export function HorizontalList({
  fKey,
  children,
}: {
  fKey: string;
  children: ReactNode;
}) {
  const { node, FocusProvider } = useFocusable(fKey);
  const behaviorRef = useRef(false);
  if (!behaviorRef.current) {
    new HorizontalListBehavior(node);
    behaviorRef.current = true;
  }
  return <FocusProvider>{children}</FocusProvider>;
}

// Vertical container — up/down navigation
export function VerticalList({
  fKey,
  children,
}: {
  fKey: string;
  children: ReactNode;
}) {
  const { node, FocusProvider } = useFocusable(fKey);
  const behaviorRef = useRef(false);
  if (!behaviorRef.current) {
    new VerticalListBehavior(node);
    behaviorRef.current = true;
  }
  return <FocusProvider>{children}</FocusProvider>;
}

// Grid container — 4-direction navigation with column count
export function Grid({
  fKey,
  columns,
  children,
}: {
  fKey: string;
  columns: number;
  children: ReactNode;
}) {
  const { node, FocusProvider } = useFocusable(fKey);
  const behaviorRef = useRef(false);
  if (!behaviorRef.current) {
    new GridBehavior(node, columns);
    behaviorRef.current = true;
  }
  return <FocusProvider>{children}</FocusProvider>;
}

// Leaf button — consumes enter events, does NOT provide context to children
export function FocusButton({
  fKey,
  onPress,
  onLongPress,
  onDoublePress,
  children,
}: {
  fKey: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onDoublePress?: () => void;
  children: ReactNode;
}) {
  // Store latest callbacks in a ref to avoid stale closures
  const handlersRef = useRef({ onPress, onLongPress, onDoublePress });
  useEffect(() => {
    handlersRef.current = { onPress, onLongPress, onDoublePress };
  });

  const { node, directlyFocused } = useFocusable(fKey, {
    onEvent: (event: NavEvent): boolean => {
      if (event.action !== 'enter') return false;
      if (event.type === 'press')       { handlersRef.current.onPress?.();       return true; }
      if (event.type === 'longpress')   { handlersRef.current.onLongPress?.();   return true; }
      if (event.type === 'doublepress') { handlersRef.current.onDoublePress?.(); return true; }
      return false;
    },
  });

  return (
    <div
      data-focused={directlyFocused}
      style={{
        outline: directlyFocused ? '2px solid #00bfff' : '2px solid transparent',
        display: 'inline-block',
      }}
    >
      {children}
    </div>
  );
}

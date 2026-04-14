import { useRef, type ReactNode } from 'react';
import { ListBehavior, GridBehavior, ButtonBehavior } from '@navix/core';
import { useFocusable } from './useFocusable';

// Horizontal container — left/right navigation between children
export function HorizontalList({ fKey, children }: { fKey: string; children: ReactNode }) {
  const { node, FocusProvider } = useFocusable(fKey);
  const behaviorRef = useRef(false);
  if (!behaviorRef.current) {
    new ListBehavior(node, 'horizontal');
    behaviorRef.current = true;
  }
  return <FocusProvider>{children}</FocusProvider>;
}

// Vertical container — up/down navigation between children
export function VerticalList({ fKey, children }: { fKey: string; children: ReactNode }) {
  const { node, FocusProvider } = useFocusable(fKey);
  const behaviorRef = useRef(false);
  if (!behaviorRef.current) {
    new ListBehavior(node, 'vertical');
    behaviorRef.current = true;
  }
  return <FocusProvider>{children}</FocusProvider>;
}

// Grid container — 4-direction navigation with column count for row wrapping
export function Grid({ fKey, columns, children }: { fKey: string; columns: number; children: ReactNode }) {
  const { node, FocusProvider } = useFocusable(fKey);
  const behaviorRef = useRef(false);
  if (!behaviorRef.current) {
    new GridBehavior(node, columns);
    behaviorRef.current = true;
  }
  return <FocusProvider>{children}</FocusProvider>;
}

/**
 * Button — leaf focusable node. Wraps children in a single element and sets
 * `data-focused="true"` on it when this node is the active leaf in the tree.
 *
 * No FocusProvider — Button is always a leaf, it has no focusable children.
 *
 * Styling is left entirely to the consumer via the `data-focused` attribute:
 *   [data-focused="true"] { outline: 2px solid #4fc3f7; }
 *
 * Props:
 *   fKey          — unique key within the parent container's focus scope.
 *   onPress       — fired on Enter press.
 *   onLongPress   — fired when Enter is held (default threshold: 500ms).
 *   onDoublePress — fired on quick double Enter tap (default window: 300ms).
 *   children      — any React content; receives no focus props directly.
 *                   Use `data-focused` on the wrapper for styling.
 */
export function Button({
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
  // Refs keep callbacks stable — ButtonBehavior captures them without going stale
  const onPressRef = useRef(onPress);
  const onLongPressRef = useRef(onLongPress);
  const onDoublePressRef = useRef(onDoublePress);
  onPressRef.current = onPress;
  onLongPressRef.current = onLongPress;
  onDoublePressRef.current = onDoublePress;

  const { node, directlyFocused } = useFocusable(fKey);

  const behaviorRef = useRef(false);
  if (!behaviorRef.current) {
    new ButtonBehavior(node, {
      onPress: () => onPressRef.current?.(),
      onLongPress: () => onLongPressRef.current?.(),
      onDoublePress: () => onDoublePressRef.current?.(),
    });
    behaviorRef.current = true;
  }

  return (
    <div data-focused={directlyFocused} style={{ display: 'inline-block' }}>
      {children}
    </div>
  );
}

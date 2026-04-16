import { useRef, type ReactNode } from 'react';
import type React from 'react';
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
  const behaviorRef = useRef<GridBehavior | null>(null);
  if (behaviorRef.current === null) {
    behaviorRef.current = new GridBehavior(node, columns);
  }
  behaviorRef.current.columns = columns;
  return <FocusProvider>{children}</FocusProvider>;
}

// Render prop signature — children as a function that receives focus state
type ButtonRenderFn = (props: { focused: boolean }) => ReactNode;

/**
 * Button — leaf focusable node.
 *
 * onClick fires on both mouse click and keyboard Enter — they are the same action.
 * onLongPress and onDoublePress are keyboard-only (no mouse equivalent).
 *
 * Two ways to handle focus styling:
 *
 * 1. focusedStyle prop — merged onto the wrapper div when focused:
 *      <Button style={{ background: '#222' }} focusedStyle={{ background: '#4fc3f7' }}>
 *        Play
 *      </Button>
 *
 * 2. Render prop — children as a function that receives { focused }:
 *      <Button>
 *        {({ focused }) => (
 *          <div style={{ color: focused ? '#fff' : '#888' }}>Play</div>
 *        )}
 *      </Button>
 *
 * Both can be used at the same time. All other div props (className, etc.)
 * are forwarded to the wrapper div.
 */
export function Button({
  fKey,
  onClick,
  onLongPress,
  onDoublePress,
  style,
  focusedStyle,
  children,
  ...rest
}: {
  fKey: string;
  onClick?: () => void;
  onLongPress?: () => void;
  onDoublePress?: () => void;
  style?: React.CSSProperties;
  // Applied on top of `style` when this node is the focused leaf
  focusedStyle?: React.CSSProperties;
  children: ReactNode | ButtonRenderFn;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick' | 'style' | 'children'>) {
  const onClickRef = useRef(onClick);
  const onLongPressRef = useRef(onLongPress);
  const onDoublePressRef = useRef(onDoublePress);
  onClickRef.current = onClick;
  onLongPressRef.current = onLongPress;
  onDoublePressRef.current = onDoublePress;

  const { node, directlyFocused, focusSelf } = useFocusable(fKey);

  const behaviorRef = useRef(false);
  if (!behaviorRef.current) {
    new ButtonBehavior(node, {
      onPress: () => onClickRef.current?.(),
      onLongPress: () => onLongPressRef.current?.(),
      onDoublePress: () => onDoublePressRef.current?.(),
    });
    behaviorRef.current = true;
  }

  // Merge focusedStyle on top of style when focused
  const mergedStyle: React.CSSProperties = {
    display: 'inline-block',
    cursor: 'pointer',
    ...style,
    ...(directlyFocused ? focusedStyle : undefined),
  };

  // Support both plain children and render prop
  const rendered = typeof children === 'function'
    ? (children as ButtonRenderFn)({ focused: directlyFocused })
    : children;

  return (
    <div
      {...rest}
      data-focused={directlyFocused}
      style={mergedStyle}
      onMouseEnter={focusSelf}
      onClick={(e) => { e.stopPropagation(); onClickRef.current?.(); }}
    >
      {rendered}
    </div>
  );
}

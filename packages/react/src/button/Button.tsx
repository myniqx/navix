import { ButtonBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useRef, type ReactNode } from 'react';
import type React from 'react';

import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';

type ButtonRenderFn = (props: { focused: boolean }) => ReactNode;

interface ButtonProps extends BaseComponentProps {
  onClick?: () => void;
  onLongPress?: () => void;
  onDoublePress?: () => void;
  style?: React.CSSProperties;
  focusedStyle?: React.CSSProperties;
  className?: string;
  focusedClassName?: string;
  children: ReactNode | ButtonRenderFn;
}

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
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  onEvent,
  style,
  focusedStyle,
  className,
  focusedClassName,
  children,
  ...rest
}: ButtonProps &
  Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'onClick' | 'style' | 'children' | 'className' | 'onFocus'
  >) {
  const onClickRef = useRef(onClick);
  const onLongPressRef = useRef(onLongPress);
  const onDoublePressRef = useRef(onDoublePress);
  onClickRef.current = onClick;
  onLongPressRef.current = onLongPress;
  onDoublePressRef.current = onDoublePress;

  const { directlyFocused, focusSelf } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (node: FocusNode) =>
      new ButtonBehavior(node, {
        onPress: () => onClickRef.current?.(),
        onLongPress: () => onLongPressRef.current?.(),
        onDoublePress: () => onDoublePressRef.current?.(),
      }),
  );

  const mergedStyle: React.CSSProperties = {
    display: 'inline-block',
    cursor: 'pointer',
    ...style,
    ...(directlyFocused ? focusedStyle : undefined),
  };

  const mergedClassName = mergeClassName(
    className,
    directlyFocused ? focusedClassName : undefined,
  );

  const rendered =
    typeof children === 'function'
      ? (children as ButtonRenderFn)({ focused: directlyFocused })
      : children;

  return (
    <div
      {...rest}
      data-focused={directlyFocused}
      style={mergedStyle}
      className={mergedClassName || undefined}
      onMouseEnter={focusSelf}
      onClick={(e) => {
        e.stopPropagation();
        onClickRef.current?.();
      }}
    >
      {rendered}
    </div>
  );
}

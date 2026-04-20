import { type ReactNode } from 'react';
import { ListBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useFocusable } from '../useFocusable';
import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import type React from 'react';

interface VerticalListProps extends BaseComponentProps {
  children: ReactNode;
  className?: string;
  focusedClassName?: string;
  style?: React.CSSProperties;
  focusedStyle?: React.CSSProperties;
}

export function VerticalList({
  fKey,
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  onEvent,
  children,
  className,
  focusedClassName,
  style,
  focusedStyle,
}: VerticalListProps) {
  const { focused, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (node: FocusNode) => new ListBehavior(node, 'vertical'),
  );

  const hasWrapper = className || focusedClassName || style || focusedStyle;

  if (!hasWrapper) {
    return <FocusProvider>{children}</FocusProvider>;
  }

  const mergedClassName = mergeClassName(
    className,
    focused ? focusedClassName : undefined,
  );
  const mergedStyle = { ...style, ...(focused ? focusedStyle : undefined) };

  return (
    <FocusProvider>
      <div className={mergedClassName || undefined} style={mergedStyle}>
        {children}
      </div>
    </FocusProvider>
  );
}

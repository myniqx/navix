import { ListBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useMemo, type ReactNode } from 'react';
import type React from 'react';

import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';

interface HorizontalListProps extends BaseComponentProps {
  children: ReactNode;
  className?: string;
  focusedClassName?: string;
  style?: React.CSSProperties;
  focusedStyle?: React.CSSProperties;
}

export function HorizontalList({
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
}: HorizontalListProps) {
  const { focused, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (node: FocusNode) => new ListBehavior(node, 'horizontal'),
  );

  const hasWrapper = className || focusedClassName || style || focusedStyle;

  if (!hasWrapper) {
    return <FocusProvider>{children}</FocusProvider>;
  }

  const mergedClassName = useMemo(
    () => mergeClassName(className, focused ? focusedClassName : undefined),
    [className, focusedClassName, focused],
  );
  const mergedStyle = useMemo(
    () => ({ ...style, ...(focused ? focusedStyle : undefined) }),
    [style, focusedStyle, focused],
  );

  return (
    <FocusProvider>
      <div className={mergedClassName || undefined} style={mergedStyle}>
        {children}
      </div>
    </FocusProvider>
  );
}

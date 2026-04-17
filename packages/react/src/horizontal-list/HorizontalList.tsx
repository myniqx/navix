import { type ReactNode } from 'react';
import { ListBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useFocusable } from '../useFocusable';
import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import type React from 'react';

interface HorizontalListProps extends BaseComponentProps {
  children: ReactNode;
  className?: string;
  focusedClassName?: string;
  style?: React.CSSProperties;
  focusedStyle?: React.CSSProperties;
}

export function HorizontalList({ fKey, onFocus, onBlurred, onRegister, onUnregister, children, className, focusedClassName, style, focusedStyle }: HorizontalListProps) {
  const { focused, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister },
    (node: FocusNode) => new ListBehavior(node, 'horizontal'),
  );

  const hasWrapper = className || focusedClassName || style || focusedStyle;

  if (!hasWrapper) {
    return <FocusProvider>{children}</FocusProvider>;
  }

  const mergedClassName = mergeClassName(className, focused ? focusedClassName : undefined);
  const mergedStyle = { ...style, ...(focused ? focusedStyle : undefined) };

  return (
    <FocusProvider>
      <div
        className={mergedClassName || undefined}
        style={mergedStyle}
      >
        {children}
      </div>
    </FocusProvider>
  );
}

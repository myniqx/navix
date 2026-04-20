import { GridBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useRef, type ReactNode } from 'react';
import type React from 'react';

import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';

interface GridProps extends BaseComponentProps {
  columns: number;
  children: ReactNode;
  className?: string;
  focusedClassName?: string;
  style?: React.CSSProperties;
  focusedStyle?: React.CSSProperties;
}

export function Grid({
  fKey,
  columns,
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
}: GridProps) {
  const behaviorRef = useRef<GridBehavior | null>(null);

  const { focused, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (node: FocusNode) => {
      behaviorRef.current = new GridBehavior(node, columns);
      return behaviorRef.current;
    },
  );

  if (behaviorRef.current) {
    behaviorRef.current.columns = columns;
  }

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

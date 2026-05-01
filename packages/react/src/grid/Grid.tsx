import { GridBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useEffect, useMemo, type ReactNode } from 'react';
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
  const { focused, FocusProvider, node } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (n: FocusNode) => new GridBehavior(n, columns),
  );

  useEffect(() => {
    (node.behavior as GridBehavior).columns = columns;
  }, [columns, node]);

  const hasWrapper = className || focusedClassName || style || focusedStyle;

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
      {hasWrapper ? (
        <div
          data-navix-node-id={node.id}
          className={mergedClassName || undefined}
          style={mergedStyle}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </FocusProvider>
  );
}

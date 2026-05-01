import { ListBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useMemo, useRef, type ReactNode } from 'react';
import type React from 'react';

import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import { useChildReorder } from '../useChildReorder';
import { useFocusable } from '../useFocusable';

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
  const { node, focused, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (n: FocusNode) => new ListBehavior(n, 'vertical'),
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  useChildReorder(node, containerRef);

  const hasWrapper = !!(className || focusedClassName || style || focusedStyle);

  const mergedClassName = useMemo(
    () => mergeClassName(className, focused ? focusedClassName : undefined),
    [className, focusedClassName, focused],
  );
  const mergedStyle = useMemo<React.CSSProperties>(
    () =>
      hasWrapper
        ? { ...style, ...(focused ? focusedStyle : undefined) }
        : { display: 'contents' },
    [hasWrapper, style, focusedStyle, focused],
  );

  return (
    <FocusProvider>
      <div
        ref={containerRef}
        data-navix-node-id={node.id}
        className={hasWrapper ? mergedClassName || undefined : undefined}
        style={mergedStyle}
      >
        {children}
      </div>
    </FocusProvider>
  );
}

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react';
import { PaginatedListBehavior } from '@navix/core';
import type { FocusNode, PaginatedListOrientation } from '@navix/core';
import { useFocusable } from '../useFocusable';
import type { BaseComponentProps } from '../types';

interface PaginatedListProps<T> extends BaseComponentProps {
  orientation?: PaginatedListOrientation;
  visibleCount: number;
  threshold: number;
  items: T[];
  renderItem: (item: T, fKey: string) => ReactNode;
  gap?: number;
  buffer?: number;
  outerStyle?: CSSProperties;
  innerStyle?: CSSProperties;
  slotStyle?: CSSProperties;
}

export function PaginatedList<T>({
  fKey,
  orientation = 'horizontal',
  visibleCount,
  threshold,
  items,
  renderItem,
  gap = 0,
  buffer = 2,
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  outerStyle: outerStyleProp,
  innerStyle: innerStyleProp,
  slotStyle: slotStyleProp,
}: PaginatedListProps<T>) {
  const [viewOffset, setViewOffset] = useState(0);
  const [containerSize, setContainerSize] = useState(0);
  const outerRef = useRef<HTMLDivElement | null>(null);

  const { node, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister },
    (n: FocusNode) => new PaginatedListBehavior(n, orientation, items.length, visibleCount, threshold),
  );

  const behavior = node.behavior as PaginatedListBehavior;

  // Stable keys tied to this items array reference.
  // When items changes (new array), prefix regenerates — all children remount.
  const itemKeys = useMemo(() => {
    const prefix = Math.random().toString(36).slice(2);
    return items.map((_, i) => `${fKey}-${prefix}-${i}`);
  }, [items]);

  behavior.totalCount = items.length;
  behavior.visibleCount = visibleCount;
  behavior.threshold = threshold;

  behavior.onChange = (newIndex: number, newOffset: number) => {
    setViewOffset(newOffset);
    behavior.focusByKey(itemKeys[newIndex]!);
  };

  const isHorizontal = orientation === 'horizontal';

  const measureRef = useCallback((el: HTMLDivElement | null) => {
    outerRef.current = el;
    if (el) {
      setContainerSize(isHorizontal ? el.offsetWidth : el.offsetHeight);
    }
  }, [isHorizontal]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize(isHorizontal ? entry.contentRect.width : entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isHorizontal]);

  const totalGap = (visibleCount - 1) * gap;
  const slotWidth = containerSize > 0 ? (containerSize - totalGap) / visibleCount : 0;
  const step = slotWidth + gap;
  const translate = -viewOffset * step;

  const renderStart = Math.max(0, viewOffset - buffer);
  const renderEnd = Math.min(items.length, viewOffset + visibleCount + buffer);
  const paddingBefore = renderStart * step;

  // Internal styles — user props merged first, functional overrides applied on top
  const outerStyle: CSSProperties = {
    ...outerStyleProp,
    overflow: 'hidden',
    width: '100%',
  };

  const innerStyle: CSSProperties = {
    ...innerStyleProp,
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    gap,
    transform: isHorizontal
      ? `translateX(${translate}px)`
      : `translateY(${translate}px)`,
    transition: 'transform 0.25s ease',
  };

  const spacerStyle: CSSProperties = isHorizontal
    ? { minWidth: paddingBefore, flexShrink: 0 }
    : { minHeight: paddingBefore, flexShrink: 0 };

  const slotStyle: CSSProperties = {
    ...slotStyleProp,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...(isHorizontal ? { width: slotWidth } : { height: slotWidth }),
  };

  return (
    <FocusProvider>
      <div ref={measureRef} style={outerStyle}>
        <div style={innerStyle}>
          {paddingBefore > 0 && <div style={spacerStyle} />}
          {items.slice(renderStart, renderEnd).map((item, localIdx) => {
            const globalIdx = renderStart + localIdx;
            const itemKey = itemKeys[globalIdx]!;
            return (
              <div key={itemKey} style={slotStyle}>
                {renderItem(item, itemKey)}
              </div>
            );
          })}
        </div>
      </div>
    </FocusProvider>
  );
}

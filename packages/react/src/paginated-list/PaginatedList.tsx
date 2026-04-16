import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react';
import { PaginatedListBehavior } from '@navix/core';
import type { FocusNode, PaginatedListOrientation } from '@navix/core';
import { useFocusable } from '../useFocusable';

export type PaginatedListAction = 'visible' | 'hidden' | 'focused' | 'blurred';

interface PaginatedListProps<T> {
  fKey: string;
  orientation?: PaginatedListOrientation;
  visibleCount: number;
  threshold: number;
  items: T[];
  renderItem: (item: T, fKey: string) => ReactNode;
  gap?: number;
  buffer?: number;
  onItemAction?: (action: PaginatedListAction, item: T) => void;
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
  onItemAction,
  outerStyle: outerStyleProp,
  innerStyle: innerStyleProp,
  slotStyle: slotStyleProp,
}: PaginatedListProps<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewOffset, setViewOffset] = useState(0);
  const [containerSize, setContainerSize] = useState(0);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusKeyRef = useRef<string | null>(null);
  const onItemActionRef = useRef(onItemAction);
  onItemActionRef.current = onItemAction;

  const { node, FocusProvider } = useFocusable(fKey);

  // Stable keys tied to this items array reference.
  // When items changes (new array), prefix regenerates — all children remount.
  const itemKeys = useMemo(() => {
    const prefix = Math.random().toString(36).slice(2);
    return items.map((_, i) => `${fKey}-${prefix}-${i}`);
  }, [items]);

  // Reverse lookup: itemKey → item (for callbacks)
  const keyToItem = useMemo(() => {
    const map = new Map<string, T>();
    items.forEach((item, i) => map.set(itemKeys[i]!, item));
    return map;
  }, [itemKeys, items]);

  const behaviorRef = useRef<PaginatedListBehavior | null>(null);
  if (behaviorRef.current === null) {
    behaviorRef.current = new PaginatedListBehavior(
      node, orientation, items.length, visibleCount, threshold,
    );
  }

  const behavior = behaviorRef.current;
  behavior.totalCount = items.length;
  behavior.visibleCount = visibleCount;
  behavior.threshold = threshold;

  behavior.onChange = (newIndex: number, newOffset: number) => {
    const prevIndex = behavior.activeIndex === newIndex ? null : behavior.activeIndex;

    setActiveIndex(newIndex);
    setViewOffset(newOffset);

    if (prevIndex !== null) {
      const blurredItem = items[prevIndex];
      if (blurredItem) onItemActionRef.current?.('blurred', blurredItem);
    }
    const focusedItem = items[newIndex];
    if (focusedItem) onItemActionRef.current?.('focused', focusedItem);

    const targetKey = itemKeys[newIndex]!;
    const child = node.children.find((c: FocusNode) => c.key === targetKey);
    if (child) {
      node.focusChild(child.id);
    } else {
      pendingFocusKeyRef.current = targetKey;
    }
  };

  behavior.onChildRegistered = (child: FocusNode) => {
    const item = keyToItem.get(child.key);
    if (item) onItemActionRef.current?.('visible', item);

    if (pendingFocusKeyRef.current !== null && child.key === pendingFocusKeyRef.current) {
      pendingFocusKeyRef.current = null;
      node.focusChild(child.id);
    }
  };

  behavior.onChildUnregistered = (child: FocusNode) => {
    const item = keyToItem.get(child.key);
    if (item) onItemActionRef.current?.('hidden', item);
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

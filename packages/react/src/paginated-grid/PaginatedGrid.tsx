import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react';
import { PaginatedGridBehavior } from '@navix/core';
import type { FocusNode, PaginatedGridOrientation } from '@navix/core';
import { useFocusable } from '../useFocusable';

export type PaginatedGridAction = 'visible' | 'hidden' | 'focused' | 'blurred';

interface PaginatedGridProps<T> {
  fKey: string;
  orientation?: PaginatedGridOrientation;
  rows: number;
  columns: number;
  threshold: number;
  items: T[];
  renderItem: (item: T, fKey: string) => ReactNode;
  gap?: number;
  buffer?: number;
  onItemAction?: (action: PaginatedGridAction, item: T) => void;
  outerStyle?: CSSProperties;
  innerStyle?: CSSProperties;
  slotStyle?: CSSProperties;
}

export function PaginatedGrid<T>({
  fKey,
  orientation = 'horizontal',
  rows,
  columns,
  threshold,
  items,
  renderItem,
  gap = 0,
  buffer = 1,
  onItemAction,
  outerStyle: outerStyleProp,
  innerStyle: innerStyleProp,
  slotStyle: slotStyleProp,
}: PaginatedGridProps<T>) {
  const [, setActiveIndex] = useState(0);
  const [viewOffset, setViewOffset] = useState(0);
  const [containerMainSize, setContainerMainSize] = useState(0);
  const [containerCrossSize, setContainerCrossSize] = useState(0);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusKeyRef = useRef<string | null>(null);
  const onItemActionRef = useRef(onItemAction);
  onItemActionRef.current = onItemAction;

  const isHorizontal = orientation === 'horizontal';
  const sliceSize = isHorizontal ? rows : columns;
  const visibleSlices = isHorizontal ? columns : rows;

  const { node, FocusProvider } = useFocusable(fKey);

  const itemKeys = useMemo(() => {
    const prefix = Math.random().toString(36).slice(2);
    return items.map((_, i) => `${fKey}-${prefix}-${i}`);
  }, [items]);

  const keyToItem = useMemo(() => {
    const map = new Map<string, T>();
    items.forEach((item, i) => map.set(itemKeys[i]!, item));
    return map;
  }, [itemKeys, items]);

  const behaviorRef = useRef<PaginatedGridBehavior | null>(null);
  if (behaviorRef.current === null) {
    behaviorRef.current = new PaginatedGridBehavior(
      node, orientation, items.length, rows, columns, threshold,
    );
  }

  const behavior = behaviorRef.current;
  behavior.totalCount = items.length;
  behavior.rows = rows;
  behavior.columns = columns;
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

  const measureRef = useCallback((el: HTMLDivElement | null) => {
    outerRef.current = el;
    if (el) {
      setContainerMainSize(isHorizontal ? el.offsetWidth : el.offsetHeight);
      setContainerCrossSize(isHorizontal ? el.offsetHeight : el.offsetWidth);
    }
  }, [isHorizontal]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerMainSize(isHorizontal ? entry.contentRect.width : entry.contentRect.height);
      setContainerCrossSize(isHorizontal ? entry.contentRect.height : entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isHorizontal]);

  // Main axis = pagination direction (horizontal → X, vertical → Y)
  const mainGaps = (visibleSlices - 1) * gap;
  const sliceMainSize = containerMainSize > 0 ? (containerMainSize - mainGaps) / visibleSlices : 0;
  const mainStep = sliceMainSize + gap;
  const translate = -viewOffset * mainStep;

  // Cross axis = within a slice (horizontal → Y rows, vertical → X columns)
  const crossCount = isHorizontal ? rows : columns;
  const crossGaps = (crossCount - 1) * gap;
  const slotCrossSize = containerCrossSize > 0 ? (containerCrossSize - crossGaps) / crossCount : 0;

  // Determine which slices to render
  const totalSlices = Math.ceil(items.length / sliceSize);
  const renderStartSlice = Math.max(0, viewOffset - buffer);
  const renderEndSlice = Math.min(totalSlices, viewOffset + visibleSlices + buffer);
  const paddingBefore = renderStartSlice * mainStep;

  // Build slices from items — items are ordered by slice (column-major for horizontal)
  const slices: { items: { item: T; globalIndex: number }[] }[] = [];
  for (let s = renderStartSlice; s < renderEndSlice; s++) {
    const startIdx = s * sliceSize;
    const endIdx = Math.min(startIdx + sliceSize, items.length);
    const sliceItems: { item: T; globalIndex: number }[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      sliceItems.push({ item: items[i]!, globalIndex: i });
    }
    slices.push({ items: sliceItems });
  }

  const outerStyle: CSSProperties = {
    ...outerStyleProp,
    overflow: 'hidden',
    width: '100%',
  };

  // Main axis container
  const mainContainerStyle: CSSProperties = {
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

  // Each slice is a column (horizontal) or row (vertical)
  const sliceStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'column' : 'row',
    gap,
    flexShrink: 0,
    ...(isHorizontal
      ? { width: sliceMainSize }
      : { height: sliceMainSize }),
  };

  const slotStyle: CSSProperties = {
    ...slotStyleProp,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...(isHorizontal
      ? { height: slotCrossSize }
      : { width: slotCrossSize }),
  };

  return (
    <FocusProvider>
      <div ref={measureRef} style={outerStyle}>
        <div style={mainContainerStyle}>
          {paddingBefore > 0 && <div style={spacerStyle} />}
          {slices.map((slice, sliceIdx) => (
            <div key={renderStartSlice + sliceIdx} style={sliceStyle}>
              {slice.items.map(({ item, globalIndex }) => {
                const itemKey = itemKeys[globalIndex]!;
                return (
                  <div key={itemKey} style={slotStyle}>
                    {renderItem(item, itemKey)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </FocusProvider>
  );
}

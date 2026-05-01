import { PaginatedGridBehavior } from '@navix/core';
import type { FocusNode, PaginatedGridOrientation } from '@navix/core';
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
  type ReactNode,
  type CSSProperties,
} from 'react';

import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';

interface SlotProps {
  item: any;
  itemKey: string;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderItemRef: React.RefObject<
    (item: any, fKey: string, index: number) => ReactNode
  >;
  slotStyle: CSSProperties;
  slotClassName?: string;
}

const Slot = memo(function Slot({
  item,
  itemKey,
  index,
  renderItemRef,
  slotStyle,
  slotClassName,
}: SlotProps) {
  return (
    <div style={slotStyle} className={slotClassName}>
      {renderItemRef.current(item, itemKey, index)}
    </div>
  );
});

interface PaginatedGridProps<T> extends BaseComponentProps {
  orientation?: PaginatedGridOrientation;
  rows: number;
  columns: number;
  threshold: number;
  items: T[];
  renderItem: (item: T, fKey: string, index: number) => ReactNode;
  keyForItem?: (item: T, index: number) => string;
  groupKey?: string;
  gap?: number;
  buffer?: number;
  outerStyle?: CSSProperties;
  outerClassName?: string;
  innerStyle?: CSSProperties;
  innerClassName?: string;
  slotStyle?: CSSProperties;
  slotClassName?: string;
}

interface GroupSelection {
  activeIndex: number;
  viewOffset: number;
}

export function PaginatedGrid<T>({
  fKey,
  orientation = 'horizontal',
  rows,
  columns,
  threshold,
  items,
  renderItem,
  keyForItem,
  groupKey,
  gap = 0,
  buffer = 1,
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  onEvent,
  outerStyle: outerStyleProp,
  outerClassName,
  innerStyle: innerStyleProp,
  innerClassName,
  slotStyle: slotStyleProp,
  slotClassName,
}: PaginatedGridProps<T>) {
  const [viewOffset, setViewOffset] = useState(0);
  const [containerMainSize, setContainerMainSize] = useState(0);
  const [containerCrossSize, setContainerCrossSize] = useState(0);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const effectiveOrientation =
    orientation === 'auto-horizontal'
      ? items.length < rows * columns
        ? 'vertical'
        : 'horizontal'
      : orientation;
  const isHorizontal = effectiveOrientation === 'horizontal';
  const sliceSize = isHorizontal ? rows : columns;
  const visibleSlices = isHorizontal ? columns : rows;

  const keyForItemRef = useRef(keyForItem);
  keyForItemRef.current = keyForItem;

  const itemKeys = useMemo(() => {
    const fn = keyForItemRef.current;
    return items.map((item, i) =>
      fn ? fn(item, i) : `${fKey}-${i}`,
    );
  }, [fKey, items, keyForItem]);

  const itemKeysRef = useRef(itemKeys);
  itemKeysRef.current = itemKeys;

  const selectionByGroupRef = useRef<Map<string, GroupSelection>>(new Map());
  const currentGroupKeyRef = useRef<string | undefined>(groupKey);

  const { node, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (n: FocusNode) => {
      const b = new PaginatedGridBehavior(
        n,
        orientation,
        items.length,
        rows,
        columns,
        threshold,
        () => {},
        (key) => itemKeysRef.current.indexOf(key),
      );
      const initialGroup = currentGroupKeyRef.current;
      const restored =
        initialGroup !== undefined
          ? selectionByGroupRef.current.get(initialGroup)
          : undefined;
      if (restored) {
        b.activeIndex = restored.activeIndex;
        b.viewOffset = restored.viewOffset;
      }
      return b;
    },
  );

  const behavior = node.behavior as PaginatedGridBehavior;

  // Sync initial viewOffset state from restored behavior on first mount.
  const didInitRef = useRef(false);
  if (!didInitRef.current) {
    didInitRef.current = true;
    if (behavior.viewOffset !== 0) {
      // Defer to avoid setState during render.
      queueMicrotask(() => setViewOffset(behavior.viewOffset));
    }
  }

  // Handle groupKey switch: commit previous, restore new, focus.
  useEffect(() => {
    const prevGroup = currentGroupKeyRef.current;
    if (prevGroup === groupKey) return;

    if (prevGroup !== undefined && items.length > 0) {
      selectionByGroupRef.current.set(prevGroup, {
        activeIndex: behavior.activeIndex,
        viewOffset: behavior.viewOffset,
      });
    }

    const restored =
      groupKey !== undefined
        ? selectionByGroupRef.current.get(groupKey)
        : undefined;
    behavior.activeIndex = restored?.activeIndex ?? 0;
    behavior.viewOffset = restored?.viewOffset ?? 0;
    setViewOffset(behavior.viewOffset);
    currentGroupKeyRef.current = groupKey;

    if (items.length > 0) {
      const idx = behavior.activeIndex;
      const keys = itemKeysRef.current;
      if (idx >= 0 && idx < keys.length) {
        behavior.focusByKey(keys[idx]!);
      }
    }
  }, [behavior, groupKey, items]);

  const renderItemRef = useRef(renderItem) as React.RefObject<
    (item: any, fKey: string, index: number) => ReactNode
  >;
  renderItemRef.current = renderItem;

  useEffect(() => {
    behavior.totalCount = items.length;
    behavior.rows = rows;
    behavior.columns = columns;
    behavior.orientation = orientation;
    behavior.threshold = threshold;
  }, [behavior, items.length, rows, columns, orientation, threshold]);

  useEffect(() => {
    behavior.onChange = (newIndex: number, newOffset: number) => {
      setViewOffset(newOffset);
      const group = currentGroupKeyRef.current;
      if (group !== undefined) {
        selectionByGroupRef.current.set(group, {
          activeIndex: newIndex,
          viewOffset: newOffset,
        });
      }
      behavior.focusByKey(itemKeys[newIndex]!);
    };
  }, [behavior, itemKeys]);

  const measureRef = useCallback(
    (el: HTMLDivElement | null) => {
      outerRef.current = el;
      if (el) {
        setContainerMainSize(isHorizontal ? el.offsetWidth : el.offsetHeight);
        setContainerCrossSize(isHorizontal ? el.offsetHeight : el.offsetWidth);
      }
    },
    [isHorizontal],
  );

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerMainSize(
        isHorizontal ? entry.contentRect.width : entry.contentRect.height,
      );
      setContainerCrossSize(
        isHorizontal ? entry.contentRect.height : entry.contentRect.width,
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isHorizontal]);

  // Main axis = pagination direction (horizontal → X, vertical → Y)
  const mainGaps = (visibleSlices - 1) * gap;
  const sliceMainSize =
    containerMainSize > 0 ? (containerMainSize - mainGaps) / visibleSlices : 0;
  const mainStep = sliceMainSize + gap;
  const translate = -viewOffset * mainStep;

  // Cross axis = within a slice (horizontal → Y rows, vertical → X columns)
  const crossCount = isHorizontal ? rows : columns;
  const crossGaps = (crossCount - 1) * gap;
  const slotCrossSize =
    containerCrossSize > 0 ? (containerCrossSize - crossGaps) / crossCount : 0;

  // Determine which slices to render
  const totalSlices = Math.ceil(items.length / sliceSize);
  const renderStartSlice = Math.max(0, viewOffset - buffer);
  const renderEndSlice = Math.min(
    totalSlices,
    viewOffset + visibleSlices + buffer,
  );
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

  const outerStyle = useMemo<CSSProperties>(
    () => ({ ...outerStyleProp, overflow: 'hidden', width: '100%' }),
    [outerStyleProp],
  );

  const mainContainerStyle = useMemo<CSSProperties>(
    () => ({
      ...innerStyleProp,
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
      gap,
      transform: isHorizontal
        ? `translateX(${translate}px)`
        : `translateY(${translate}px)`,
      transition: 'transform 0.25s ease',
    }),
    [innerStyleProp, isHorizontal, gap, translate],
  );

  const spacerStyle = useMemo<CSSProperties>(
    () =>
      isHorizontal
        ? { minWidth: paddingBefore, flexShrink: 0 }
        : { minHeight: paddingBefore, flexShrink: 0 },
    [isHorizontal, paddingBefore],
  );

  const sliceStyle = useMemo<CSSProperties>(
    () => ({
      display: 'flex',
      flexDirection: isHorizontal ? 'column' : 'row',
      gap,
      flexShrink: 0,
      ...(isHorizontal ? { width: sliceMainSize } : { height: sliceMainSize }),
    }),
    [isHorizontal, gap, sliceMainSize],
  );

  const slotStyle = useMemo<CSSProperties>(
    () => ({
      ...slotStyleProp,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...(isHorizontal ? { height: slotCrossSize } : { width: slotCrossSize }),
    }),
    [slotStyleProp, isHorizontal, slotCrossSize],
  );

  return (
    <FocusProvider>
      <div
        ref={measureRef}
        data-navix-node-id={node.id}
        style={outerStyle}
        className={outerClassName}
      >
        <div style={mainContainerStyle} className={innerClassName}>
          {paddingBefore > 0 && <div style={spacerStyle} />}
          {slices.map((slice, sliceIdx) => (
            <div key={renderStartSlice + sliceIdx} style={sliceStyle}>
              {slice.items.map(({ item, globalIndex }) => {
                const itemKey = itemKeys[globalIndex]!;
                return (
                  <Slot
                    key={itemKey}
                    item={item}
                    itemKey={itemKey}
                    index={globalIndex}
                    renderItemRef={renderItemRef}
                    slotStyle={slotStyle}
                    slotClassName={slotClassName}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </FocusProvider>
  );
}

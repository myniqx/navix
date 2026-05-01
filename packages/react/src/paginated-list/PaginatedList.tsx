import { PaginatedListBehavior } from '@navix/core';
import type { FocusNode, PaginatedListOrientation } from '@navix/core';
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

interface PaginatedListProps<T> extends BaseComponentProps {
  orientation?: PaginatedListOrientation;
  visibleCount: number;
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

export function PaginatedList<T>({
  fKey,
  orientation = 'horizontal',
  visibleCount,
  threshold,
  items,
  renderItem,
  keyForItem,
  groupKey,
  gap = 0,
  buffer = 2,
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
}: PaginatedListProps<T>) {
  const [viewOffset, setViewOffset] = useState(0);
  const [containerSize, setContainerSize] = useState(0);
  const outerRef = useRef<HTMLDivElement | null>(null);

  const keyForItemRef = useRef(keyForItem);
  keyForItemRef.current = keyForItem;

  const itemKeys = useMemo(() => {
    const fn = keyForItemRef.current;
    return items.map((item, i) => (fn ? fn(item, i) : `${fKey}-${i}`));
  }, [fKey, items, keyForItem]);

  const itemKeysRef = useRef(itemKeys);
  itemKeysRef.current = itemKeys;

  const selectionByGroupRef = useRef<Map<string, GroupSelection>>(new Map());
  const currentGroupKeyRef = useRef<string | undefined>(groupKey);

  const renderItemRef = useRef(renderItem) as React.RefObject<
    (item: any, fKey: string, index: number) => ReactNode
  >;
  renderItemRef.current = renderItem;

  const { node, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (n: FocusNode) => {
      const b = new PaginatedListBehavior(
        n,
        orientation,
        items.length,
        visibleCount,
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

  const behavior = node.behavior as PaginatedListBehavior;

  const didInitRef = useRef(false);
  if (!didInitRef.current) {
    didInitRef.current = true;
    if (behavior.viewOffset !== 0) {
      queueMicrotask(() => setViewOffset(behavior.viewOffset));
    }
  }

  useEffect(() => {
    behavior.totalCount = items.length;
    behavior.visibleCount = visibleCount;
    behavior.threshold = threshold;
  }, [behavior, items.length, visibleCount, threshold]);

  // Handle groupKey switch.
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

  const isHorizontal = orientation === 'horizontal';

  const measureRef = useCallback(
    (el: HTMLDivElement | null) => {
      outerRef.current = el;
      if (el) {
        setContainerSize(isHorizontal ? el.offsetWidth : el.offsetHeight);
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
      setContainerSize(
        isHorizontal ? entry.contentRect.width : entry.contentRect.height,
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isHorizontal]);

  const totalGap = (visibleCount - 1) * gap;
  const slotWidth =
    containerSize > 0 ? (containerSize - totalGap) / visibleCount : 0;
  const step = slotWidth + gap;
  const translate = -viewOffset * step;

  const renderStart = Math.max(0, viewOffset - buffer);
  const renderEnd = Math.min(items.length, viewOffset + visibleCount + buffer);
  const paddingBefore = renderStart * step;

  // Internal styles — user props merged first, functional overrides applied on top
  const outerStyle = useMemo<CSSProperties>(
    () => ({ ...outerStyleProp, overflow: 'hidden', width: '100%' }),
    [outerStyleProp],
  );

  const innerStyle = useMemo<CSSProperties>(
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

  const slotStyle = useMemo<CSSProperties>(
    () => ({
      ...slotStyleProp,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...(isHorizontal ? { width: slotWidth } : { height: slotWidth }),
    }),
    [slotStyleProp, isHorizontal, slotWidth],
  );

  return (
    <FocusProvider>
      <div
        ref={measureRef}
        data-navix-node-id={node.id}
        style={outerStyle}
        className={outerClassName}
      >
        <div style={innerStyle} className={innerClassName}>
          {paddingBefore > 0 && <div style={spacerStyle} />}
          {items.slice(renderStart, renderEnd).map((item, localIdx) => {
            const globalIdx = renderStart + localIdx;
            const itemKey = itemKeys[globalIdx]!;
            return (
              <Slot
                key={itemKey}
                item={item}
                itemKey={itemKey}
                index={globalIdx}
                renderItemRef={renderItemRef}
                slotStyle={slotStyle}
                slotClassName={slotClassName}
              />
            );
          })}
        </div>
      </div>
    </FocusProvider>
  );
}

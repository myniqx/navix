import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  memo,
  type ReactNode,
  type CSSProperties,
} from 'react';

import type { FocusNode } from '../core/FocusNode';
import { useNavixStore } from '../KVContext';
import { useSlotOverflowWarning } from '../common/useSlotOverflowWarning';
import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';
import { NavixScroll, type ScrollbarRenderProps } from '../scroll/NavixScroll';
import { PaginatedListBehavior } from './PaginatedListBehavior';
import type { PaginatedListOrientation } from './PaginatedListBehavior';


interface SlotProps {
  item: any;
  itemKey: string;
  index: number;
  disabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderItemRef: React.RefObject<
    (item: any, fKey: string, index: number, disabled: boolean) => ReactNode
  >;
  slotStyle: CSSProperties;
  slotClassName?: string;
}

const Slot = memo(function Slot({
  item,
  itemKey,
  index,
  disabled,
  renderItemRef,
  slotStyle,
  slotClassName,
}: SlotProps) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  useSlotOverflowWarning(slotRef, 'NavixPaginatedList', itemKey);
  return (
    <div ref={slotRef} style={slotStyle} className={slotClassName}>
      {renderItemRef.current(item, itemKey, index, disabled)}
    </div>
  );
});

interface PaginatedListProps<T> extends BaseComponentProps {
  orientation?: PaginatedListOrientation;
  visibleCount: number;
  threshold: number;
  items: T[];
  renderItem: (item: T, fKey: string, index: number, disabled: boolean) => ReactNode;
  keyForItem?: (item: T, index: number) => string;
  isItemDisabled?: (index: number) => boolean;
  /**
   * Jump to this item on mount and whenever the value changes. The component
   * manages its own navigation state between jumps — user arrow-key navigation
   * is unaffected. If the target item is disabled the nearest non-disabled
   * neighbour is focused instead. This is a write-only intent prop; there is
   * no corresponding onChange callback.
   */
  activeKey?: string;
  disabled?: boolean;
  groupKey?: string;
  gap?: number;
  buffer?: number;
  showScrollbar?: boolean;
  renderScrollbar?: (props: ScrollbarRenderProps) => ReactNode;
  outerStyle?: CSSProperties;
  outerClassName?: string;
  innerStyle?: CSSProperties;
  innerClassName?: string;
  slotStyle?: CSSProperties;
  slotClassName?: string;
}

export function NavixPaginatedList<T>({
  fKey,
  orientation = 'horizontal',
  visibleCount,
  threshold,
  items,
  renderItem,
  keyForItem,
  isItemDisabled,
  activeKey,
  disabled,
  focusOnRegister,
  groupKey,
  gap = 0,
  buffer = 2,
  showScrollbar = false,
  renderScrollbar,
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

  const scrollbarKey = `${fKey}__scrollbar__`;

  const keyForItemRef = useRef(keyForItem);
  keyForItemRef.current = keyForItem;

  const isItemDisabledRef = useRef(isItemDisabled);
  isItemDisabledRef.current = isItemDisabled;

  const itemKeys = useMemo(() => {
    const fn = keyForItemRef.current;
    return items.map((item, i) => (fn ? fn(item, i) : `${fKey}-${i}`));
  }, [fKey, items, keyForItem]);

  const itemKeysRef = useRef(itemKeys);
  itemKeysRef.current = itemKeys;

  const store = useNavixStore();
  const currentGroupKeyRef = useRef<string | undefined>(groupKey);

  // renderItemRef lets renderItem change each render without re-rendering every
  // Slot. disabled is passed as an explicit Slot prop so memo busts correctly
  // when disabled state changes dynamically.
  const renderItemRef = useRef(renderItem) as React.RefObject<
    (item: any, fKey: string, index: number, disabled: boolean) => ReactNode
  >;
  renderItemRef.current = renderItem;

  const { node, FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent, disabled, focusOnRegister },
    (n: FocusNode) => {
      const b = new PaginatedListBehavior(
        n,
        orientation,
        items.length,
        visibleCount,
        threshold,
        () => { },
        (key) => itemKeysRef.current.indexOf(key),
        (index) => isItemDisabledRef.current?.(index) ?? false,
        scrollbarKey,
      );
      const initialGroup = currentGroupKeyRef.current;
      const restored = initialGroup !== undefined ? store.get(initialGroup) : undefined;
      if (restored) {
        b.activeIndex = (restored.activeIndex as number) ?? 0;
        b.viewOffset = (restored.viewOffset as number) ?? 0;
      }
      if (activeKey !== undefined) {
        const idx = itemKeysRef.current.indexOf(activeKey);
        if (idx !== -1) {
          b.jumpToIndex(idx);
          b.focusByKey(activeKey);
        }
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

  // Must run before the activeIndex effect below so jumpToIndex uses current
  // totalCount/visibleCount when computing viewOffset.
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
      store.update(prevGroup, {
        activeIndex: behavior.activeIndex,
        viewOffset: behavior.viewOffset,
      });
    }

    const restored = groupKey !== undefined ? store.get(groupKey) : undefined;
    behavior.activeIndex = (restored?.activeIndex as number) ?? 0;
    behavior.viewOffset = (restored?.viewOffset as number) ?? 0;
    setViewOffset(behavior.viewOffset);
    currentGroupKeyRef.current = groupKey;

    if (items.length > 0) {
      const idx = behavior.activeIndex;
      const keys = itemKeysRef.current;
      if (idx >= 0 && idx < keys.length) {
        behavior.focusByKey(keys[idx]!);
      }
    }
  }, [behavior, groupKey, items, store]);

  useEffect(() => {
    behavior.onChange = (newIndex: number, newOffset: number, refocusItem: boolean) => {
      setViewOffset(newOffset);
      const group = currentGroupKeyRef.current;
      if (group !== undefined) {
        store.update(group, { activeIndex: newIndex, viewOffset: newOffset });
      }
      if (refocusItem) {
        behavior.focusByKey(itemKeys[newIndex]!);
      }
    };
  }, [behavior, itemKeys, store]);

  // Runs after the dimensions effect above — behavior has current
  // totalCount/visibleCount when jumpToIndex computes the new viewOffset.
  useEffect(() => {
    if (activeKey === undefined) return;
    const idx = itemKeysRef.current.indexOf(activeKey);
    if (idx === -1) return;
    behavior.jumpToIndex(idx);
    setViewOffset(behavior.viewOffset);
    const keys = itemKeysRef.current;
    if (idx >= 0 && idx < keys.length) {
      behavior.focusByKey(keys[idx]!);
    }
  }, [activeKey, behavior]);

  const isHorizontal = orientation === 'horizontal';

  // Measure the list's *content* box (padding excluded). ResizeObserver's
  // contentRect already excludes padding/border, so a single observer in
  // useLayoutEffect gives us a correct, paint-synchronous measurement.
  useLayoutEffect(() => {
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
  const slotStep = slotWidth + gap;
  const translate = -viewOffset * slotStep;

  const renderStart = Math.max(0, viewOffset - buffer);
  const renderEnd = Math.min(items.length, viewOffset + visibleCount + buffer);
  const paddingBefore = renderStart * slotStep;

  const finalShowScrollbar = (showScrollbar || !!renderScrollbar) && items.length > visibleCount;

  const wrapperStyle = useMemo<CSSProperties>(
    () => ({
      display: 'flex',
      flexDirection: isHorizontal ? 'column' : 'row',
      ...(isHorizontal ? { width: '100%' } : { height: '100%' }),
    }),
    [isHorizontal],
  );

  const outerStyle = useMemo<CSSProperties>(
    () => finalShowScrollbar
      ? { ...outerStyleProp, overflow: 'hidden', flex: 1, minWidth: 0, minHeight: 0 }
      : { ...outerStyleProp, overflow: 'hidden', ...(isHorizontal ? { width: '100%' } : { height: '100%' }) },
    [outerStyleProp, finalShowScrollbar, isHorizontal],
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

  const handlePageChange = useCallback((page: number) => {
    behavior.setPage(page);
  }, [behavior]);

  const pageCount = behavior.maxOffset + 1;
  const currentPage = viewOffset;

  const scrollbarEl = finalShowScrollbar ? (
    <NavixScroll
      fKey={scrollbarKey}
      orientation={orientation}
      page={currentPage}
      pageCount={pageCount}
      arrowStep={visibleCount}
      pageStep={visibleCount}
      onPageChange={handlePageChange}
      renderScrollbar={renderScrollbar}
    />
  ) : null;

  const listDiv = (
    <div
      ref={outerRef}
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
              disabled={isItemDisabled?.(globalIdx) ?? false}
              renderItemRef={renderItemRef}
              slotStyle={slotStyle}
              slotClassName={slotClassName}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <FocusProvider>
      {scrollbarEl ? (
        <div style={wrapperStyle}>
          {listDiv}
          {scrollbarEl}
        </div>
      ) : (
        listDiv
      )}
    </FocusProvider>
  );
}

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type React from 'react';

import type { FocusNode } from '../core/FocusNode';
import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';
import { ScrollBehavior, type ScrollOrientation } from './ScrollBehavior';

export type { ScrollOrientation };

export type ScrollbarRenderProps = {
  scrollMode: boolean;
  page: number;
  pageCount: number;
  orientation: 'vertical' | 'horizontal';
  onPageChange: (page: number) => void;
};

interface ScrollProps extends BaseComponentProps {
  orientation: ScrollOrientation;
  page?: number;
  defaultPage?: number;
  pageCount: number;
  arrowStep?: number;
  pageStep?: number;
  onPageChange?: (page: number) => void;
  renderScrollbar?: (props: ScrollbarRenderProps) => ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
  focusedStyle?: React.CSSProperties;
  className?: string;
  focusedClassName?: string;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

function DefaultScrollbarVisual({ scrollMode, page, pageCount, orientation, onPageChange }: ScrollbarRenderProps) {
  const thumbRatio = pageCount > 1 ? 1 / pageCount : 1;
  const thumbPct = `${thumbRatio * 100}%`;
  const ratio = pageCount > 1 ? page / (pageCount - 1) : 0;
  const isHorizontal = orientation === 'horizontal';
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const pageFromPointer = useCallback((clientPos: number) => {
    const track = trackRef.current;
    if (!track) return page;
    const rect = track.getBoundingClientRect();
    const trackSize = isHorizontal ? rect.width : rect.height;
    if (trackSize <= 0) return 0;
    const pos = isHorizontal ? clientPos - rect.left : clientPos - rect.top;
    const r = Math.max(0, Math.min(pos / trackSize, 1));
    return Math.round(r * (pageCount - 1));
  }, [isHorizontal, pageCount, page]);

  const handleTrackMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    onPageChange(pageFromPointer(isHorizontal ? e.clientX : e.clientY));

    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      onPageChange(pageFromPointer(isHorizontal ? me.clientX : me.clientY));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isHorizontal, onPageChange, pageFromPointer]);

  return (
    <div
      ref={trackRef}
      onMouseDown={handleTrackMouseDown}
      style={{
        position: 'relative',
        flexShrink: 0,
        borderRadius: 2,
        backgroundColor: '#333',
        cursor: 'pointer',
        ...(isHorizontal
          ? { width: '100%', height: 8 }
          : { width: 8, height: '100%' }),
      }}
    >
      <div
        style={{
          position: 'absolute',
          borderRadius: 2,
          backgroundColor: scrollMode ? '#4fc3f7' : '#888',
          transition: isDragging.current
            ? 'background-color 0.15s ease'
            : 'background-color 0.15s ease, top 0.1s ease, left 0.1s ease',
          pointerEvents: 'none',
          ...(isHorizontal
            ? {
              top: 0,
              bottom: 0,
              width: thumbPct,
              left: `calc(${ratio} * (100% - ${thumbPct}))`,
            }
            : {
              left: 0,
              right: 0,
              height: thumbPct,
              top: `calc(${ratio} * (100% - ${thumbPct}))`,
            }),
        }}
      />
    </div>
  );
}

/**
 * NavixScroll — focusable scrollbar.
 *
 * When focused, arrow keys (based on orientation) shift the page by `arrowStep`
 * (default 1), and PageUp/PageDown shift by `pageStep` (default 1). The default
 * visual is a draggable track + thumb; override with `renderScrollbar`.
 */
export function NavixScroll({
  fKey,
  orientation,
  page: controlledPage,
  defaultPage,
  pageCount,
  arrowStep = 1,
  pageStep = 1,
  onPageChange,
  renderScrollbar,
  disabled,
  focusOnRegister,
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  onEvent,
  style,
  focusedStyle,
  className,
  focusedClassName,
}: ScrollProps) {
  const isControlled = controlledPage !== undefined;
  const maxPage = Math.max(0, pageCount - 1);

  const [internalPage, setInternalPage] = useState<number>(() =>
    clamp(defaultPage ?? 0, 0, maxPage),
  );

  const page = clamp(isControlled ? controlledPage : internalPage, 0, maxPage);

  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  const commitPage = useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, Math.max(0, pageCount - 1));
      if (clamped === page) return;
      if (!isControlled) setInternalPage(clamped);
      onPageChangeRef.current?.(clamped);
    },
    [page, pageCount, isControlled],
  );

  const commitPageRef = useRef(commitPage);
  commitPageRef.current = commitPage;

  const arrowStepRef = useRef(arrowStep);
  arrowStepRef.current = arrowStep;

  const pageStepRef = useRef(pageStep);
  pageStepRef.current = pageStep;

  const { node, directlyFocused } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent, disabled, focusOnRegister },
    (n: FocusNode) =>
      new ScrollBehavior(n, {
        orientation,
        onDelta: (d: number) => commitPageRef.current(page + d * arrowStepRef.current),
        onPageDelta: (d: number) => commitPageRef.current(page + d * pageStepRef.current),
      }),
  );

  const behavior = node.behavior as ScrollBehavior;
  useEffect(() => {
    behavior.update({
      orientation,
      onDelta: (d: number) => commitPageRef.current(page + d * arrowStepRef.current),
      onPageDelta: (d: number) => commitPageRef.current(page + d * pageStepRef.current),
    });
  }, [behavior, orientation, page]);

  const mergedStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...(orientation === 'horizontal'
        ? { width: '100%' }
        : { height: '100%' }),
      ...style,
      ...(directlyFocused ? focusedStyle : undefined),
    }),
    [orientation, style, focusedStyle, directlyFocused],
  );

  const mergedClassName = useMemo(
    () =>
      mergeClassName(className, directlyFocused ? focusedClassName : undefined),
    [className, focusedClassName, directlyFocused],
  );

  const scrollbarProps: ScrollbarRenderProps = {
    scrollMode: directlyFocused,
    page,
    pageCount,
    orientation,
    onPageChange: commitPage,
  };

  return (
    <div
      data-navix-node-id={node.id}
      data-focused={directlyFocused}
      style={mergedStyle}
      className={mergedClassName || undefined}
    >
      {renderScrollbar ? renderScrollbar(scrollbarProps) : <DefaultScrollbarVisual {...scrollbarProps} />}
    </div>
  );
}

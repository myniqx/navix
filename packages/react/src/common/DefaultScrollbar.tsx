import { useRef, useCallback } from 'react';

export type ScrollbarRenderProps = {
  scrollMode: boolean;
  page: number;
  pageCount: number;
  orientation: 'vertical' | 'horizontal';
  onPageChange: (page: number) => void;
};


export function DefaultScrollbar({ scrollMode, page, pageCount, orientation, onPageChange }: ScrollbarRenderProps) {
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

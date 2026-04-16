import { useState, useEffect, useRef } from 'react';
import type { PaginatedListAction } from '@navix/react';
import { useFocusable } from '@navix/react';
import type { ContentItem } from '../data';

interface SeriesCardProps {
  fKey: string;
  item: ContentItem;
  action: PaginatedListAction | null;
}

type CacheState = 'idle' | 'caching' | 'ready';

export function SeriesCard({ fKey, item, action }: SeriesCardProps) {
  const [cacheState, setCacheState] = useState<CacheState>('idle');
  const [cacheProgress, setCacheProgress] = useState(0);
  const [pendingPreview, setPendingPreview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActionRef = useRef<PaginatedListAction | null>(null);
  const { directlyFocused, focusSelf } = useFocusable(fKey);

  const isFocused = directlyFocused;

  // Handle action imperatively — no cleanup side-effects from dependency changes
  if (action !== prevActionRef.current) {
    prevActionRef.current = action;

    if (action === 'visible') {
      setCacheState('caching');
      setCacheProgress(0);

      let progress = 0;
      timerRef.current = setInterval(() => {
        progress += progress * Math.random() * 0.4 + 2;
        if (progress >= 100) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setCacheProgress(100);
          setCacheState('ready');
        } else {
          setCacheProgress(Math.min(progress, 100));
        }
      }, 120);
    }

    if (action === 'hidden') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCacheState('idle');
      setCacheProgress(0);
      setPendingPreview(false);
    }

    if (action === 'focused') {
      setPendingPreview(true);
    }

    if (action === 'blurred') {
      setPendingPreview(false);
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const bg = isFocused
    ? '#1a3a2a'
    : cacheState === 'ready'
      ? '#1a2a1a'
      : '#0f0f1a';

  const borderColor = isFocused
    ? '#4caf7d'
    : cacheState === 'ready'
      ? '#2a4a2a'
      : '#1a1a2e';

  return (
    <div
      onMouseEnter={focusSelf}
      style={{
        width: '100%',
        borderRadius: 8,
        background: bg,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        transition: 'background 0.3s ease, border-color 0.3s ease',
        transform: isFocused ? 'scale(1)' : 'scale(.96)',
        boxShadow: isFocused ? '0 0 0 2px #4caf7d, 0 8px 24px rgba(0,0,0,0.6)' : 'none',
      }}
    >
      {/* Poster */}
      <div
        style={{
          height: 160,
          background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}88 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          padding: 8,
          position: 'relative',
        }}
      >
        <div style={{ fontSize: 10, color: '#aaa', background: 'rgba(0,0,0,0.5)', borderRadius: 3, padding: '2px 6px' }}>
          {item.year}
        </div>

        {/* Cache status badge */}
        {cacheState !== 'idle' && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: cacheState === 'ready' ? '#4caf7d' : '#aaa',
              background: 'rgba(0,0,0,0.65)',
              borderRadius: 3,
              padding: '2px 6px',
              transition: 'color 0.3s ease',
            }}
          >
            {cacheState === 'ready' ? '● READY' : '⟳ CACHING'}
          </div>
        )}

        {isFocused && cacheState === 'ready' && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              fontSize: 9,
              fontWeight: 700,
              color: '#4caf7d',
              background: 'rgba(0,0,0,0.65)',
              borderRadius: 3,
              padding: '2px 6px',
            }}
          >
            ▶ PREVIEW
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: '#1a1a2e' }}>
        <div
          style={{
            height: '100%',
            width: `${cacheProgress}%`,
            background: cacheState === 'ready' ? '#4caf7d' : '#4fc3f7',
            transition: 'width 0.1s linear, background 0.3s ease',
          }}
        />
      </div>

      {/* Title row */}
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isFocused ? '#fff' : '#bbb', marginBottom: 4, transition: 'color 0.2s' }}>
          {item.title}
        </div>
        <div style={{ fontSize: 10, color: isFocused ? '#4caf7d' : cacheState === 'ready' ? '#4caf7d88' : '#444', transition: 'color 0.3s' }}>
          {isFocused && cacheState === 'ready'
            ? 'Playing preview...'
            : isFocused
              ? 'Waiting for cache...'
              : cacheState === 'ready'
                ? 'Ready to play'
                : cacheState === 'caching'
                  ? 'Buffering...'
                  : ''}
        </div>
      </div>
    </div>
  );
}

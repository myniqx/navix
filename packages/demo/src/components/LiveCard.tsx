import { useState, useRef } from 'react';
import type { PaginatedGridAction } from '@navix/react';
import { useFocusable } from '@navix/react';
import type { ContentItem } from '../data';

interface LiveCardProps {
  fKey: string;
  item: ContentItem;
  action: PaginatedGridAction | null;
}

type CacheState = 'idle' | 'caching' | 'ready';

export function LiveCard({ fKey, item, action }: LiveCardProps) {
  const [cacheState, setCacheState] = useState<CacheState>('idle');
  const [cacheProgress, setCacheProgress] = useState(0);
  const [pendingPreview, setPendingPreview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActionRef = useRef<PaginatedGridAction | null>(null);
  const { directlyFocused, focusSelf } = useFocusable(fKey);

  const isFocused = directlyFocused;

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

    if (action === 'focused') setPendingPreview(true);
    if (action === 'blurred') setPendingPreview(false);
  }

  const isPlaying = isFocused && cacheState === 'ready';

  const bg = isPlaying
    ? '#0d2818'
    : isFocused
      ? '#1a2a3a'
      : cacheState === 'ready'
        ? '#101a10'
        : '#0a0a14';

  const borderColor = isPlaying
    ? '#4caf7d'
    : isFocused
      ? '#4fc3f7'
      : cacheState === 'ready'
        ? '#1a3a1a'
        : '#151520';

  const channelNum = parseInt(item.id.replace('Live-', ''), 10) + 1;

  return (
    <div
      onMouseEnter={focusSelf}
      style={{
        width: '100%',
        borderRadius: 6,
        background: bg,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        transform: isFocused ? 'scale(1)' : 'scale(0.96)',
        boxShadow: isFocused ? `0 0 0 2px ${isPlaying ? '#4caf7d' : '#4fc3f7'}, 0 4px 16px rgba(0,0,0,0.5)` : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Channel preview area */}
      <div
        style={{
          height: 160,
          background: `linear-gradient(160deg, ${item.color}99 0%, ${item.color}44 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: 0,
        }}
      >
        {isPlaying && (
          <div style={{ fontSize: 20, color: '#4caf7d', textShadow: '0 0 12px rgba(76,175,125,0.5)' }}>
            ▶
          </div>
        )}
        {isFocused && !isPlaying && (
          <div style={{ fontSize: 10, color: '#4fc3f7', fontWeight: 600 }}>
            {cacheState === 'caching' ? '⟳ Loading...' : ''}
          </div>
        )}

        {/* Channel number badge */}
        <div style={{
          position: 'absolute',
          top: 4,
          left: 4,
          fontSize: 9,
          fontWeight: 700,
          color: isFocused ? '#fff' : '#666',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 3,
          padding: '1px 5px',
        }}>
          CH {channelNum}
        </div>

        {cacheState === 'ready' && !isFocused && (
          <div style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#4caf7d',
            boxShadow: '0 0 4px #4caf7d',
          }} />
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: '#0a0a14' }}>
        <div style={{
          height: '100%',
          width: `${cacheProgress}%`,
          background: cacheState === 'ready' ? '#4caf7d' : '#4fc3f7',
          transition: 'width 0.1s linear, background 0.3s ease',
        }} />
      </div>

      {/* Info bar */}
      <div style={{ padding: '4px 6px', minHeight: 28 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: isFocused ? '#fff' : '#888',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'color 0.2s',
        }}>
          {item.title}
        </div>
        <div style={{
          fontSize: 8,
          color: isPlaying ? '#4caf7d' : isFocused ? '#4fc3f7' : '#444',
          transition: 'color 0.2s',
          marginTop: 1,
        }}>
          {isPlaying
            ? '● LIVE'
            : isFocused && pendingPreview && cacheState !== 'ready'
              ? 'Buffering...'
              : cacheState === 'ready'
                ? 'Ready'
                : ''}
        </div>
      </div>
    </div>
  );
}

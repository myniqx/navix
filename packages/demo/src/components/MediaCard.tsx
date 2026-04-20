import type { NavEvent } from '@navix/core';
import { useFocusable } from '@navix/react';
import { useState, useRef } from 'react';

import type { ContentItem } from '../data';

type CardVariant = 'movie' | 'live' | 'series';
type CacheState = 'idle' | 'caching' | 'ready';
type PlayState = 'idle' | 'pending' | 'playing';

interface MediaCardProps {
  fKey: string;
  item: ContentItem;
  variant: CardVariant;
  onClick?: () => void;
}

const GENRES = [
  'Action',
  'Drama',
  'Comedy',
  'Thriller',
  'Sci-Fi',
  'Horror',
  'Romance',
  'Adventure',
];
const RATINGS = [
  '6.2',
  '7.1',
  '8.4',
  '5.9',
  '7.8',
  '6.5',
  '8.1',
  '7.3',
  '9.0',
  '6.8',
];

function getGenre(item: ContentItem) {
  return GENRES[item.id.charCodeAt(item.id.length - 1) % GENRES.length]!;
}

function getRating(item: ContentItem) {
  return RATINGS[item.id.charCodeAt(0) % RATINGS.length]!;
}

function getDuration(item: ContentItem) {
  return 85 + (item.id.charCodeAt(item.id.length - 1) % 7) * 10;
}

function getEpisodeLabel(item: ContentItem) {
  const s = (item.id.charCodeAt(0) % 9) + 1;
  const e = (item.id.charCodeAt(item.id.length - 1) % 20) + 1;
  return `S${s}E${e}`;
}

function getChannelNum(item: ContentItem) {
  return (item.id.charCodeAt(item.id.length - 1) % 99) + 1;
}

const VARIANT_ACCENT: Record<CardVariant, string> = {
  movie: '#ff9800',
  live: '#4caf7d',
  series: '#4caf7d',
};

const VARIANT_PLAY_LABEL: Record<CardVariant, string> = {
  movie: 'TRAILER',
  live: 'LIVE',
  series: 'PREVIEW',
};

export function MediaCard({ fKey, item, variant, onClick }: MediaCardProps) {
  const [cacheState, setCacheState] = useState<CacheState>('idle');
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [cacheProgress, setCacheProgress] = useState(0);
  const [playProgress, setPlayProgress] = useState(0);

  const cacheStateRef = useRef<CacheState>('idle');
  const playStateRef = useRef<PlayState>('idle');
  const cacheTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accent = VARIANT_ACCENT[variant];
  const playLabel = VARIANT_PLAY_LABEL[variant];

  const setCache = (s: CacheState) => {
    cacheStateRef.current = s;
    setCacheState(s);
  };
  const setPlay = (s: PlayState) => {
    playStateRef.current = s;
    setPlayState(s);
  };

  const startPlaying = () => {
    setPlay('playing');
    setPlayProgress(0);
    let pp = 0;
    playTimerRef.current = setInterval(() => {
      pp += 0.4 + Math.random() * 0.3;
      if (pp >= 100) {
        clearInterval(playTimerRef.current!);
        playTimerRef.current = null;
        setPlayProgress(100);
      } else {
        setPlayProgress(pp);
      }
    }, 80);
  };

  const stopPlaying = () => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setPlay('idle');
    setPlayProgress(0);
  };

  const reset = () => {
    if (cacheTimerRef.current) {
      clearInterval(cacheTimerRef.current);
      cacheTimerRef.current = null;
    }
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setCache('idle');
    setPlay('idle');
    setCacheProgress(0);
    setPlayProgress(0);
  };

  const { directlyFocused, focusSelf } = useFocusable(fKey, {
    onEvent: (e: NavEvent) => {
      if (e.action === 'enter' && e.type === 'press') {
        onClick?.();
        return true;
      }
      return false;
    },
    onRegister: () => {
      setCache('caching');
      setCacheProgress(0);
      let progress = 0;
      cacheTimerRef.current = setInterval(() => {
        progress += progress * Math.random() * 0.4 + 2;
        if (progress >= 100) {
          clearInterval(cacheTimerRef.current!);
          cacheTimerRef.current = null;
          setCacheProgress(100);
          setCache('ready');
          if (playStateRef.current === 'pending') {
            startPlaying();
          }
        } else {
          setCacheProgress(Math.min(progress, 100));
        }
      }, 120);
    },
    onFocus: () => {
      if (cacheStateRef.current === 'ready') {
        startPlaying();
      } else if (cacheStateRef.current === 'caching') {
        setPlay('pending');
      }
    },
    onBlurred: () => {
      stopPlaying();
    },
    onUnregister: () => {
      reset();
    },
  });

  const isFocused = directlyFocused;
  const isPlaying = playState === 'playing';
  const isPending = playState === 'pending';
  const duration = getDuration(item);

  const borderColor = isPlaying
    ? accent
    : isFocused
      ? '#4fc3f7'
      : cacheState === 'ready'
        ? '#1e2a1e'
        : '#111118';

  const bg = isPlaying ? '#0d1a0d' : isFocused ? '#0d1a2a' : '#0a0a12';

  // Badge content per variant
  const topLeftBadge =
    variant === 'movie'
      ? `★ ${getRating(item)}`
      : variant === 'live'
        ? `CH ${getChannelNum(item)}`
        : getEpisodeLabel(item);

  const topRightBadge = variant === 'live' ? null : item.year;

  const subtitleText = isPlaying
    ? variant === 'movie'
      ? `▶ ${Math.round((playProgress * duration) / 100 / 60)}:${String(Math.round(((playProgress * duration) / 100) % 60)).padStart(2, '0')} / ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
      : `● ${playLabel}`
    : isPending
      ? 'Waiting for cache...'
      : isFocused && cacheState === 'ready'
        ? `${playLabel} ready`
        : cacheState === 'ready' && variant === 'movie'
          ? `${Math.floor(duration / 60)}h ${duration % 60}m`
          : cacheState === 'ready'
            ? 'Ready'
            : '';

  return (
    <div
      onMouseEnter={focusSelf}
      onClick={onClick}
      style={{
        width: '100%',
        borderRadius: 6,
        background: bg,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        transform: isFocused ? 'scale(1)' : 'scale(0.96)',
        boxShadow: isPlaying
          ? `0 0 0 2px ${accent}, 0 4px 20px ${accent}4d`
          : isFocused
            ? '0 0 0 2px #4fc3f7, 0 4px 16px rgba(0,0,0,0.5)'
            : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Poster area */}
      <div
        style={{
          height: 160,
          background: isPlaying
            ? `linear-gradient(160deg, #0d1a0d 0%, ${item.color}66 60%, #000 100%)`
            : `linear-gradient(160deg, ${item.color}bb 0%, ${item.color}44 100%)`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          transition: 'background 0.4s ease',
        }}
      >
        {/* Top-left badge */}
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 5,
            fontSize: 9,
            fontWeight: 700,
            color: variant === 'movie' ? '#ff9800' : '#fff',
            background: 'rgba(0,0,0,0.65)',
            borderRadius: 3,
            padding: '2px 5px',
          }}
        >
          {topLeftBadge}
        </div>

        {/* Top-right badge */}
        {topRightBadge && (
          <div
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              fontSize: 9,
              color: '#888',
              background: 'rgba(0,0,0,0.55)',
              borderRadius: 3,
              padding: '2px 5px',
            }}
          >
            {topRightBadge}
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 18,
                color: accent,
                textShadow: `0 0 12px ${accent}99`,
              }}
            >
              ▶
            </div>
            <div
              style={{
                fontSize: 8,
                color: accent,
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}
            >
              {playLabel}
            </div>
          </div>
        )}

        {/* Pending indicator */}
        {isPending && (
          <div style={{ fontSize: 9, color: '#4fc3f7', fontWeight: 600 }}>
            ⟳ Loading...
          </div>
        )}

        {/* Genre tag — movie only */}
        {variant === 'movie' && (
          <div
            style={{
              position: 'absolute',
              bottom: 5,
              left: 5,
              fontSize: 8,
              color: isFocused ? '#4fc3f7' : '#555',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 3,
              padding: '1px 5px',
              transition: 'color 0.2s',
            }}
          >
            {getGenre(item)}
          </div>
        )}

        {/* Ready dot */}
        {cacheState === 'ready' && !isFocused && (
          <div
            style={{
              position: 'absolute',
              bottom: 5,
              right: 5,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 4px ${accent}`,
            }}
          />
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: '#0a0a12' }}>
        <div
          style={{
            height: '100%',
            width: isPlaying ? `${playProgress}%` : `${cacheProgress}%`,
            background: isPlaying ? accent : '#4fc3f7',
            transition: 'width 0.08s linear, background 0.3s ease',
          }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: '4px 6px 5px' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: isFocused ? '#fff' : '#999',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'color 0.2s',
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontSize: 8,
            marginTop: 1,
            color: isPlaying ? accent : isFocused ? '#4fc3f7' : '#444',
            transition: 'color 0.2s',
          }}
        >
          {subtitleText}
        </div>
      </div>
    </div>
  );
}

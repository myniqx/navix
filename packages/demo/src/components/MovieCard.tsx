import { useState, useRef } from 'react';
import type { PaginatedGridAction } from '@navix/react';
import { useFocusable } from '@navix/react';
import type { ContentItem } from '../data';

interface MovieCardProps {
  fKey: string;
  item: ContentItem;
  action: PaginatedGridAction | null;
}

type TrailerState = 'idle' | 'buffering' | 'ready' | 'playing';

const GENRES = ['Action', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Horror', 'Romance', 'Adventure'];
const RATINGS = ['6.2', '7.1', '8.4', '5.9', '7.8', '6.5', '8.1', '7.3', '9.0', '6.8'];

function getGenre(item: ContentItem) {
  return GENRES[item.id.charCodeAt(item.id.length - 1) % GENRES.length]!;
}

function getRating(item: ContentItem) {
  return RATINGS[item.id.charCodeAt(0) % RATINGS.length]!;
}

function getDuration(item: ContentItem) {
  const base = (item.id.charCodeAt(item.id.length - 1) % 7) * 10;
  return 85 + base;
}

export function MovieCard({ fKey, item, action }: MovieCardProps) {
  const [trailerState, setTrailerState] = useState<TrailerState>('idle');
  const [bufferProgress, setBufferProgress] = useState(0);
  const [playProgress, setPlayProgress] = useState(0);
  const bufferTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActionRef = useRef<PaginatedGridAction | null>(null);
  const { directlyFocused, focusSelf } = useFocusable(fKey);

  const isFocused = directlyFocused;

  if (action !== prevActionRef.current) {
    prevActionRef.current = action;

    if (action === 'visible') {
      setTrailerState('buffering');
      setBufferProgress(0);

      let progress = 0;
      bufferTimerRef.current = setInterval(() => {
        progress += progress * Math.random() * 0.4 + 2;
        if (progress >= 100) {
          clearInterval(bufferTimerRef.current!);
          bufferTimerRef.current = null;
          setBufferProgress(100);
          setTrailerState('ready');
        } else {
          setBufferProgress(Math.min(progress, 100));
        }
      }, 120);
    }

    if (action === 'hidden') {
      if (bufferTimerRef.current) { clearInterval(bufferTimerRef.current); bufferTimerRef.current = null; }
      if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
      setTrailerState('idle');
      setBufferProgress(0);
      setPlayProgress(0);
    }

    if (action === 'focused') {
      if (trailerState === 'ready') {
        setTrailerState('playing');
        setPlayProgress(0);
        let pp = 0;
        playTimerRef.current = setInterval(() => {
          pp += 0.4 + Math.random() * 0.3;
          if (pp >= 100) {
            pp = 100;
            clearInterval(playTimerRef.current!);
            playTimerRef.current = null;
            setPlayProgress(100);
          } else {
            setPlayProgress(pp);
          }
        }, 80);
      }
    }

    if (action === 'blurred') {
      if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
      if (trailerState === 'playing') {
        setTrailerState('ready');
        setPlayProgress(0);
      }
    }
  }

  const isPlaying = trailerState === 'playing';
  const genre = getGenre(item);
  const rating = getRating(item);
  const duration = getDuration(item);

  const borderColor = isPlaying
    ? '#ff9800'
    : isFocused
      ? '#4fc3f7'
      : trailerState === 'ready'
        ? '#1e2a3a'
        : '#111118';

  const bg = isPlaying
    ? '#1a1200'
    : isFocused
      ? '#0d1a2a'
      : '#0a0a12';

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
        boxShadow: isPlaying
          ? '0 0 0 2px #ff9800, 0 4px 20px rgba(255,152,0,0.3)'
          : isFocused
            ? '0 0 0 2px #4fc3f7, 0 4px 16px rgba(0,0,0,0.5)'
            : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Poster / preview area */}
      <div
        style={{
          height: 160,
          background: isPlaying
            ? `linear-gradient(160deg, #1a1200 0%, ${item.color}66 60%, #000 100%)`
            : `linear-gradient(160deg, ${item.color}bb 0%, ${item.color}44 100%)`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          transition: 'background 0.4s ease',
        }}
      >
        {/* Rating badge */}
        <div style={{
          position: 'absolute',
          top: 5,
          left: 5,
          fontSize: 9,
          fontWeight: 700,
          color: '#ff9800',
          background: 'rgba(0,0,0,0.65)',
          borderRadius: 3,
          padding: '2px 5px',
        }}>
          ★ {rating}
        </div>

        {/* Year badge */}
        <div style={{
          position: 'absolute',
          top: 5,
          right: 5,
          fontSize: 9,
          color: '#888',
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 3,
          padding: '2px 5px',
        }}>
          {item.year}
        </div>

        {/* Playing indicator */}
        {isPlaying && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}>
            <div style={{ fontSize: 18, color: '#ff9800', textShadow: '0 0 12px rgba(255,152,0,0.6)' }}>▶</div>
            <div style={{ fontSize: 8, color: '#ff9800', fontWeight: 700, letterSpacing: '0.1em' }}>TRAILER</div>
          </div>
        )}

        {/* Buffering indicator */}
        {trailerState === 'buffering' && isFocused && (
          <div style={{ fontSize: 9, color: '#4fc3f7', fontWeight: 600 }}>⟳ Buffering...</div>
        )}

        {/* Ready dot */}
        {trailerState === 'ready' && !isFocused && (
          <div style={{
            position: 'absolute',
            bottom: 5,
            right: 5,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#4fc3f7',
            boxShadow: '0 0 4px #4fc3f7',
          }} />
        )}

        {/* Genre tag */}
        <div style={{
          position: 'absolute',
          bottom: 5,
          left: 5,
          fontSize: 8,
          color: isFocused ? '#4fc3f7' : '#555',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 3,
          padding: '1px 5px',
          transition: 'color 0.2s',
        }}>
          {genre}
        </div>
      </div>

      {/* Buffer progress bar */}
      <div style={{ height: 2, background: '#0a0a12' }}>
        <div style={{
          height: '100%',
          width: isPlaying ? `${playProgress}%` : `${bufferProgress}%`,
          background: isPlaying ? '#ff9800' : '#4fc3f7',
          transition: 'width 0.08s linear, background 0.3s ease',
        }} />
      </div>

      {/* Info */}
      <div style={{ padding: '4px 6px 5px' }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: isFocused ? '#fff' : '#999',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'color 0.2s',
        }}>
          {item.title}
        </div>
        <div style={{
          fontSize: 8,
          marginTop: 1,
          color: isPlaying ? '#ff9800' : isFocused ? '#4fc3f7' : '#444',
          transition: 'color 0.2s',
        }}>
          {isPlaying
            ? `▶ ${Math.round(playProgress * duration / 100 / 60)}:${String(Math.round(playProgress * duration / 100 % 60)).padStart(2, '0')} / ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
            : isFocused && trailerState === 'buffering'
              ? 'Loading trailer...'
              : isFocused && trailerState === 'ready'
                ? 'Trailer ready'
                : trailerState === 'ready'
                  ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                  : ''}
        </div>
      </div>
    </div>
  );
}

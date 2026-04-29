import { PaginatedList } from '@navix/react';
import { useState, useRef } from 'react';

import { HOME_ROWS } from '../data';
import type { ContentItem, HomeRowCardType } from '../data';
import { MediaCard } from './MediaCard';
import { PlayerView, type PlayerState } from './PlayerView';

const VISIBLE_COUNT = 6;
const THRESHOLD = 1;

interface HomeViewProps {
  onPlay: (item: ContentItem) => void;
}

export function HomeView({ onPlay: _onPlay }: HomeViewProps) {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const playIconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = (channels: ContentItem[], item: ContentItem) => {
    setPlayer({ channels, current: item, paused: false });
  };

  const handleClose = () => setPlayer(null);

  const handleNext = (): boolean => {
    if (!player) return false;
    const idx = player.channels.findIndex((c) => c.id === player.current.id);
    const next = player.channels[idx + 1];
    if (!next) return false;
    setPlayer((p) => (p ? { ...p, current: next } : null));
    return true;
  };

  const handlePrev = (): boolean => {
    if (!player) return false;
    const idx = player.channels.findIndex((c) => c.id === player.current.id);
    const prev = player.channels[idx - 1];
    if (!prev) return false;
    setPlayer((p) => (p ? { ...p, current: prev } : null));
    return true;
  };

  const handleTogglePause = () => {
    setPlayer((p) => {
      if (!p) return null;
      const nextPaused = !p.paused;
      if (!nextPaused) {
        if (playIconTimerRef.current !== null)
          clearTimeout(playIconTimerRef.current);
        setShowPlayIcon(true);
        playIconTimerRef.current = setTimeout(
          () => setShowPlayIcon(false),
          2000,
        );
      } else {
        if (playIconTimerRef.current !== null) {
          clearTimeout(playIconTimerRef.current);
          playIconTimerRef.current = null;
        }
        setShowPlayIcon(false);
      }
      return { ...p, paused: nextPaused };
    });
  };

  const handleChannelSelect = (ch: ContentItem) => {
    setPlayer((p) => (p ? { ...p, current: ch } : null));
  };

  if (player !== null) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000' }}
      >
        <PlayerView
          player={player}
          onClose={handleClose}
          onNext={handleNext}
          onPrev={handlePrev}
          onChannelSelect={handleChannelSelect}
          onTogglePause={handleTogglePause}
          showPlayIcon={showPlayIcon}
        />
      </div>
    );
  }

  return (
    <>
      {HOME_ROWS.map((row, i) => (
        <div key={row.label} style={{ padding: '24px 32px 0' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#4fc3f7',
              marginBottom: 14,
            }}
          >
            {row.label}
          </div>
          <HomeRow
            items={row.items}
            rowIndex={i}
            cardType={row.cardType}
            onSelect={(item) => handleOpen(row.items, item)}
          />
        </div>
      ))}
    </>
  );
}

function HomeRow({
  items,
  rowIndex,
  cardType,
  onSelect,
}: {
  items: ContentItem[];
  rowIndex: number;
  cardType: HomeRowCardType;
  onSelect: (item: ContentItem) => void;
}) {
  const variant =
    cardType === 'live' ? 'live' : cardType === 'series' ? 'series' : 'movie';

  return (
    <PaginatedList
      fKey={`home-row-${rowIndex}`}
      visibleCount={VISIBLE_COUNT}
      threshold={THRESHOLD}
      items={items}
      gap={12}
      outerStyle={{ padding: '16px 4px' }}
      slotStyle={{ alignItems: 'stretch' }}
      renderItem={(item, fKey) => (
        <MediaCard
          fKey={fKey}
          item={item}
          variant={variant}
          onClick={() => onSelect(item)}
        />
      )}
    />
  );
}

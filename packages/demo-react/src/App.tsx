/**
 * App
 *
 * Root composition component. Menu selection drives which view is rendered
 * below. Each view mounts/unmounts its own focus nodes — the tree is always
 * in sync with what is visible on screen.
 *
 * Focus tree structure (example: Home tab active):
 *   FocusRoot
 *   └─ VerticalList "app"
 *      ├─ MenuRow               (HorizontalList "menu")
 *      │  ├─ MenuItem "menu-Home"
 *      │  └─ ...
 *      ├─ ContentRow "home-row-0"   ← HomeView renders these
 *      ├─ ContentRow "home-row-1"
 *      └─ ContentRow "home-row-2"
 *
 * When the user switches to Favourites, HomeView unmounts (rows unregister),
 * FavouritesView mounts (grid registers). The tree updates automatically —
 * no manual focus management needed.
 */

import { FocusRoot, VerticalList } from '@navix/react';
import { useState, useRef } from 'react';

import { EventLog } from './components/EventLog';
import { HomeView } from './components/HomeView';
import { LiveView } from './components/LiveView';
import { MenuRow } from './components/MenuRow';
import { MovieView } from './components/MovieView';
import { PlayerView, type PlayerState } from './components/PlayerView';
import { SeriesView } from './components/SeriesView';

type TabKey = 'Home' | 'Movie' | 'Series' | 'Live';

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('Home');
  const [log, setLog] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<PlayerState | null>(null);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const playIconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = (msg: string) =>
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 29),
    ]);

  const handleMenuSelect = (item: string) => {
    setActiveTab(item as TabKey);
    emit(`Menu: ${item}`);
  };

  const handleSelect = (state: PlayerState) => {
    setSelectedEntry(state);
    emit(`Play: ${state.current.title} (${state.current.year})`);
  };

  const handleClose = () => setSelectedEntry(null);

  const handleNext = (): boolean => {
    if (!selectedEntry) return false;
    const idx = selectedEntry.channels.findIndex(
      (c) => c.id === selectedEntry.current.id,
    );
    const next = selectedEntry.channels[idx + 1];
    if (!next) return false;
    setSelectedEntry((p) => (p ? { ...p, current: next } : null));
    return true;
  };

  const handlePrev = (): boolean => {
    if (!selectedEntry) return false;
    const idx = selectedEntry.channels.findIndex(
      (c) => c.id === selectedEntry.current.id,
    );
    const prev = selectedEntry.channels[idx - 1];
    if (!prev) return false;
    setSelectedEntry((p) => (p ? { ...p, current: prev } : null));
    return true;
  };

  const handleTogglePause = () => {
    setSelectedEntry((p) => {
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

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: '#0a0a0f',
        color: '#eee',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <FocusRoot>
        <VerticalList
          fKey="app"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <MenuRow onSelect={handleMenuSelect} />
          {activeTab === 'Home' && <HomeView onSelect={handleSelect} />}
          {activeTab === 'Movie' && <MovieView onSelect={handleSelect} />}
          {activeTab === 'Series' && <SeriesView onSelect={handleSelect} />}
          {activeTab === 'Live' && <LiveView onSelect={handleSelect} />}
        </VerticalList>

        {selectedEntry !== null && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: '#000',
            }}
          >
            <PlayerView
              player={selectedEntry}
              onClose={handleClose}
              onNext={handleNext}
              onPrev={handlePrev}
              onChannelSelect={(ch) =>
                setSelectedEntry((p) => (p ? { ...p, current: ch } : null))
              }
              onTogglePause={handleTogglePause}
              showPlayIcon={showPlayIcon}
            />
          </div>
        )}
      </FocusRoot>

      <EventLog entries={log} />
    </div>
  );
}

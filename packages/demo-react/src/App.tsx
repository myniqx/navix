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
import { useState } from 'react';

import { EventLog } from './components/EventLog';
import { HomeView } from './components/HomeView';
import { LiveView } from './components/LiveView';
import { MenuRow } from './components/MenuRow';
import { MovieView } from './components/MovieView';
import { SeriesView } from './components/SeriesView';
import type { ContentItem } from './data';

// Maps each menu label to its tab key for strict typing
type TabKey = 'Home' | 'Movie' | 'Series' | 'Live';

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('Home');
  const [log, setLog] = useState<string[]>([]);

  const emit = (msg: string) =>
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 29),
    ]);

  const handleMenuSelect = (item: string) => {
    setActiveTab(item as TabKey);
    emit(`Menu: ${item}`);
  };

  const handlePlay = (item: ContentItem) => {
    emit(`Play: ${item.title} (${item.year})`);
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
            overflow: 'auto',
          }}
        >
          <MenuRow onSelect={handleMenuSelect} />
          {activeTab === 'Home' && <HomeView onPlay={handlePlay} />}
          {activeTab === 'Movie' && <MovieView />}
          {activeTab === 'Series' && <SeriesView onPlay={handlePlay} />}
          {activeTab === 'Live' && <LiveView onPlay={handlePlay} />}
        </VerticalList>
      </FocusRoot>

      <EventLog entries={log} />
    </div>
  );
}

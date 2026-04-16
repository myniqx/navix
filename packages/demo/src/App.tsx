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

import { useState } from 'react';
import { FocusRoot, VerticalList } from '@navix/react';
import type { ContentItem } from './data';
import { MenuRow } from './components/MenuRow';
import { HomeView } from './components/HomeView';
import { MovieView } from './components/MovieView';
import { SeriesView } from './components/SeriesView';
import { LiveView } from './components/LiveView';
import { EventLog } from './components/EventLog';

// Maps each menu label to its tab key for strict typing
type TabKey = 'Home' | 'Movie' | 'Series' | 'Live';

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('Home');
  const [log, setLog] = useState<string[]>([]);

  const emit = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 29)]);

  const handleMenuSelect = (item: string) => {
    setActiveTab(item as TabKey);
    emit(`Menu: ${item}`);
  };

  const handlePlay = (item: ContentItem) => {
    emit(`Play: ${item.title} (${item.year})`);
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      background: '#0a0a0f',
      color: '#eee',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <FocusRoot>
        <VerticalList fKey="app">
          {/* Menu is always mounted — tab switch happens on Enter */}
          <MenuRow onSelect={handleMenuSelect} />

          {/*
            Only the active tab's view is mounted at any given time.
            When a view unmounts, all its focus nodes unregister from the tree.
            When a new view mounts, its nodes register and the first one gets focus.
            This gives correct focus behavior for free — no manual wiring needed.
          */}
          {activeTab === 'Home'   && <HomeView onPlay={handlePlay} />}
          {activeTab === 'Movie'  && <MovieView />}
          {activeTab === 'Series' && <SeriesView onPlay={handlePlay} />}
          {activeTab === 'Live'   && <LiveView onPlay={handlePlay} />}
        </VerticalList>
      </FocusRoot>

      <EventLog entries={log} />
    </div>
  );
}

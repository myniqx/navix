/**
 * App
 *
 * Root composition component. Wires together the focus tree and the UI layout.
 *
 * Focus tree structure:
 *   FocusRoot (creates FocusTree + listens to keyboard events)
 *   └─ VerticalList "app"          (up/down moves between rows)
 *      ├─ MenuRow                  (HorizontalList "menu")
 *      │  ├─ MenuItem "menu-Home"
 *      │  ├─ MenuItem "menu-Favourites"
 *      │  └─ ...
 *      ├─ ContentRow "row-0"       (HorizontalList, Action shelf)
 *      │  ├─ ContentCard "row-0-Action-0"
 *      │  └─ ...
 *      ├─ ContentRow "row-1"       (Series shelf)
 *      └─ ContentRow "row-2"       (Live TV shelf)
 */

import { useState } from 'react';
import { FocusRoot, VerticalList } from '@navix/react';
import { ROWS } from './data';
import { MenuRow } from './components/MenuRow';
import { ContentRow } from './components/ContentRow';
import { EventLog } from './components/EventLog';

export function App() {
  const [log, setLog] = useState<string[]>([]);

  // Prepend new entries and keep the last 30
  const emit = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 29)]);

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: '#0a0a0f',
        color: '#eee',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/*
        FocusRoot:
          - Creates the FocusTree (root FocusNode + InputManager)
          - Attaches document keydown/keyup listeners
          - Provides the root FocusNode via React context
      */}
      <FocusRoot>
        {/*
          VerticalList:
            - Registers itself into FocusRoot's context
            - Handles up/down arrow keys to switch between its children
            - Provides its own node as context so children can register into it
        */}
        <VerticalList fKey="app">
          <MenuRow onSelect={(item) => emit(`Menu: ${item}`)} />
          {ROWS.map((row, i) => (
            <ContentRow
              key={row.label}
              rowKey={`row-${i}`}
              label={row.label}
              items={row.items}
              onPress={(item) => emit(`Pressed: ${item.title} (${item.year})`)}
            />
          ))}
        </VerticalList>
      </FocusRoot>

      {/* EventLog sits outside FocusRoot — it is purely presentational */}
      <EventLog entries={log} />
    </div>
  );
}

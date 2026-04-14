# Navix

A spatial navigation library for web-based TV platforms (Tizen, WebOS, browser).

Navix manages keyboard-driven focus across a tree of components — the same model used in every TV UI. You describe the structure (which rows, which grids, which buttons), and Navix routes arrow key events through the tree automatically.

---

## Architecture

```
┌─────────────────────────────────────┐
│  @navix/core                        │
│                                     │
│  FocusNode  ←  FocusTree            │
│     ↑              ↑                │
│  register     InputManager          │
│                    ↑                │
│              keydown / keyup        │
└─────────────────────────────────────┘
         ↑ consumed by
┌─────────────────────────────────────┐
│  @navix/react  (thin adapter)       │
│                                     │
│  FocusRoot   useFocusable           │
│  HorizontalList  VerticalList       │
│  Button  Expandable                 │
└─────────────────────────────────────┘
```

**Core owns all logic.** It is DOM-aware but has no dependency on any UI framework. React (or Vue, Solid, Vanilla — future adapters) is a thin lifecycle + context layer on top.

---

## Packages

### `@navix/core`

All navigation logic lives here.

| Export | Description |
|---|---|
| `FocusNode` | One node in the focus tree. Every focusable element is a node. |
| `FocusTree` | Root node + InputManager wired together. |
| `InputManager` | Maps `KeyboardEvent.code` values to named actions. Detects longpress and doublepress via timers. |
| `ListBehavior` | Attaches left/right (horizontal) or up/down (vertical) navigation to a node. Wraps around at boundaries. |
| `GridBehavior` | Attaches 4-direction navigation with column-based row wrapping. |
| `ButtonBehavior` | Handles enter/longpress/doublepress on a leaf node. |
| `ExpandableBehavior` | Two-state container (collapsed/expanded). Traps focus when expanded. Only one expandable can be open at a time — expanding one collapses all others via a tree walk. |
| `IFocusNodeBehavior` | Interface all behaviors implement. Provides `onRegister`, `onUnregister`, `collapse`, `expand` lifecycle hooks. |

### `@navix/react`

React 18+ adapter. Peer dependency on `react` and `react-dom`.

| Export | Description |
|---|---|
| `FocusRoot` | Creates the `FocusTree`, attaches `keydown`/`keyup` listeners to `document`, provides root node via context. |
| `useFocusable(key, options?)` | Hook. Creates a `FocusNode`, registers it into the nearest parent context, returns `focused`, `directlyFocused`, and `FocusProvider`. |
| `HorizontalList` | Thin wrapper: creates a node + attaches `ListBehavior('horizontal')`. |
| `VerticalList` | Thin wrapper: creates a node + attaches `ListBehavior('vertical')`. |
| `Grid` | Thin wrapper: creates a node + attaches `GridBehavior(columns)`. |
| `Button` | Leaf wrapper: creates a node + handles enter events. Supports `onClick`, `focusedStyle`, and render prop children. Mouse click and keyboard Enter fire the same `onClick`. |
| `Expandable` | Wrapper around `ExpandableBehavior`. Render prop exposes `isExpanded`, `focused`, `directlyFocused`, `expand`, `collapse`. Mouse click toggles expand state. |

---

## Core Concepts

### FocusNode and the tree

Every focusable element — a button, a row, a grid — is a `FocusNode`. Nodes form a tree. Each node tracks its children and which child is currently active via `activeChildId` (an ID string, never an array index).

```
FocusTree.root
└─ VerticalList "app"
   ├─ HorizontalList "menu"
   │  ├─ "menu-Home"        ← directlyFocused
   │  └─ "menu-Settings"
   └─ HorizontalList "row-0"
      ├─ "card-0"
      └─ "card-1"
```

`isFocused` is `true` for every node on the active path from root to leaf.
`isDirectlyFocused` is `true` only for the deepest active leaf.

### Event routing

Events travel **down then up**:

1. `FocusTree` receives a `NavEvent` and calls `root.handleEvent(event)`.
2. Each node forwards the event to its `activeChild` first.
3. If the child returns `false` (did not consume), the node calls its own `onEvent`.
4. If `onEvent` returns `true` (consumed), propagation stops.
5. If `false`, the event bubbles to the parent.

This means a deeply nested button can consume `enter`, while `left`/`right` fall through to the row, and `up`/`down` fall through further to the page layout.

### InputManager and gestures

`InputManager` translates raw `keydown`/`keyup` calls into `NavEvent` objects:

```ts
interface NavEvent {
  action: string;   // 'left' | 'right' | 'up' | 'down' | 'enter' | 'back' | custom
  type: 'press' | 'longpress' | 'doublepress';
}
```

Default key mappings:

| Action | Keys |
|---|---|
| `left` | `ArrowLeft` |
| `right` | `ArrowRight` |
| `up` | `ArrowUp` |
| `down` | `ArrowDown` |
| `enter` | `Enter` (longpress after 500ms) |
| `back` | `Backspace`, `Escape` |

Custom mappings and per-action longpress/doublepress thresholds can be passed to `FocusRoot` via the `inputConfig` prop.

### Behaviors

Behaviors are classes that implement `IFocusNodeBehavior` and wire `node.onEvent` to handle navigation logic. They contain no DOM manipulation and no rendering.

Each behavior sets `node.behavior = this` in its constructor, which allows the tree to call lifecycle hooks (`onRegister`, `onUnregister`, `collapse`, `expand`) on the behavior when needed.

```ts
// Moves focus between children on left/right — wraps around at boundaries
new ListBehavior(node, 'horizontal');

// Moves focus between children on up/down — wraps around at boundaries
new ListBehavior(node, 'vertical');

// 4-direction navigation with column count for row wrapping
new GridBehavior(node, 3);

// Leaf button — handles enter/longpress/doublepress
new ButtonBehavior(node, {
  onPress: () => {},
  onLongPress: () => {},
  onDoublePress: () => {},
});

// Two-state container — enter expands, back collapses, focus is trapped when expanded
new ExpandableBehavior(node);
```

You can skip built-in behaviors entirely and write `node.onEvent` directly for custom navigation logic.

### Expandable and exclusive focus

`ExpandableBehavior` enforces a single-open-at-a-time rule across the **entire tree**:

- When a node expands, it walks the tree from root via `node.getRoot()` and calls `behavior.collapse()` on every other expandable node it finds.
- When a node unregisters from the tree, `FocusNode.unregister` calls `behavior.onUnregister()` which resets expanded state — preventing stale state on re-mount.

This is handled entirely in core. No coordination is needed from the adapter layer.

---

## Getting Started

```bash
bun add @navix/core @navix/react
# or
npm install @navix/core @navix/react
```

### Basic navigation

```tsx
import { FocusRoot, HorizontalList, Button } from '@navix/react';

function App() {
  return (
    <FocusRoot>
      <HorizontalList fKey="row">
        <Button fKey="play" onClick={() => console.log('Play')}>
          Play
        </Button>
        <Button fKey="info" onClick={() => console.log('Info')}>
          Info
        </Button>
      </HorizontalList>
    </FocusRoot>
  );
}
```

### Focus styling — focusedStyle prop

`Button` accepts a `focusedStyle` prop merged onto the wrapper when focused:

```tsx
<Button
  fKey="play"
  style={{ background: '#222', color: '#888', padding: '8px 16px' }}
  focusedStyle={{ background: '#4fc3f7', color: '#000' }}
  onClick={() => play()}
>
  ▶ Play
</Button>
```

### Focus styling — render prop

For components that need full control over focus-driven rendering:

```tsx
<Button fKey="play" onClick={() => play()}>
  {({ focused }) => (
    <div style={{ color: focused ? '#fff' : '#888' }}>▶ Play</div>
  )}
</Button>
```

### Custom focus logic with useFocusable

```tsx
import { useFocusable } from '@navix/react';
import type { NavEvent } from '@navix/core';

function MenuItem({ fKey, label, onPress }: { fKey: string; label: string; onPress: () => void }) {
  const { directlyFocused, FocusProvider } = useFocusable(fKey, {
    onEvent: (e: NavEvent) => {
      if (e.action === 'enter' && e.type === 'press') { onPress(); return true; }
      return false;
    },
  });

  return (
    <FocusProvider>
      <div style={{ color: directlyFocused ? '#fff' : '#888' }}>{label}</div>
    </FocusProvider>
  );
}
```

### Expandable — card action overlay

`Expandable` turns a node into a two-state container. When expanded, focus is trapped inside and only `back` can close it. Only one expandable can be open at a time — the tree enforces this automatically.

```tsx
import { Expandable, HorizontalList, Button } from '@navix/react';

function ContentCard({ fKey, title }: { fKey: string; title: string }) {
  return (
    <Expandable fKey={fKey}>
      {({ isExpanded, directlyFocused, collapse }) => (
        <div style={{ border: directlyFocused ? '2px solid #4fc3f7' : '2px solid transparent' }}>
          <div>{title}</div>

          {isExpanded ? (
            // These nodes mount into the focus tree when the card expands.
            // left/right now navigates between Play and Info instead of between cards.
            // back is caught by ExpandableBehavior and collapses the card.
            <HorizontalList fKey={`${fKey}-actions`}>
              <div style={{ display: 'flex' }}>
                <Button
                  fKey={`${fKey}-play`}
                  style={{ background: '#1a2a3a', color: '#aaa' }}
                  focusedStyle={{ background: '#4fc3f7', color: '#000' }}
                  onClick={() => { play(); collapse(); }}
                >
                  ▶ Play
                </Button>
                <Button
                  fKey={`${fKey}-info`}
                  style={{ background: '#1a2a3a', color: '#aaa' }}
                  focusedStyle={{ background: '#4fc3f7', color: '#000' }}
                  onClick={() => collapse()}
                >
                  ℹ Info
                </Button>
              </div>
            </HorizontalList>
          ) : (
            <div>Press Enter to open</div>
          )}
        </div>
      )}
    </Expandable>
  );
}
```

### Custom key mapping

```tsx
<FocusRoot inputConfig={{
  actions: {
    left:  { keys: ['ArrowLeft', 'KeyA'] },
    right: { keys: ['ArrowRight', 'KeyD'] },
    up:    { keys: ['ArrowUp', 'KeyW'] },
    down:  { keys: ['ArrowDown', 'KeyS'] },
    enter: { keys: ['Enter', 'Space'], longpress: true, longpressMs: 600 },
    back:  { keys: ['Escape'] },
  }
}}>
```

---

## Running the Demo

```bash
bun install
bun run dev
```

Opens a TV-style streaming UI at `http://localhost:5173` (or next available port).

Navigate with arrow keys. Press `Enter` to select. Press `Backspace` or `Escape` to go back.

The demo shows:
- Top menu bar (horizontal navigation, wrap-around)
- Three content shelves: Action, Series, Live TV (vertical between rows, horizontal within)
- Card action overlay: Enter opens Play/Info buttons, back closes. Only one card can be expanded at a time.
- Poster color changes on Play (green) and Info (blue)
- Event log panel
- Mouse support: click cards to expand, click buttons to activate

---

## Key Design Decisions

**ID-based focus tracking** — `activeChildId` stores the node's `id` string, not an array index. This means reordering, inserting, or removing children does not corrupt focus state.

**DOM-aware core** — Core has no framework dependency but targets browser environments. DOM-based spatial ordering (reading element positions for up/down in a grid) is a planned addition and fits naturally into the existing architecture.

**Bottom-up event return** — Returning `true` from `onEvent` consumes the event. Returning `false` lets it bubble. This makes custom behavior composable: a component handles what it knows about and ignores the rest.

**Behaviors are decorators** — All behaviors implement `IFocusNodeBehavior` and set `node.behavior = this`. This allows the tree to call lifecycle hooks (`onRegister`, `onUnregister`, `collapse`, `expand`) without knowing which behavior is attached.

**Exclusive expand in core** — `ExpandableBehavior` walks the tree on expand to close all other expandables. This is a core concern, not an adapter concern — the rule holds regardless of framework.

**React StrictMode safe** — `FocusRoot` handles the double-mount cycle. `FocusNode.register` guards against duplicate registration.

---

## Roadmap

- [ ] DOM-based spatial ordering (read element positions for free-form grid navigation)
- [ ] `FocusNode.requestFocus()` — programmatic focus from anywhere in the tree
- [ ] Vue 3 adapter (`@navix/vue`)
- [ ] Solid adapter (`@navix/solid`)
- [ ] Vanilla JS adapter (`@navix/vanilla`)
- [ ] Focus memory per node (restore last active child on re-focus)
- [ ] Scroll-into-view integration
- [ ] Test suite

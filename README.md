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
│  Grid  Button  Expandable           │
│  PaginatedList  PaginatedGrid       │
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
| `ListBehavior` | Attaches left/right (horizontal) or up/down (vertical) navigation to a node. Stops at boundaries. |
| `GridBehavior` | Attaches 4-direction navigation with column-based row wrapping. Stops at row boundaries on left/right. |
| `ButtonBehavior` | Handles enter/longpress/doublepress on a leaf node. |
| `ExpandableBehavior` | Two-state container (collapsed/expanded). Traps focus when expanded. Expanding one node collapses all others, except ancestors on the active path. |
| `PaginatedListBehavior` | Index-based 1D pagination. Tracks `activeIndex` and `viewOffset` independently of DOM children. Notifies React via `onChange` when either changes. |
| `PaginatedGridBehavior` | Index-based 2D pagination. Supports horizontal (column-major) and vertical (row-major) orientation. Pagination axis and cross axis are independent. |
| `IFocusNodeBehavior` | Interface all behaviors implement. Lifecycle hooks: `onRegister`, `onUnregister`, `onChildRegistered`, `onChildUnregistered`, `collapse`, `expand`. |

### `@navix/react`

React 18+ adapter. Peer dependency on `react` and `react-dom`.

| Export | Description |
|---|---|
| `FocusRoot` | Creates the `FocusTree`, attaches `keydown`/`keyup` listeners to `document`, provides root node via context. |
| `useFocusable(key, options?)` | Hook. Creates a `FocusNode`, registers it into the nearest parent context, returns `focused`, `directlyFocused`, `focusSelf`, and `FocusProvider`. |
| `HorizontalList` | Node + `ListBehavior('horizontal')`. |
| `VerticalList` | Node + `ListBehavior('vertical')`. |
| `Grid` | Node + `GridBehavior(columns)`. Syncs `columns` prop on every render. |
| `Button` | Leaf node. Handles enter events. Supports `onClick`, `focusedStyle`, and render prop children. |
| `Expandable` | Node + `ExpandableBehavior`. Render prop exposes `isExpanded`, `focused`, `directlyFocused`, `expand`, `collapse`. |
| `PaginatedList` | Virtualized 1D list with sliding window pagination. Items are rendered only within the visible window + buffer. |
| `PaginatedGrid` | Virtualized 2D grid with sliding window pagination. Supports horizontal (column-major) and vertical (row-major) orientation. |

---

## Core Concepts

### FocusNode and the tree

Every focusable element — a button, a row, a grid — is a `FocusNode`. Nodes form a tree. Each node tracks its children and which child is currently active via `activeChildId`.

```
FocusTree.root
└─ VerticalList "app"
   ├─ HorizontalList "menu"
   │  ├─ "menu-Home"        ← isDirectlyFocused
   │  └─ "menu-Settings"    ← isFocused (ancestor on active path)
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
3. If the child returns `false`, the node calls its own `onEvent`.
4. If `onEvent` returns `true` (consumed), propagation stops.
5. If `false`, the event bubbles to the parent.

A deeply nested button consumes `enter`, while `left`/`right` fall through to the row, and `up`/`down` fall through further to the page layout.

### InputManager and gestures

`InputManager` translates raw `keydown`/`keyup` into `NavEvent` objects:

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

### Behaviors

Behaviors implement `IFocusNodeBehavior` and wire `node.onEvent` to handle navigation logic. They contain no DOM manipulation and no rendering.

```ts
new ListBehavior(node, 'horizontal');   // left/right between children
new ListBehavior(node, 'vertical');     // up/down between children
new GridBehavior(node, columns);        // 4-direction, stops at row edges
new ButtonBehavior(node, { onPress, onLongPress, onDoublePress });
new ExpandableBehavior(node);           // enter expands, back collapses
new PaginatedListBehavior(node, orientation, totalCount, visibleCount, threshold);
new PaginatedGridBehavior(node, orientation, totalCount, rows, columns, threshold);
```

You can skip built-in behaviors entirely and write `node.onEvent` directly for custom navigation logic.

### Expandable and focus trapping

When a node expands, `ExpandableBehavior` walks the full tree and collapses all other expandables — **except nodes on the current active path** (ancestors). This allows nested expandables where an outer container stays open while an inner one opens.

While expanded, all events are trapped inside the node. `back` collapses and releases the trap.

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
        <Button fKey="play" onClick={() => console.log('Play')}>Play</Button>
        <Button fKey="info" onClick={() => console.log('Info')}>Info</Button>
      </HorizontalList>
    </FocusRoot>
  );
}
```

### Focus styling

`Button` accepts a `focusedStyle` prop merged when focused, or a render prop for full control:

```tsx
// focusedStyle prop
<Button fKey="play" style={{ background: '#222' }} focusedStyle={{ background: '#4fc3f7' }}>
  ▶ Play
</Button>

// render prop
<Button fKey="play">
  {({ focused }) => <div style={{ color: focused ? '#fff' : '#888' }}>▶ Play</div>}
</Button>
```

### Custom focus logic

```tsx
import { useFocusable } from '@navix/react';

function MenuItem({ fKey, label, onPress }) {
  const { directlyFocused, FocusProvider } = useFocusable(fKey, {
    onEvent: (e) => {
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

### Expandable

Turns a node into a two-state container. Only one expandable can be open at a time. When expanded, focus is trapped and only `back` can close it.

```tsx
<Expandable fKey="card">
  {({ isExpanded, directlyFocused, collapse }) => (
    <div style={{ border: directlyFocused ? '2px solid #4fc3f7' : '2px solid transparent' }}>
      <div>Title</div>
      {isExpanded && (
        <HorizontalList fKey="card-actions">
          <div style={{ display: 'flex' }}>
            <Button fKey="card-play" focusedStyle={{ background: '#4fc3f7' }} onClick={() => { play(); collapse(); }}>▶ Play</Button>
            <Button fKey="card-info" focusedStyle={{ background: '#4fc3f7' }} onClick={collapse}>ℹ Info</Button>
          </div>
        </HorizontalList>
      )}
    </div>
  )}
</Expandable>
```

### PaginatedList

Virtualized horizontal or vertical list. Only items within the visible window + buffer are mounted. The sliding window moves when focus reaches the threshold position.

```tsx
<PaginatedList
  fKey="row"
  orientation="horizontal"   // 'horizontal' | 'vertical', default 'horizontal'
  items={movies}             // T[] — full item array
  visibleCount={6}           // how many items are visible at once
  threshold={1}              // focus stays fixed until this position from the edge, then window slides
  gap={12}                   // gap between slots in px
  buffer={2}                 // extra items rendered outside visible window for smooth transitions
  renderItem={(item, fKey) => <MovieCard fKey={fKey} item={item} />}
  onItemAction={(action, item) => {
    // action: 'visible' | 'hidden' | 'focused' | 'blurred'
    // visible  → item entered the render window (buffer included) — good time to prefetch
    // hidden   → item left the render window — release resources
    // focused  → item became the active leaf
    // blurred  → item lost direct focus
  }}
  outerStyle={{ padding: '12px 4px' }}  // merged before overflow:hidden and width:100%
  innerStyle={{}}                        // merged before transform and flex direction
  slotStyle={{}}                         // merged before slot sizing
/>
```

### PaginatedGrid

Virtualized 2D grid. Pagination moves one slice (column or row) at a time along the main axis.

```tsx
<PaginatedGrid
  fKey="grid"
  orientation="horizontal"   // 'horizontal': column-major, paginate right | 'vertical': row-major, paginate down
  items={channels}           // T[] — full item array
  rows={4}                   // visible row count
  columns={6}                // visible column count
  threshold={1}              // slices from edge before window starts sliding
  gap={8}
  buffer={1}
  renderItem={(item, fKey) => <ChannelCard fKey={fKey} item={item} />}
  onItemAction={(action, item) => { /* same actions as PaginatedList */ }}
  outerStyle={{ height: 'calc(90vh - 120px)' }}  // height required for cross-axis slot sizing
/>
```

**Horizontal orientation layout** (column-major):
```
col 0      col 1      col 2
[item 0]   [item 4]   [item 8]
[item 1]   [item 5]   [item 9]
[item 2]   [item 6]   [item 10]
[item 3]   [item 7]   [item 11]
```
Left/right moves between columns (pagination axis). Up/down moves within a column (stops at edges).

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

Opens a TV-style streaming UI at `http://localhost:5173`.

Navigate with arrow keys. `Enter` to select. `Backspace` or `Escape` to go back.

| Tab | Component | Description |
|---|---|---|
| Home | `PaginatedList` | Three paginated rows with smart cache simulation |
| Movie | `PaginatedGrid` | 120 movies in a paginated 4×6 grid with trailer preview |
| Series | `HorizontalList` | Classic horizontal shelves |
| Live | `Grid` | Fixed grid of live channels |
| Options | `Expandable` modal | Settings modal with persistent state, navigable with arrow keys |

---

## Key Design Decisions

**ID-based focus tracking** — `activeChildId` stores the node's `id` string, not an array index. Reordering, inserting, or removing children does not corrupt focus state.

**Bottom-up event return** — Returning `true` from `onEvent` consumes the event. Returning `false` lets it bubble. Components handle what they know about and ignore the rest.

**Behaviors are decorators** — All behaviors set `node.behavior = this`. The tree calls lifecycle hooks (`onRegister`, `onUnregister`, `onChildRegistered`, `onChildUnregistered`) without knowing which behavior is attached.

**Exclusive expand in core** — `ExpandableBehavior` walks the tree on expand to close all other expandables. Ancestors on the active path are skipped. This is a core concern — the rule holds regardless of framework.

**Pagination decoupled from DOM** — `PaginatedListBehavior` and `PaginatedGridBehavior` track `activeIndex` and `viewOffset` independently of `node.children`. Navigation decisions happen before React re-renders. `onChildRegistered` is used to hand focus to newly mounted children after the render cycle completes.

**Stable virtual keys** — `PaginatedList` and `PaginatedGrid` generate item keys via `useMemo` tied to the `items` array reference. Keys are stable across scroll — items do not remount when the window slides. When `items` changes (new array reference), all keys regenerate and children remount cleanly.

**React StrictMode safe** — `FocusRoot` handles the double-mount cycle. `FocusNode.register` guards against duplicate registration.

---

## Roadmap

- [x] `FocusNode.requestFocus()` — programmatic focus from anywhere in the tree
- [ ] Vue 3 adapter (`@navix/vue`)
- [ ] Solid adapter (`@navix/solid`)
- [ ] Vanilla JS adapter (`@navix/vanilla`)
- [ ] Focus memory per node (restore last active child on re-focus)
- [ ] Scroll-into-view integration
- [ ] Test suite

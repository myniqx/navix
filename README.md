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
│  Grid  Button  Expandable  Switch   │
│  Input  PaginatedList  PaginatedGrid│
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
| `InputBehavior` | Two-state leaf (idle/editing). Enter starts editing, Enter/back stops editing. Traps focus while editing. |
| `PaginatedListBehavior` | Index-based 1D pagination. Tracks `activeIndex` and `viewOffset` independently of DOM children. Notifies React via `onChange` when either changes. |
| `PaginatedGridBehavior` | Index-based 2D pagination. Supports horizontal (column-major) and vertical (row-major) orientation. |
| `IFocusNodeBehavior` | Interface all behaviors implement. Lifecycle hooks: `onRegister`, `onUnregister`, `onChildRegistered`, `onChildUnregistered`, `onFocus`, `onBlurred`, `collapse`, `expand`. |

### `@navix/react`

React 18+ adapter. Peer dependency on `react` and `react-dom`.

| Export | Description |
|---|---|
| `FocusRoot` | Creates the `FocusTree`, attaches `keydown`/`keyup` listeners to `document`, provides root node via context. |
| `useFocusable(key, callbacks?, createBehavior?)` | Hook. Creates a `FocusNode`, registers it with the nearest parent, returns `focused`, `directlyFocused`, `focusSelf`, `FocusProvider`. Accepts lifecycle callbacks and an optional behavior factory. |
| `HorizontalList` | Node + `ListBehavior('horizontal')`. Accepts `className`, `focusedClassName`, `style`, `focusedStyle` — renders a wrapper div only when any of these are provided. |
| `VerticalList` | Node + `ListBehavior('vertical')`. Accepts `className`, `focusedClassName`, `style`, `focusedStyle` — renders a wrapper div only when any of these are provided. |
| `Grid` | Node + `GridBehavior(columns)`. Syncs `columns` prop on every render. Accepts `className`, `focusedClassName`, `style`, `focusedStyle`. |
| `Button` | Leaf node. Handles enter events. Supports `onClick`, `onLongPress`, `onDoublePress`, `style`, `focusedStyle`, `className`, `focusedClassName`, and render prop children `({ focused }) => ReactNode`. |
| `Switch` | Controlled boolean toggle built on `Button`. Render prop `(checked, focused) => ReactNode`. Exposes `checked` and `onChange`. No click/press callbacks. |
| `Input` | Leaf node + `InputBehavior`. Two-state: idle (navigable) and editing (focus trapped, nav events swallowed). Enter starts editing, Enter/back stops editing. Supports `style`, `focusedStyle`, `editingStyle`, `className`, `focusedClassName`, `editingClassName`. Render prop `({ value, focused, editing, inputRef, stopEditing }) => ReactNode` — omit for a default `<input>`. |
| `Expandable` | Node + `ExpandableBehavior`. Render prop exposes `isExpanded`, `focused`, `directlyFocused`, `expand`, `collapse`. |
| `Dropdown` | Node + `ExpandableBehavior`. Render prop exposes `isExpanded`, `focused`, `directlyFocused`, `collapse`. Supports single/multi-select, custom trigger and option renderers, top/bottom position. |
| `PaginatedList` | Virtualized 1D list with sliding window pagination. Items are rendered only within the visible window + buffer. Accepts `outerClassName`, `innerClassName`, `slotClassName`. |
| `PaginatedGrid` | Virtualized 2D grid with sliding window pagination. Supports horizontal (column-major) and vertical (row-major) orientation. Accepts `outerClassName`, `innerClassName`, `slotClassName`. |
| `BaseComponentProps` | Shared interface all components extend: `fKey`, `onFocus`, `onBlurred`, `onRegister`, `onUnregister`. |

---

## Core Concepts

### FocusNode and the tree

Every focusable element — a button, a row, a grid — is a `FocusNode`. Nodes form a tree. Each node tracks its children and which child is currently active via `activeChildId`.

```
FocusTree.root
└─ VerticalList "app"
   ├─ HorizontalList "menu"
   │  ├─ "menu-Home"        ← isDirectlyFocused
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
new InputBehavior(node);                // enter starts editing, enter/back stops editing
new PaginatedListBehavior(node, orientation, totalCount, visibleCount, threshold);
new PaginatedGridBehavior(node, orientation, totalCount, rows, columns, threshold);
```

All behaviors fire lifecycle hooks when core calls them:

| Hook | When |
|---|---|
| `onRegister` | Node registered with parent |
| `onUnregister` | Node removed from parent |
| `onFocus` | Node became the directly focused leaf |
| `onBlurred` | Node lost direct focus |
| `onChildRegistered` | A child node was registered |
| `onChildUnregistered` | A child node was unregistered |

You can skip built-in behaviors entirely and return a plain object from `createBehavior` for custom navigation logic.

### BaseComponentProps and callbacks

All React components extend `BaseComponentProps`:

```ts
interface BaseComponentProps {
  fKey: string;
  onFocus?: (key: string) => void;
  onBlurred?: (key: string) => void;
  onRegister?: (key: string) => void;
  onUnregister?: (key: string) => void;
}
```

`key` is the `fKey` of the component that fired the event — useful for identifying which item in a list changed state.

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

### 1. FocusRoot

Wraps your entire app. Creates the `FocusTree`, attaches keyboard listeners to `document`, and provides the root focus node via context. All Navix components must be inside a `FocusRoot`.

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

Pass `tailwind-merge`'s `twMerge` via `mergeClassName` for conflict-free Tailwind class merging:

```tsx
import { twMerge } from 'tailwind-merge';
<FocusRoot mergeClassName={twMerge}>...</FocusRoot>
```

Custom key mappings via `inputConfig`:

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

### 2. HorizontalList / VerticalList

Container nodes that route arrow key navigation between their children. `HorizontalList` responds to left/right, `VerticalList` to up/down.

```tsx
<VerticalList fKey="page">
  <HorizontalList fKey="row-0">
    <Button fKey="a">A</Button>
    <Button fKey="b">B</Button>
  </HorizontalList>
  <HorizontalList fKey="row-1">
    <Button fKey="c">C</Button>
    <Button fKey="d">D</Button>
  </HorizontalList>
</VerticalList>
```

Both accept `style`, `focusedStyle`, `className`, `focusedClassName` — a wrapper div is rendered only when any of these are provided.

### 3. Grid

Fixed 2D grid. Navigates in all four directions, stopping at row edges on left/right.

```tsx
<Grid fKey="channel-grid" columns={5}>
  {channels.map((ch) => (
    <Button key={ch.id} fKey={ch.id} onClick={() => tune(ch)}>
      {ch.name}
    </Button>
  ))}
</Grid>
```

### 4. Button

Leaf focusable. Fires `onClick` on both mouse click and keyboard enter. Supports `onLongPress` and `onDoublePress` for keyboard-only gestures.

Three ways to style focused state:

```tsx
// 1. focusedStyle
<Button fKey="play" style={{ background: '#222' }} focusedStyle={{ background: '#4fc3f7' }}>
  ▶ Play
</Button>

// 2. focusedClassName (use with Tailwind)
<Button fKey="play" className="bg-card px-4 py-2 rounded" focusedClassName="ring-2 ring-primary">
  ▶ Play
</Button>

// 3. Render prop — full control
<Button fKey="play">
  {({ focused }) => <div style={{ color: focused ? '#fff' : '#888' }}>▶ Play</div>}
</Button>
```

`style` is always applied as an inline style — it wins over `className` when both target the same property (standard browser behavior).

### 5. Switch

Controlled boolean toggle built on `Button`. Enter or click flips `checked` and calls `onChange`. Render prop receives `(checked, focused)`.

```tsx
const [enabled, setEnabled] = useState(false);

<Switch fKey="notifications" checked={enabled} onChange={setEnabled}>
  {(checked, focused) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span>Notifications</span>
      <span style={{
        padding: '3px 12px',
        borderRadius: 20,
        background: checked ? '#1e3a2e' : '#1a1a2e',
        color: checked ? '#4caf7d' : '#555',
        outline: focused ? '1px solid #4fc3f7' : 'none',
      }}>
        {checked ? 'On' : 'Off'}
      </span>
    </div>
  )}
</Switch>
```

### 6. Input

Two-state text input. Idle mode: navigable like any other component. Editing mode: focus is trapped, nav events are swallowed, and the native `<input>` element receives keyboard input. Enter starts editing, Enter or back stops editing.

```tsx
const [query, setQuery] = useState('');

// Default input element — style/className props applied to the wrapper div
<Input
  fKey="search"
  value={query}
  onChange={setQuery}
  style={{ border: '1px solid #333', borderRadius: 4, padding: '5px 10px' }}
  focusedStyle={{ borderColor: '#4fc3f7' }}
  editingStyle={{ borderColor: '#4fc3f7', boxShadow: '0 0 0 2px rgba(79,195,247,0.15)' }}
/>

// Custom render — full control
<Input fKey="search" value={query} onChange={setQuery}>
  {({ editing, inputRef, stopEditing }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <SearchIcon />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') stopEditing(); }}
      />
    </div>
  )}
</Input>
```

### 7. Expandable

Two-state container. Enter expands, back collapses. Only one expandable can be open at a time — opening one closes all others. While expanded, focus is trapped inside.

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

### 8. Dropdown

Single or multi-select dropdown built on `Expandable`. Options are navigated with up/down. Enter selects, back closes.

```tsx
const [resolution, setResolution] = useState(['1080p']);

<Dropdown
  fKey="resolution"
  options={[
    { value: '4k', label: '4K' },
    { value: '1080p', label: '1080p' },
    { value: '720p', label: '720p' },
  ]}
  value={resolution}
  onChange={setResolution}
  maxVisible={5}
  position="bottom"
/>
```

### 9. PaginatedList

Virtualized horizontal or vertical list. Only items within the visible window + buffer are mounted. The window slides when focus reaches the threshold position from either edge.

```tsx
<PaginatedList
  fKey="row"
  orientation="horizontal"   // 'horizontal' | 'vertical', default 'horizontal'
  items={movies}             // T[] — full item array
  visibleCount={6}           // how many items are visible at once
  threshold={1}              // positions from edge before window slides
  gap={12}                   // gap between slots in px
  buffer={2}                 // extra items rendered outside visible window
  renderItem={(item, fKey) => <MovieCard fKey={fKey} item={item} />}
  outerStyle={{ padding: '12px 4px' }}
  slotStyle={{ alignItems: 'stretch' }}
/>
```

### 10. PaginatedGrid

Virtualized 2D grid. Pagination moves one slice at a time along the main axis.

```tsx
<PaginatedGrid
  fKey="grid"
  orientation="horizontal"   // 'horizontal': column-major | 'vertical': row-major
  items={channels}
  rows={4}
  columns={6}
  threshold={1}
  gap={8}
  buffer={1}
  renderItem={(item, fKey) => <ChannelCard fKey={fKey} item={item} />}
  outerStyle={{ height: 'calc(90vh - 120px)' }}
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

### 11. Focus lifecycle callbacks

Every component accepts `onFocus`, `onBlurred`, `onRegister`, `onUnregister`. All receive the `fKey` of the component that fired the event:

```tsx
<Button
  fKey="play"
  onRegister={(key) => console.log(key, 'mounted')}
  onFocus={(key) => console.log(key, 'focused')}
  onBlurred={(key) => console.log(key, 'blurred')}
  onUnregister={(key) => console.log(key, 'unmounted')}
  onClick={() => play()}
>
  ▶ Play
</Button>
```

### 12. Custom focusable with useFocusable

For components that need direct access to focus state without using a built-in component.

```tsx
import { useFocusable } from '@navix/react';
import { ButtonBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';

function MenuItem({ fKey, label, onPress, onFocus }) {
  const { directlyFocused, focusSelf } = useFocusable(
    fKey,
    { onFocus: (key) => onFocus?.(key) },
    (node: FocusNode) => new ButtonBehavior(node, { onPress }),
  );

  return (
    <div onMouseEnter={focusSelf} style={{ color: directlyFocused ? '#fff' : '#888' }}>
      {label}
    </div>
  );
}
```

You can also return a plain object instead of a class instance:

```tsx
const { directlyFocused, focusSelf } = useFocusable(fKey, {}, () => ({
  onEvent: (e) => {
    if (e.action === 'enter' && e.type === 'press') { onPress(); return true; }
    return false;
  },
}));
```

If no `createBehavior` is provided, a minimal default behavior is attached automatically so callbacks are always wired correctly.

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
| Home | `PaginatedList` | Three paginated rows — movies, series, live channels. Each card caches a trailer on mount and plays on focus. |
| Movie | `PaginatedGrid` | Movies in a paginated 4×6 grid with trailer preview simulation. |
| Series | `HorizontalList` | Classic horizontal shelves. |
| Live | `Grid` | Fixed grid of live channels. |
| Options | `Expandable` + `Dropdown` + `Switch` + `Input` | Settings modal with persistent state. Contains dropdowns, a boolean toggle, and a text input — all keyboard navigable. |

---

## Key Design Decisions

**ID-based focus tracking** — `activeChildId` stores the node's `id` string, not an array index. Reordering, inserting, or removing children does not corrupt focus state.

**Bottom-up event return** — Returning `true` from `onEvent` consumes the event. Returning `false` lets it bubble. Components handle what they know about and ignore the rest.

**Behaviors are decorators** — `useFocusable` sets `node.behavior` to the return value of `createBehavior`, or to a default `{ onEvent: () => false }` if none is provided. The tree calls lifecycle hooks (`onRegister`, `onUnregister`, `onFocus`, `onBlurred`, `onChildRegistered`, `onChildUnregistered`) without knowing which behavior is attached.

**Callbacks always wired** — `useFocusable` attaches a minimal default behavior when no `createBehavior` is provided, ensuring `onFocus`/`onBlurred`/`onRegister`/`onUnregister` callbacks are always delivered regardless of whether the component uses a built-in behavior.

**Exclusive expand in core** — `ExpandableBehavior` walks the tree on expand to close all other expandables. Ancestors on the active path are skipped. This is a core concern — the rule holds regardless of framework.

**Pagination decoupled from DOM** — `PaginatedListBehavior` and `PaginatedGridBehavior` track `activeIndex` and `viewOffset` independently of `node.children`. Navigation decisions happen before React re-renders. `onChildRegistered` is used to hand focus to newly mounted children after the render cycle completes.

**Stable virtual keys** — `PaginatedList` and `PaginatedGrid` generate item keys via `useMemo` tied to the `items` array reference. Keys are stable across scroll — items do not remount when the window slides. When `items` changes (new array reference), all keys regenerate and children remount cleanly.

**Item-level lifecycle via child callbacks** — Paginated components do not proxy item events. Each child component handles its own `onRegister`/`onFocus`/`onBlurred`/`onUnregister` lifecycle directly via `useFocusable` or the component's own props.

**React StrictMode safe** — `FocusRoot` handles the double-mount cycle. `FocusNode.register` guards against duplicate registration.

---

## Roadmap

- [x] `FocusNode.requestFocus()` — programmatic focus from anywhere in the tree
- [x] `onFocus` / `onBlurred` lifecycle callbacks on all components
- [x] `onRegister` / `onUnregister` lifecycle callbacks on all components
- [x] `Switch` — controlled boolean toggle
- [x] `Input` — two-state text input with idle/editing modes
- [ ] Vue 3 adapter (`@navix/vue`)
- [ ] Solid adapter (`@navix/solid`)
- [ ] Vanilla JS adapter (`@navix/vanilla`)
- [ ] Scroll-into-view integration
- [ ] Test suite

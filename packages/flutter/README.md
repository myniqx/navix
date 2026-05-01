# navix (Flutter)

A spatial navigation library for Flutter TV platforms (Android TV, Fire TV, Apple TV, desktop).

Navix manages keyboard-driven focus across a tree of widgets — the same model used in every TV UI. You describe the structure (which rows, which grids, which buttons), and Navix routes arrow key events through the tree automatically.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Core                                   │
│                                         │
│  NavixFocusNode  ←  NavixFocusManager   │
│       ↑                    ↑            │
│    register         HardwareKeyboard    │
│                            ↑            │
│                     KeyDownEvent /      │
│                     KeyUpEvent          │
└─────────────────────────────────────────┘
           ↑ consumed by
┌─────────────────────────────────────────┐
│  Widgets (thin Flutter adapter)         │
│                                         │
│  NavixScope       NavixFocusable        │
│  NavixHorizontalList  NavixVerticalList │
│  NavixGrid        NavixButton           │
│  NavixSwitch      NavixExpandable       │
│  NavixInput       NavixDropdown         │
│  NavixPaginatedList  NavixPaginatedGrid │
│  NavixMultiLayer                        │
└─────────────────────────────────────────┘
```

**Core owns all logic.** It has no dependency on any Flutter widget — it manages the focus tree, event routing, and behavior lifecycle. The widget layer is a thin `StatefulWidget` + `InheritedWidget` adapter on top.

---

## API Reference

### Core

#### `NavixFocusNode`

One node in the focus tree. Every focusable widget is backed by a node.

| Member               | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `key`                | String identifier provided by the widget                     |
| `id`                 | Unique auto-generated ID (`fn_N`) used internally            |
| `isFocused`          | `true` for every node on the active path from root to leaf   |
| `isDirectlyFocused`  | `true` only for the deepest active leaf                      |
| `activeChildId`      | `id` of the currently active child node                      |
| `register(child)`    | Adds a child node; auto-focuses if first child               |
| `unregister(child)`  | Removes a child node; focus falls back to adjacent sibling   |
| `handleEvent(event)` | Routes event down to active child, then up via behavior      |
| `focusNext()`        | Moves active child to the next sibling                       |
| `focusPrev()`        | Moves active child to the previous sibling                   |
| `focusChild(id)`     | Focuses a specific child by its `id`                         |
| `getActiveChild()`   | Returns the currently active child node                      |
| `requestFocus()`     | Programmatically focuses this node from anywhere in the tree |
| `subscribe(fn)`      | Registers a change listener; returns an unsubscribe callback |
| `destroy()`          | Detaches from parent and disposes all children               |

#### `IFocusNodeBehavior`

Interface all behaviors implement. Override the fields you need:

```dart
abstract class IFocusNodeBehavior {
  void Function()? onRegister;
  void Function()? onUnregister;
  void Function()? collapse;
  void Function()? expand;
  bool get isTrapped => false;
  void Function(NavixFocusNode child)? onChildRegistered;
  void Function(NavixFocusNode child)? onChildUnregistered;
  void Function(NavixFocusNode child)? onActiveChildChanged;
  void Function(NavixFocusNode node)? onFocus;
  void Function(NavixFocusNode node)? onBlurred;
  bool Function(NavEvent event)? onEvent;
}
```

#### `NavixFocusManager`

Wires `NavixFocusNode` root to `HardwareKeyboard`. Translates raw key events into `NavEvent` objects and dispatches them to the tree.

| Member     | Description                                             |
| ---------- | ------------------------------------------------------- |
| `root`     | The root `NavixFocusNode`                               |
| `attach()` | Registers the keyboard handler                          |
| `detach()` | Unregisters the keyboard handler and disposes all state |

#### `NavixScope`

`StatefulWidget` that creates a `NavixFocusManager`, calls `attach()`/`detach()` automatically, and exposes the root node via `InheritedWidget`.

```dart
NavixScope.of(context)      // NavixFocusNode — asserts non-null
NavixScope.maybeOf(context) // NavixFocusNode? — returns null if not found
```

#### `NavEvent` / `NavEventType`

```dart
class NavEvent {
  final String action; // 'left' | 'right' | 'up' | 'down' | 'enter' | 'back' | custom
  final NavEventType type; // press | longPress | doublePress
}
```

#### Default key mappings

| Action         | Keys                                       |
| -------------- | ------------------------------------------ |
| `left`         | `ArrowLeft`                                |
| `right`        | `ArrowRight`                               |
| `up`           | `ArrowUp`                                  |
| `down`         | `ArrowDown`                                |
| `enter`        | `Enter`, `Select` (longpress after 500 ms) |
| `back`         | `Escape`, `GoBack`                         |
| `play`         | `MediaPlay`                                |
| `pause`        | `MediaPause`                               |
| `playpause`    | `MediaPlayPause`, `Space`                  |
| `program_up`   | `ChannelUp`                                |
| `program_down` | `ChannelDown`                              |

---

### Widgets

#### `NavixFocusable`

The primitive widget all higher-level widgets are built on. Creates a `NavixFocusNode`, registers it with the nearest parent (`NavixFocusable` or `NavixScope`), and exposes focus state to its builder.

```dart
NavixFocusable(
  fKey: 'my-item',
  createBehavior: (node) => MyBehavior(node),
  callbacks: NavixFocusableCallbacks(
    onFocus: (key) => print('$key focused'),
    onBlurred: (key) => print('$key blurred'),
  ),
  builder: (context, node, focused, directlyFocused) {
    return Container(
      color: directlyFocused ? Colors.blue : Colors.grey,
      child: const Text('Item'),
    );
  },
)
```

| Prop             | Type                       | Description                                                      |
| ---------------- | -------------------------- | ---------------------------------------------------------------- |
| `fKey`           | `String`                   | Required. Identifies this node in the tree                       |
| `builder`        | `NavixFocusableBuilder`    | `(context, node, focused, directlyFocused) → Widget`             |
| `createBehavior` | `NavixBehaviorFactory?`    | `(node) → IFocusNodeBehavior`. Omit for a default no-op behavior |
| `callbacks`      | `NavixFocusableCallbacks?` | `onFocus`, `onBlurred`, `onRegister`, `onUnregister`, `onEvent`  |

Access the nearest `NavixFocusNode` from a descendant:

```dart
NavixFocusable.of(context)      // asserts non-null
NavixFocusable.maybeOf(context) // returns null if not found
```

---

#### `NavixHorizontalList` / `NavixVerticalList`

Container nodes that route arrow key navigation between their children. Horizontal responds to left/right; vertical responds to up/down.

```dart
NavixVerticalList(
  fKey: 'page',
  child: Column(
    children: [
      NavixHorizontalList(
        fKey: 'row-0',
        child: Row(children: [
          NavixButton(fKey: 'a', child: const Text('A'), onClick: () {}),
          NavixButton(fKey: 'b', child: const Text('B'), onClick: () {}),
        ]),
      ),
      NavixHorizontalList(
        fKey: 'row-1',
        child: Row(children: [
          NavixButton(fKey: 'c', child: const Text('C'), onClick: () {}),
          NavixButton(fKey: 'd', child: const Text('D'), onClick: () {}),
        ]),
      ),
    ],
  ),
)
```

Both accept `onFocus`, `onBlurred`, `onRegister`, `onUnregister`. The `child` is rendered as-is — no wrapper is injected.

---

#### `NavixGrid`

Fixed 2D grid. Navigates in all four directions, stopping at row edges on left/right.

```dart
NavixGrid(
  fKey: 'channel-grid',
  columns: 5,
  child: Wrap(
    children: channels.map((ch) =>
      NavixButton(
        fKey: ch.id,
        onClick: () => tune(ch),
        builder: (context, focused) => ChannelCard(channel: ch, focused: focused),
      ),
    ).toList(),
  ),
)
```

`columns` is synced on every rebuild — you can change it dynamically.

---

#### `NavixButton`

Leaf focusable. Fires `onClick` on keyboard enter and on tap. Supports `onLongPress` and `onDoublePress` for keyboard-only gestures. Mouse hover calls `requestFocus()`.

Provide either a `builder` or a `child`:

```dart
// Static child
NavixButton(
  fKey: 'play',
  onClick: play,
  child: const Text('▶ Play'),
)

// Builder — full control over focused state
NavixButton(
  fKey: 'play',
  onClick: play,
  builder: (context, focused) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    decoration: BoxDecoration(
      color: focused ? Colors.blue : Colors.grey.shade800,
      borderRadius: BorderRadius.circular(4),
    ),
    child: const Text('▶ Play'),
  ),
)
```

---

#### `NavixSwitch`

Controlled boolean toggle built on `NavixButton`. Enter or tap flips `checked` and calls `onChange`.

```dart
NavixSwitch(
  fKey: 'notifications',
  checked: enabled,
  onChange: (value) => setState(() => enabled = value),
  builder: (context, checked, focused) => Row(
    children: [
      const Text('Notifications'),
      const SizedBox(width: 12),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
        decoration: BoxDecoration(
          color: checked ? const Color(0xFF1e3a2e) : const Color(0xFF1a1a2e),
          borderRadius: BorderRadius.circular(20),
          border: focused ? Border.all(color: const Color(0xFF4fc3f7)) : null,
        ),
        child: Text(checked ? 'On' : 'Off'),
      ),
    ],
  ),
)
```

---

#### `NavixInput`

Two-state text input. **Idle**: navigable like any other widget. **Editing**: focus is trapped, nav events are swallowed, and the native `TextField` receives keyboard input. Enter starts editing; Enter or back stops editing.

`NavixInput` requires a `builder` — you own the `TextField`:

```dart
NavixInput(
  fKey: 'search',
  value: query,
  onChange: (v) => setState(() => query = v),
  builder: (context, focused, editing, controller, textFocusNode, stopEditing) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(
          color: editing
              ? const Color(0xFF4fc3f7)
              : focused
                  ? Colors.white54
                  : Colors.white24,
        ),
        borderRadius: BorderRadius.circular(4),
      ),
      child: TextField(
        controller: controller,
        focusNode: textFocusNode,
        style: const TextStyle(color: Colors.white),
        decoration: const InputDecoration(
          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          border: InputBorder.none,
        ),
      ),
    );
  },
)
```

The builder receives:

| Param           | Type                    | Description                                   |
| --------------- | ----------------------- | --------------------------------------------- |
| `focused`       | `bool`                  | This node is on the active focus path         |
| `editing`       | `bool`                  | Currently in editing mode                     |
| `controller`    | `TextEditingController` | Synced with `value`; pass to `TextField`      |
| `textFocusNode` | `FocusNode`             | Flutter's own focus node; pass to `TextField` |
| `stopEditing`   | `VoidCallback`          | Call to exit editing mode programmatically    |

---

#### `NavixExpandable`

Two-state container. Enter expands, back collapses. Only one expandable can be open at a time — opening one closes all others (ancestors on the active path are excluded). While expanded, focus is trapped inside.

```dart
NavixExpandable(
  fKey: 'card',
  builder: (context, isExpanded, focused, directlyFocused, expand, collapse) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(
          color: directlyFocused
              ? const Color(0xFF4fc3f7)
              : Colors.transparent,
        ),
      ),
      child: Column(
        children: [
          const Text('Title'),
          if (isExpanded)
            NavixHorizontalList(
              fKey: 'card-actions',
              child: Row(children: [
                NavixButton(
                  fKey: 'card-play',
                  onClick: () { play(); collapse(); },
                  child: const Text('▶ Play'),
                ),
                NavixButton(
                  fKey: 'card-info',
                  onClick: collapse,
                  child: const Text('ℹ Info'),
                ),
              ]),
            ),
        ],
      ),
    );
  },
)
```

The builder receives `expand` and `collapse` callbacks for programmatic control. Mouse enter calls `requestFocus()`; tap calls `expand()`.

---

#### `NavixDropdown`

Single or multi-select dropdown built on `NavixExpandable` + `NavixPaginatedList`. Options are navigated with up/down. Enter selects; back closes.

```dart
NavixDropdown(
  fKey: 'resolution',
  options: const [
    NavixDropdownOption(value: '4k', label: '4K'),
    NavixDropdownOption(value: '1080p', label: '1080p'),
    NavixDropdownOption(value: '720p', label: '720p'),
  ],
  value: resolution,
  onChange: (v) => setState(() => resolution = v),
  maxVisible: 3,
  position: NavixDropdownPosition.bottom,
  slotHeight: 44,
  renderTrigger: (context, label, isExpanded, focused) =>
    Text(label, style: TextStyle(color: focused ? Colors.blue : Colors.white)),
  renderOption: (context, option, selected, focused, index) =>
    Container(
      color: focused ? Colors.blue.shade900 : Colors.transparent,
      child: Row(children: [
        if (selected) const Icon(Icons.check, size: 16),
        Text(option.label),
      ]),
    ),
)
```

| Prop            | Type                           | Default  | Description                                            |
| --------------- | ------------------------------ | -------- | ------------------------------------------------------ |
| `options`       | `List<NavixDropdownOption>`    | —        | Option list                                            |
| `value`         | `List<String>`                 | `[]`     | Selected values                                        |
| `onChange`      | `void Function(List<String>)?` | —        | Called on selection change                             |
| `multiple`      | `bool`                         | `false`  | Allow multiple selections                              |
| `position`      | `NavixDropdownPosition`        | `bottom` | Panel opens above or below trigger                     |
| `maxVisible`    | `int`                          | `3`      | Max visible options before scrolling                   |
| `slotHeight`    | `double`                       | `44`     | Height of each option slot in px                       |
| `panelWidth`    | `double?`                      | —        | Fixed panel width; defaults to trigger width           |
| `minPanelWidth` | `double`                       | `160`    | Minimum panel width                                    |
| `renderTrigger` | `NavixDropdownTriggerBuilder`  | —        | `(context, label, isExpanded, focused) → Widget`       |
| `renderOption`  | `NavixDropdownOptionBuilder`   | —        | `(context, option, selected, focused, index) → Widget` |

---

#### `NavixPaginatedList`

Virtualized 1D list with sliding window pagination. Only items within the visible window + buffer are mounted. The window slides when focus reaches the threshold position from either edge.

```dart
NavixPaginatedList<Movie>(
  fKey: 'movies-row',
  orientation: NavixListOrientation.horizontal,
  items: movies,
  visibleCount: 6,
  threshold: 1,
  gap: 12,
  buffer: 2,
  keyForItem: (movie, _) => 'movie-${movie.id}',
  renderItem: (movie, fKey, index) => MovieCard(fKey: fKey, movie: movie),
)
```

> **Important:** the `fKey` argument passed to `renderItem` must be assigned to the `fKey` of the focusable child widget you render (e.g. `NavixButton`, `NavixFocusable`). Assigning a custom key instead breaks focus tracking — a `debugPrint` is emitted in development if the registered child key does not match any key produced by `keyForItem`.

| Prop           | Type                        | Default                  | Description                                                                  |
| -------------- | --------------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `items`        | `List<T>`                   | —                        | Full item array                                                              |
| `orientation`  | `NavixListOrientation`      | `horizontal`             | `horizontal` or `vertical`                                                   |
| `visibleCount` | `int`                       | —                        | Items visible at once (min 3)                                                |
| `threshold`    | `int`                       | —                        | Positions from edge before window slides                                     |
| `gap`          | `double`                    | `0`                      | Gap between slots in logical pixels                                          |
| `buffer`       | `int`                       | `2`                      | Extra items rendered outside the visible window                              |
| `renderItem`   | `(T, fKey, index) → Widget` | —                        | Item builder. The `fKey` argument must be passed to the focusable child      |
| `keyForItem`   | `(T, int) → String?`        | `'${fKey}-$index'`       | Stable, content-based key for each item. Recommended for content that may change |
| `groupKey`     | `String?`                   | —                        | Caches `activeIndex`/`viewOffset` per group. When the value changes, the previous group's selection is saved and the new group's saved selection is restored (or 0/0 if first time) |

The widget uses `LayoutBuilder` — it must have a bounded constraint on the main axis.

---

#### `NavixPaginatedGrid`

Virtualized 2D grid with sliding window pagination. Pagination moves one slice at a time along the main axis.

```dart
NavixPaginatedGrid<Channel>(
  fKey: 'channel-grid',
  orientation: NavixGridOrientation.horizontal,
  items: channels,
  rows: 4,
  columns: 6,
  threshold: 1,
  gap: 8,
  buffer: 1,
  keyForItem: (channel, _) => 'channel-${channel.id}',
  renderItem: (channel, fKey, index) => ChannelCard(fKey: fKey, channel: channel),
)
```

> **Important:** the `fKey` argument passed to `renderItem` must be assigned to the `fKey` of the focusable child widget. Assigning a custom key instead breaks focus tracking — a `debugPrint` is emitted in development if the registered child key does not match any key produced by `keyForItem`.

**Horizontal orientation layout** (column-major):

```
col 0       col 1       col 2
[item 0]   [item 4]   [item 8]
[item 1]   [item 5]   [item 9]
[item 2]   [item 6]   [item 10]
[item 3]   [item 7]   [item 11]
```

Left/right moves between columns (pagination axis). Up/down moves within a column (stops at edges).

**Orientation values:**

- `horizontal` — column-major layout, paginates left/right.
- `vertical` — row-major layout, paginates up/down.
- `autoHorizontal` — behaves like `horizontal` when there are enough items to fill the grid (`items.length >= rows * columns`); otherwise falls back to `vertical` so a partially filled grid lays out as a single row instead of a single column. Useful when item count is unknown at design time but you want the "full grid" case to look like a horizontal pager. Note: if items can grow past the threshold dynamically, the layout will flip and existing items will reflow — prefer plain `horizontal` for lazy-loaded lists.

| Prop          | Type                        | Default                  | Description                                                                                                                                          |
| ------------- | --------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`       | `List<T>`                   | —                        | Full item array                                                                                                                                      |
| `orientation` | `NavixGridOrientation`      | `horizontal`             | `horizontal` (column-major), `vertical` (row-major), `autoHorizontal`                                                                                |
| `rows`        | `int`                       | —                        | Number of rows (min 3)                                                                                                                               |
| `columns`     | `int`                       | —                        | Number of columns (min 3)                                                                                                                            |
| `threshold`   | `int`                       | —                        | Slices from edge before window slides                                                                                                                |
| `gap`         | `double`                    | `0`                      | Gap between slots in logical pixels                                                                                                                  |
| `buffer`      | `int`                       | `1`                      | Extra slices rendered outside the visible window                                                                                                     |
| `renderItem`  | `(T, fKey, index) → Widget` | —                        | Item builder. The `fKey` argument must be passed to the focusable child                                                                              |
| `keyForItem`  | `(T, int) → String?`        | `'${fKey}-$index'`       | Stable, content-based key for each item. Recommended when the items list can change                                                                  |
| `groupKey`    | `String?`                   | —                        | Caches `activeIndex`/`viewOffset` per group. When the value changes, the previous group's selection is saved and the new group's selection restored |

---

#### `NavixMultiLayer`

Full-screen video player shell with directional panels. Each direction (`left`, `right`, `up`, `down`) optionally renders a panel — only one is open at a time. Focus is trapped inside the active panel; `back` closes it and returns focus to the base layer.

Channel switching (`program_up` / `program_down`) calls `onNext` / `onPrev`. If the callback returns `true` (channel actually changed), `zapBanner` is shown for 2 seconds.

```dart
NavixMultiLayer(
  fKey: 'player',
  onExitRequest: () => setState(() => playerOpen = false),
  onNext: () {
    final next = getNextChannel();
    if (next == null) return false;
    setState(() => current = next);
    return true;
  },
  onPrev: () {
    final prev = getPrevChannel();
    if (prev == null) return false;
    setState(() => current = prev);
    return true;
  },
  baseLayer: () => VideoWidget(src: current.url),
  zapBanner: () => ZapBannerWidget(channel: current),
  notification: () => paused ? const PauseOverlay() : null,
  left: (props) => AudioSubtitlesPanel(props: props),
  right: (props) => ChannelListPanel(props: props, channels: channels),
  up: (props) => NotificationsPanel(props: props),
  down: (props) => ControlsPanel(props: props, paused: paused),
  panelTimeout: 4000,
  transitionDuration: 250,
)
```

Panel builder functions receive `NavixMultiLayerPanelProps`:

```dart
class NavixMultiLayerPanelProps {
  final String fKey;
  final VoidCallback close;
  final NavixPanelState panelState; // opening | open | closing
  // + onFocus, onBlurred, onRegister, onUnregister, onEvent
}
```

Use `panelState` to drive entry/exit animations:

```dart
left: (props) => AnimatedSlide(
  offset: props.panelState == NavixPanelState.open
      ? Offset.zero
      : const Offset(-1, 0),
  duration: const Duration(milliseconds: 250),
  child: AudioSubtitlesPanel(props: props),
)
```

| Prop                 | Type                                          | Default | Description                                                |
| -------------------- | --------------------------------------------- | ------- | ---------------------------------------------------------- |
| `baseLayer`          | `Widget Function()`                           | —       | Always-visible base layer                                  |
| `left/right/up/down` | `Widget Function(NavixMultiLayerPanelProps)?` | —       | Optional directional panels                                |
| `onNext` / `onPrev`  | `bool Function()?`                            | —       | Channel switch callbacks; return `true` if channel changed |
| `zapBanner`          | `Widget Function()?`                          | —       | Shown for 2 s after a channel change                       |
| `notification`       | `Widget Function()?`                          | —       | Persistent overlay above base layer                        |
| `onExitRequest`      | `VoidCallback?`                               | —       | Called on `back` when no panel is open                     |
| `panelTimeout`       | `int`                                         | `4000`  | Ms of inactivity before active panel auto-closes           |
| `transitionDuration` | `int`                                         | `250`   | Ms to wait before unmounting a closing panel               |
| `triggerSize`        | `double`                                      | `200`   | Px width/height of the hover trigger zone on each edge     |
| `hoverDelay`         | `int`                                         | `300`   | Ms the pointer must dwell in a trigger zone before opening |

---

## Core Concepts

### Focus tree

Every focusable widget is backed by a `NavixFocusNode`. Nodes form a tree via `register` / `unregister`. Each node tracks its children and which child is currently active via `activeChildId`.

```
NavixScope.root
└─ NavixVerticalList "app"
   ├─ NavixHorizontalList "menu"
   │  ├─ "menu-home"        ← isDirectlyFocused
   │  └─ "menu-settings"
   └─ NavixHorizontalList "row-0"
      ├─ "card-0"
      └─ "card-1"
```

`isFocused` is `true` for every node on the active path from root to leaf.  
`isDirectlyFocused` is `true` only for the deepest active leaf.

### Event routing

Events travel **down then up**:

1. `NavixFocusManager` receives a key event, converts it to a `NavEvent`, and calls `root.handleEvent(event)`.
2. Each node forwards the event to its `activeChild` first.
3. If the child returns `false`, the node calls its own `behavior.onEvent`.
4. If `onEvent` returns `true` (consumed), propagation stops.
5. If `false`, the event bubbles to the parent.

A deeply nested button consumes `enter`, while `left`/`right` fall through to the row, and `up`/`down` fall through further to the page layout.

### Scheduler-safe notifications

`NavixFocusNode._notify()` and `_propagateFocus()` check `SchedulerBinding.instance.schedulerPhase`. If called during a frame (persistent/transient callbacks), notifications are deferred to `addPostFrameCallback` to avoid triggering `setState` mid-build.

### Behaviors

`IFocusNodeBehavior` fields are plain nullable function references — no abstract methods, no `@override` required. Extend the class and assign the fields you need:

```dart
class MyBehavior extends IFocusNodeBehavior {
  MyBehavior(NavixFocusNode node) {
    onEvent = (event) {
      if (event.action == 'enter' && event.type == NavEventType.press) {
        doSomething();
        return true;
      }
      return false;
    };
    onFocus = (node) => print('focused: ${node.key}');
  }
}
```

### Focus trapping

When `IFocusNodeBehavior.isTrapped` returns `true`, `requestFocus()` on any node outside the trap is silently ignored. `NavixExpandable`, `NavixInput`, and `NavixMultiLayer` all use this mechanism.

### Exclusive expand

`NavixExpandable` walks the full tree on expand and collapses all other expandables — **except ancestors on the active path**. This is enforced in the behavior layer, independent of the widget tree structure.

### Pagination decoupled from widget children

`NavixPaginatedListBehavior` and `NavixPaginatedGridBehavior` track `activeIndex` and `viewOffset` independently of `NavixFocusNode.children`. Navigation decisions happen before Flutter re-builds. `onChildRegistered` is used to hand focus to newly mounted children after the next frame.

### Stable virtual keys

`NavixPaginatedList` and `NavixPaginatedGrid` generate item keys via the optional `keyForItem` callback. By default keys are `'${fKey}-$index'` — stable across scroll, so items do not remount when the window slides. For dynamic lists where item identity matters across `items` reference changes (e.g. a movie's id), pass a content-based `keyForItem` so reconciliation and focus tracking remain correct.

The `fKey` argument of `renderItem` must be forwarded to the focusable child widget — it ties the rendered widget back to the key the behavior expects. If the registered child key does not match any key produced by `keyForItem`, a `debugPrint` warning is emitted to surface the wiring bug early.

### Per-group selection cache (`groupKey`)

Both paginated widgets accept an optional `groupKey: String?`. When provided, the widget stores the current `activeIndex` and `viewOffset` under the previous `groupKey` whenever the value changes, then restores the saved selection for the new group (or 0/0 if the group has not been seen before). Focus is automatically retargeted to the restored item. Without `groupKey`, no caching takes place — each `items` change keeps the existing selection clamped to the new bounds.

### Custom input config

Override key mappings via `NavixScope.inputConfig`:

```dart
NavixScope(
  inputConfig: {
    'left':  ActionConfig(keys: [LogicalKeyboardKey.arrowLeft, LogicalKeyboardKey.keyA]),
    'right': ActionConfig(keys: [LogicalKeyboardKey.arrowRight, LogicalKeyboardKey.keyD]),
    'up':    ActionConfig(keys: [LogicalKeyboardKey.arrowUp, LogicalKeyboardKey.keyW]),
    'down':  ActionConfig(keys: [LogicalKeyboardKey.arrowDown, LogicalKeyboardKey.keyS]),
    'enter': ActionConfig(
      keys: [LogicalKeyboardKey.enter, LogicalKeyboardKey.space],
      longPress: true,
      longPressMs: 600,
    ),
    'back':  ActionConfig(keys: [LogicalKeyboardKey.escape]),
  },
  child: MyApp(),
)
```

---

## Getting Started

Add the package to your `pubspec.yaml`:

```yaml
dependencies:
  navix:
    path: ../flutter # or pub.dev reference once published
```

### 1. NavixScope

Wrap your entire app. Creates the focus tree, attaches keyboard listeners, and provides the root node to the widget tree. All Navix widgets must be inside a `NavixScope`.

```dart
import 'package:navix/navix.dart';

void main() {
  runApp(
    NavixScope(
      child: MyApp(),
    ),
  );
}
```

### 2. Build your navigation tree

```dart
NavixVerticalList(
  fKey: 'page',
  child: Column(
    children: [
      NavixHorizontalList(
        fKey: 'top-row',
        child: Row(
          children: [
            NavixButton(
              fKey: 'play',
              onClick: () => print('Play'),
              builder: (context, focused) => PlayButton(focused: focused),
            ),
            NavixButton(
              fKey: 'info',
              onClick: () => print('Info'),
              builder: (context, focused) => InfoButton(focused: focused),
            ),
          ],
        ),
      ),
      NavixPaginatedList<Movie>(
        fKey: 'movies',
        items: movies,
        visibleCount: 5,
        threshold: 1,
        gap: 8,
        renderItem: (movie, fKey, index) => MovieCard(fKey: fKey, movie: movie),
      ),
    ],
  ),
)
```

### 3. Custom focusable with NavixFocusable

For widgets that need direct access to focus state without using a built-in widget:

```dart
NavixFocusable(
  fKey: 'menu-item',
  callbacks: NavixFocusableCallbacks(
    onFocus: (key) => onFocus?.call(key),
  ),
  createBehavior: (node) {
    final b = DefaultNavixBehavior();
    b.onEvent = (event) {
      if (event.action == 'enter' && event.type == NavEventType.press) {
        onPress?.call();
        return true;
      }
      return false;
    };
    return b;
  },
  builder: (context, node, focused, directlyFocused) {
    return MouseRegion(
      onEnter: (_) => node.requestFocus(),
      child: Text(
        label,
        style: TextStyle(
          color: directlyFocused ? Colors.white : Colors.white54,
        ),
      ),
    );
  },
)
```

### 4. Lifecycle callbacks

Every widget accepts `onFocus`, `onBlurred`, `onRegister`, `onUnregister`. All receive the `fKey` of the widget that fired the event:

```dart
NavixButton(
  fKey: 'play',
  onRegister: (key) => print('$key mounted'),
  onFocus: (key) => print('$key focused'),
  onBlurred: (key) => print('$key blurred'),
  onUnregister: (key) => print('$key unmounted'),
  onClick: play,
  child: const Text('▶ Play'),
)
```

---

## Running the Demo

```bash
cd packages/demo-flutter
flutter pub get
flutter run
```

Navigate with arrow keys. `Enter` to select. `Escape` to go back.

| Screen  | Components                                                         | Description                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home    | `NavixPaginatedList` + `NavixMultiLayer`                           | Three paginated rows — movies, series, live channels. Selecting an item opens a `NavixMultiLayer` player with left (audio/subtitles), right (channel list), up (notifications), and down (controls) panels. |
| Movie   | `NavixPaginatedGrid`                                               | Movies in a paginated 4×6 grid.                                                                                                                                                                             |
| Series  | `NavixHorizontalList`                                              | Classic horizontal shelves.                                                                                                                                                                                 |
| Live    | `NavixGrid`                                                        | Fixed grid of live channels.                                                                                                                                                                                |
| Options | `NavixExpandable` + `NavixDropdown` + `NavixSwitch` + `NavixInput` | Settings modal with dropdowns, a boolean toggle, and a text input — all keyboard navigable.                                                                                                                 |

---

## Key Design Decisions

**ID-based focus tracking** — `activeChildId` stores the node's `id` string, not an array index. Reordering, inserting, or removing children does not corrupt focus state.

**Bottom-up event return** — Returning `true` from `onEvent` consumes the event. Returning `false` lets it bubble. Widgets handle what they know about and ignore the rest.

**Behaviors are plain objects** — `IFocusNodeBehavior` uses nullable function fields instead of abstract methods. No `@override` boilerplate — assign only what you need.

**Scheduler-safe state updates** — All focus propagation defers to `addPostFrameCallback` when called during a frame, so `setState` is never called mid-build.

**Exclusive expand in the behavior layer** — `NavixExpandable` walks the tree on expand to close all other expandables. Ancestors on the active path are skipped. This is a behavior-layer concern — independent of the widget tree.

**Pagination decoupled from widget children** — Behavior tracks `activeIndex` and `viewOffset` independently of the registered child nodes. Navigation decisions happen before Flutter rebuilds. `onChildRegistered` hands focus to newly mounted children after the frame.

**Stable virtual keys** — Item keys come from an optional `keyForItem` callback (default: `'${fKey}-$index'`). Keys are stable across scroll, and a content-based `keyForItem` keeps focus and reconciliation stable across `items` changes. The `fKey` passed to `renderItem` must be forwarded to the focusable child.

**Per-group selection cache** — Paginated widgets accept an optional `groupKey`. When it changes, the previous group's `activeIndex`/`viewOffset` is saved and the new group's saved selection is restored, with focus automatically retargeted.

---

## Roadmap

- [x] `NavixFocusNode.requestFocus()` — programmatic focus from anywhere in the tree
- [x] `onFocus` / `onBlurred` lifecycle callbacks on all widgets
- [x] `onRegister` / `onUnregister` lifecycle callbacks on all widgets
- [x] `NavixSwitch` — controlled boolean toggle
- [x] `NavixInput` — two-state text input with idle/editing modes
- [x] `NavixMultiLayer` — full-screen video player shell with directional panels, zap banner, and notification overlay
- [ ] Scroll-into-view integration
- [ ] Test suite

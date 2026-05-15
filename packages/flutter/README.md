# navix (Flutter)

A spatial navigation library for Flutter TV platforms (Android TV, Fire TV, Apple TV, desktop).

Flutter's default directional navigation relies heavily on the geometric position of widgets on screen, which can lead to unpredictable focus transitions in complex layouts. Navix closes this gap with a hierarchical model. You group your elements inside Horizontal/Vertical lists to define the structure. Decorative widgets and focusable elements can coexist freely within the same list — Navix only manages registered focusable nodes and ignores the rest. Built-in virtualized widgets can also be placed inside these lists. Focus is managed automatically across widgets in exactly the structure you defined, using the keys you assign.

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
│  NavixScroll      NavixStepper          │
│  NavixMultiLayer                        │
└─────────────────────────────────────────┘
```

**Core owns all logic.** It has no dependency on any Flutter widget — it manages the focus tree, event routing, and behavior lifecycle. The widget layer is a thin `StatefulWidget` + `InheritedWidget` adapter on top.

---

## API Reference

### Core

#### `NavixFocusNode`

One node in the focus tree. Every focusable widget is backed by a node.

| Member                     | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `key`                      | String identifier provided by the widget                                |
| `id`                       | Unique auto-generated ID (`fn_N`) used internally                       |
| `isFocused`                | `true` for every node on the active path from root to leaf              |
| `isDirectlyFocused`        | `true` only for the deepest active leaf                                 |
| `activeChildId`            | `id` of the currently active child node                                 |
| `register(child)`          | Adds a child node; auto-focuses if first child                          |
| `unregister(child)`        | Removes a child node; focus falls back to adjacent sibling              |
| `reorderChildren(ordered)` | Reorders existing children without firing register/unregister callbacks |
| `handleEvent(event)`       | Routes event down to active child, then up via behavior                 |
| `focusNext()`              | Moves active child to the next sibling                                  |
| `focusPrev()`              | Moves active child to the previous sibling                              |
| `focusChild(id)`           | Focuses a specific child by its `id`                                    |
| `getActiveChild()`         | Returns the currently active child node                                 |
| `getActivePath()`          | Returns the list of nodes from root to the active leaf                  |
| `requestFocus()`           | Programmatically focuses this node from anywhere in the tree            |
| `subscribe(fn)`            | Registers a change listener; returns an unsubscribe callback            |
| `destroy()`                | Detaches from parent and disposes all children                          |

#### `IFocusNodeBehavior`

Interface all behaviors implement. Override the fields you need:

```dart
abstract class IFocusNodeBehavior {
  void Function()? onRegister;
  void Function()? onUnregister;
  void Function()? collapse;
  void Function()? expand;
  bool get isTrapped => false;
  bool canReceiveFocus() => true;
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
| `enter`        | `Enter`, `Select` (longPress after 500 ms) |
| `back`         | `Escape`, `GoBack`, `Backspace`            |
| `play`         | `MediaPlay`                                |
| `pause`        | `MediaPause`                               |
| `play_pause`   | `MediaPlayPause`, `Space`                  |
| `program_up`   | `ChannelUp`, `PageUp`                      |
| `program_down` | `ChannelDown`, `PageDown`                  |

---

### Widgets

#### `NavixFocusable`

The primitive widget all higher-level widgets are built on. Creates a `NavixFocusNode`, registers it with the nearest parent (`NavixFocusable` or `NavixScope`), and exposes focus state to its builder.

```dart
NavixFocusable(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'my-item',

  /*
    Factory called once at mount to create the behavior for this node.
    Omit to use the default no-op behavior.
    type: IFocusNodeBehavior Function(NavixFocusNode node)?
  */
  createBehavior: (node) => MyBehavior(node),

  /*
    Lifecycle and event callbacks. All receive the fKey of the widget.
    onFocus / onBlurred fire when isDirectlyFocused changes.
    onRegister / onUnregister fire when the node enters/leaves the tree.
    onEvent: return true to consume the event, false to let it bubble.
    type: NavixFocusableCallbacks?
  */
  callbacks: NavixFocusableCallbacks(
    onFocus: (key) => print('$key focused'),
    onBlurred: (key) => print('$key blurred'),
    onRegister: (key) => print('$key mounted'),
    onUnregister: (key) => print('$key unmounted'),
    onEvent: (event) => false,
  ),

  /*
    Required. Builds the widget subtree.
    focused: true for every node on the active path to the leaf.
    directlyFocused: true only for the deepest active leaf.
    type: Widget Function(context, NavixFocusNode node, bool focused, bool directlyFocused)
  */
  builder: (context, node, focused, directlyFocused) {
    return Container(
      color: directlyFocused ? Colors.blue : Colors.grey,
      child: const Text('Item'),
    );
  },
)
```

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
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'page',

  /*
    Required. The widget subtree containing the focusable children.
    Rendered as-is — no wrapper is injected.
    type: Widget
  */
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

  // disabled, onFocus, onBlurred, onRegister, onUnregister also accepted
)
```

---

#### `NavixGrid`

Fixed 2D grid. Navigates in all four directions, stopping at row edges on left/right.

```dart
NavixGrid(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'channel-grid',

  /*
    Required. Number of columns. Synced on every rebuild — can be changed dynamically.
    type: int
  */
  columns: 5,

  /*
    Required. The widget subtree containing the focusable children.
    type: Widget
  */
  child: Wrap(
    children: channels.map((ch) =>
      NavixButton(
        fKey: ch.id,
        onClick: () => tune(ch),
        builder: (context, focused) => ChannelCard(channel: ch, focused: focused),
      ),
    ).toList(),
  ),

  // disabled, onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

---

#### `NavixButton`

Leaf focusable. Fires `onClick` on keyboard enter and on tap. Supports `onLongPress` and `onDoublePress` for keyboard-only gestures. Mouse hover calls `requestFocus()`. All callbacks are synced on every rebuild.

Provide either a `builder` or a `child`:

```dart
NavixButton(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'play',

  /*
    Called on Enter key press and on tap.
    type: VoidCallback?
  */
  onClick: play,

  /*
    Called on Enter long-press (requires longPress: true in ActionConfig).
    type: VoidCallback?
  */
  onLongPress: null,

  /*
    Called on Enter double-press (requires doublePress: true in ActionConfig).
    type: VoidCallback?
  */
  onDoublePress: null,

  /*
    Builder for full control over focused state. Provide this or child, not both.
    type: Widget Function(BuildContext context, bool focused)?
  */
  builder: (context, focused) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    decoration: BoxDecoration(
      color: focused ? Colors.blue : Colors.grey.shade800,
      borderRadius: BorderRadius.circular(4),
    ),
    child: const Text('▶ Play'),
  ),

  // child: const Text('▶ Play'),  // alternative to builder
  // disabled, onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

---

#### `NavixSwitch`

Controlled boolean toggle built on `NavixButton`. Enter or tap flips `checked` and calls `onChange`.

```dart
NavixSwitch(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'notifications',

  /*
    Required. Current checked state.
    type: bool
  */
  checked: enabled,

  /*
    Required. Called with the new value when toggled.
    type: void Function(bool checked)
  */
  onChange: (value) => setState(() => enabled = value),

  /*
    Required. Builds the widget. checked reflects current state.
    type: Widget Function(BuildContext context, bool checked, bool focused)
  */
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

  // disabled, onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

---

#### `NavixInput`

Two-state text input. **Idle**: navigable like any other widget. **Editing**: focus is trapped, nav events are swallowed, and the native `TextField` receives keyboard input. Enter starts editing; Enter or back stops editing.

`NavixInput` requires a `builder` — you own the `TextField`:

```dart
NavixInput(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'search',

  /*
    Required. Controlled value. Synced to the controller when not editing.
    type: String
  */
  value: query,

  /*
    Required. Called on every keystroke while editing.
    type: void Function(String value)
  */
  onChange: (v) => setState(() => query = v),

  /*
    Required. Builds the input widget.
    focused:       this node is on the active focus path.
    editing:       currently in editing mode (keyboard trapped).
    controller:    synced with value; pass directly to TextField.
    textFocusNode: Flutter's own FocusNode; pass directly to TextField.
    stopEditing:   call to exit editing mode programmatically.
    type: Widget Function(context, bool focused, bool editing,
                          TextEditingController controller,
                          FocusNode textFocusNode,
                          VoidCallback stopEditing)
  */
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

  // disabled, onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

---

#### `NavixExpandable`

Two-state container. Enter expands, back collapses. Only one expandable can be open at a time — opening one closes all others (ancestors on the active path are excluded). While expanded, focus is trapped inside.

```dart
NavixExpandable(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'card',

  /*
    Required. Builds the widget.
    isExpanded:      whether this expandable is currently open.
    focused:         true for every node on the active path.
    directlyFocused: true only when this node is the active leaf.
    expand:          programmatically open this expandable.
    collapse:        programmatically close this expandable.
    type: Widget Function(context, bool isExpanded, bool focused,
                          bool directlyFocused,
                          VoidCallback expand, VoidCallback collapse)
  */
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

  // disabled, onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

Mouse enter calls `requestFocus()`; tap calls `expand()`.

---

#### `NavixDropdown`

Single or multi-select dropdown built on `NavixExpandable` + `NavixPaginatedList`. Options are navigated with up/down. Enter selects; back closes.

```dart
NavixDropdown(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'resolution',

  /*
    Required. The full list of options.
    type: List<NavixDropdownOption>
  */
  options: const [
    NavixDropdownOption(value: '4k', label: '4K'),
    NavixDropdownOption(value: '1080p', label: '1080p'),
    NavixDropdownOption(value: '720p', label: '720p'),
  ],

  /*
    Currently selected values.
    Default: []
    type: List<String>
  */
  value: resolution,

  /*
    Called when selection changes.
    type: void Function(List<String>)?
  */
  onChange: (v) => setState(() => resolution = v),

  /*
    Allow selecting multiple options. Default: false.
    type: bool
  */
  multiple: false,

  /*
    Panel opens above or below the trigger. Default: bottom.
    type: NavixDropdownPosition
  */
  position: NavixDropdownPosition.bottom,

  /*
    Max visible options before scrolling. Default: 3.
    type: int
  */
  maxVisible: 3,

  /*
    Height of each option slot in px. Default: 44.
    type: double
  */
  slotHeight: 44,

  /*
    Fixed panel width. Defaults to trigger width (min: minPanelWidth).
    type: double?
  */
  panelWidth: null,

  /*
    Minimum panel width. Default: 160.
    type: double
  */
  minPanelWidth: 160,

  /*
    Required. Builds the trigger widget.
    label:      current display text (selected label or placeholder).
    isExpanded: whether the panel is open.
    focused:    this node is on the active focus path.
    type: Widget Function(context, String label, bool isExpanded, bool focused)
  */
  renderTrigger: (context, label, isExpanded, focused) =>
    Text(label, style: TextStyle(color: focused ? Colors.blue : Colors.white)),

  /*
    Required. Builds each option row.
    option:   the NavixDropdownOption for this row.
    selected: whether this option is in the current value list.
    focused:  this option row is directly focused.
    index:    position in the options list.
    type: Widget Function(context, NavixDropdownOption option,
                          bool selected, bool focused, int index)
  */
  renderOption: (context, option, selected, focused, index) =>
    Container(
      color: focused ? Colors.blue.shade900 : Colors.transparent,
      child: Row(children: [
        if (selected) const Icon(Icons.check, size: 16),
        Text(option.label),
      ]),
    ),

  // disabled, onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

---

#### `NavixPaginatedList`

Virtualized 1D list with sliding window pagination. Only items within the visible window + buffer are mounted. The window slides when focus reaches the threshold position from either edge.

```dart
NavixPaginatedList<Movie>(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'movies-row',

  /*
    Required. Full item array.
    type: List<T>
  */
  items: movies,

  /*
    Scroll axis. Default: horizontal.
    type: NavixListOrientation
  */
  orientation: NavixListOrientation.horizontal,

  /*
    Required. Items visible at once (min 3).
    type: int
  */
  visibleCount: 6,

  /*
    Required. Positions from edge before the window slides.
    type: int
  */
  threshold: 1,

  /*
    Gap between slots in logical pixels. Default: 0.
    type: double
  */
  gap: 12,

  /*
    Extra items rendered outside the visible window. Default: 2.
    type: int
  */
  buffer: 2,

  /*
    Stable content-based key per item. Default: '${fKey}-$index'.
    Recommended when item identity matters across items list changes.
    type: String Function(T item, int index)?
  */
  keyForItem: (movie, _) => 'movie-${movie.id}',

  /*
    Required. Item builder.
    Note: the fKey argument must be forwarded to the focusable child widget —
    it ties the rendered widget back to the key the behavior expects.
    disabled: true when isItemDisabled returns true for this index.
    type: Widget Function(T item, String fKey, int index, bool disabled)
  */
  renderItem: (movie, fKey, index, disabled) => MovieCard(fKey: fKey, movie: movie, disabled: disabled),

  /*
    Returns true if the item at the given index should be skipped during
    keyboard navigation. Disabled items are still rendered and receive the
    disabled flag via renderItem.
    type: bool Function(int index)?
  */
  isItemDisabled: null,

  /*
    Jump to the item with this key on mount and whenever the value
    changes. If the target item is disabled the nearest non-disabled
    neighbour is focused. Write-only intent prop — user arrow-key
    navigation is unaffected.
    type: String?
  */
  activeKey: null,

  /*
    Prevents this entire list from receiving focus.
    Default: false.
    type: bool
  */
  disabled: false,

  /*
    Caches activeIndex/viewOffset per group key. When the value changes,
    the previous group's selection is saved and the new group's saved
    selection is restored (or 0/0 if first time).
    type: String?
  */
  groupKey: null,

  /*
    Mounts a NavixScroll as a focusable child below the list (or to its
    side for vertical orientation). Arrowing into the scrollbar transfers
    focus to it; arrowing back returns focus to the previously active
    item. Default: false.
    type: bool
  */
  showScrollbar: false,

  /*
    Override the default scrollbar visual. Receives ScrollbarRenderProps
    (scrollMode/page/pageCount/orientation/onPageChange). Setting this
    also enables the scrollbar implicitly.
    type: Widget Function(ScrollbarRenderProps)?
  */
  renderScrollbar: null,

  // onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

> **Important:** the `fKey` argument passed to `renderItem` must be assigned to the `fKey` of the focusable child widget you render (e.g. `NavixButton`, `NavixFocusable`). Assigning a custom key instead breaks focus tracking — a `debugPrint` is emitted in development if the registered child key does not match any key produced by `keyForItem`.

The widget uses `LayoutBuilder` — it must have a bounded constraint on the main axis.

---

#### `NavixPaginatedGrid`

Virtualized 2D grid with sliding window pagination. Pagination moves one slice at a time along the main axis.

```dart
NavixPaginatedGrid<Channel>(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'channel-grid',

  /*
    Required. Full item array.
    type: List<T>
  */
  items: channels,

  /*
    Layout and pagination axis. Default: horizontal.
    horizontal:    column-major, paginates left/right.
    vertical:      row-major, paginates up/down.
    autoHorizontal: behaves like horizontal when items.length >= rows * columns,
                   otherwise falls back to vertical. Useful when item count is
                   unknown at design time. Avoid for lazy-loaded lists — the layout
                   will flip and items will reflow if count crosses the threshold.
    type: NavixGridOrientation
  */
  orientation: NavixGridOrientation.horizontal,

  /*
    Required. Number of rows (min 3).
    type: int
  */
  rows: 4,

  /*
    Required. Number of columns (min 3).
    type: int
  */
  columns: 6,

  /*
    Required. Slices from edge before the window slides.
    type: int
  */
  threshold: 1,

  /*
    Gap between slots in logical pixels. Default: 0.
    type: double
  */
  gap: 8,

  /*
    Extra slices rendered outside the visible window. Default: 1.
    type: int
  */
  buffer: 1,

  /*
    Stable content-based key per item. Default: '${fKey}-$index'.
    type: String Function(T item, int index)?
  */
  keyForItem: (channel, _) => 'channel-${channel.id}',

  /*
    Required. Item builder.
    Note: the fKey argument must be forwarded to the focusable child widget.
    disabled: true when isItemDisabled returns true for this index.
    type: Widget Function(T item, String fKey, int index, bool disabled)
  */
  renderItem: (channel, fKey, index, disabled) => ChannelCard(fKey: fKey, channel: channel, disabled: disabled),

  /*
    Returns true if the item at the given index should be skipped during
    keyboard navigation. Disabled items are still rendered and receive the
    disabled flag via renderItem.
    type: bool Function(int index)?
  */
  isItemDisabled: null,

  /*
    Jump to the item with this key on mount and whenever the value
    changes. If the target item is disabled the nearest non-disabled
    neighbour is focused. Write-only intent prop — user arrow-key
    navigation is unaffected.
    type: String?
  */
  activeKey: null,

  /*
    Prevents this entire grid from receiving focus.
    Default: false.
    type: bool
  */
  disabled: false,

  /*
    Caches activeIndex/viewOffset per group key.
    type: String?
  */
  groupKey: null,

  /*
    Mounts a NavixScroll as a focusable child along the pagination axis.
    Arrowing into it transfers focus; arrowing out returns focus to the
    previously active item. Default: false.
    type: bool
  */
  showScrollbar: false,

  /*
    Override the default scrollbar visual. Receives ScrollbarRenderProps.
    Setting this also enables the scrollbar implicitly.
    type: Widget Function(ScrollbarRenderProps)?
  */
  scrollbarBuilder: null,

  // onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
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

---

#### `NavixScroll`

Focusable scrollbar. Used internally by `NavixPaginatedList` / `NavixPaginatedGrid` to expose page navigation as a real focus target — the arrow opposite to the list's main axis transfers focus from the active item to the scrollbar; the reverse direction returns focus to the previously active item. Can also be used on its own as the scrollbar of any virtualized layout.

```dart
NavixScroll(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'my-scrollbar',

  /*
    Required. Scroll axis. Arrow keys along this axis move the page;
    PageUp/PageDown also move by pageStep regardless of orientation.
    type: NavixScrollOrientation
  */
  orientation: NavixScrollOrientation.horizontal,

  /*
    Required. Total number of pages. Driving widgets typically pass
    behavior.maxOffset + 1.
    type: int
  */
  pageCount: pages.length,

  /*
    Controlled page index (0..pageCount-1). Omit for uncontrolled mode.
    type: int?
  */
  page: page,

  /*
    Initial page in uncontrolled mode. Default: 0.
    type: int?
  */
  defaultPage: 0,

  /*
    Pages moved per arrow press. Default: 1. Paginated list/grid pass
    visibleCount so one arrow press jumps a full page.
    type: int
  */
  arrowStep: 1,

  /*
    Pages moved per PageUp/PageDown press. Default: 1.
    type: int
  */
  pageStep: 5,

  /*
    Called with the new page index when it changes.
    type: void Function(int page)?
  */
  onPageChange: (p) => setState(() => page = p),

  /*
    Override the default visual. Receives ScrollbarRenderProps
    (scrollMode/page/pageCount/orientation/onPageChange).
    type: Widget Function(ScrollbarRenderProps)?
  */
  renderScrollbar: null,

  // disabled, onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

---

#### `NavixStepper`

Focusable single-value stepper. Arrow keys along `orientation` call `onChange(value)` with the clamped result. Built-in `render` modes draw a scrollbar or a progress fill; pass a `builder` for full visual control.

```dart
NavixStepper(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'volume',

  /*
    Required. Step axis.
    type: NavixStepperOrientation
  */
  orientation: NavixStepperOrientation.horizontal,

  /*
    Controlled value. Omit for uncontrolled mode.
    type: double?
  */
  value: volume,

  /*
    Initial value in uncontrolled mode. Defaults to min.
    type: double?
  */
  defaultValue: 0,

  /*
    Range and step size.
    type: double
  */
  min: 0,
  max: 100,
  step: 2,

  /*
    Called with the new value when it changes.
    type: void Function(double value)?
  */
  onChange: (v) => setState(() => volume = v),

  /*
    Allow long-press / double-press events to fire onChange.
    Defaults: false / false.
    type: bool
  */
  long: false,
  double_: false,

  /*
    Built-in visual mode. Ignored when builder is provided.
    Default: scrollbar.
    type: NavixStepperRender?
  */
  render: NavixStepperRender.scrollbar,

  /*
    Custom builder for full visual control.
    type: Widget Function(context, bool focused, StepperStatus status,
                          double value, double min, double max, double step)?
  */
  builder: null,

  // disabled, onFocus, onBlurred, onRegister, onUnregister, onEvent also accepted
)
```

---

#### `NavixMultiLayer`

Full-screen video player shell with directional panels. Each direction (`left`, `right`, `up`, `down`) optionally renders a panel — only one is open at a time. Focus is trapped inside the active panel; `back` closes it and returns focus to the base layer.

Channel switching (`program_up` / `program_down`) calls `onNext` / `onPrev`. If the callback returns `true` (channel actually changed), `zapBanner` is shown for 2 seconds.

```dart
NavixMultiLayer(
  /*
    Required. Identifies this node in the tree.
    type: String
  */
  fKey: 'player',

  /*
    Required. Always-visible base layer.
    type: Widget Function()
  */
  baseLayer: () => VideoWidget(src: current.url),

  /*
    Optional directional panels. Each receives NavixMultiLayerPanelProps.
    type: Widget Function(NavixMultiLayerPanelProps)?
  */
  left:  (props) => AudioSubtitlesPanel(props: props),
  right: (props) => ChannelListPanel(props: props, channels: channels),
  up:    (props) => NotificationsPanel(props: props),
  down:  (props) => ControlsPanel(props: props, paused: paused),

  /*
    Channel switch callbacks. Return true if the channel actually changed
    (triggers the zap banner). Return false to do nothing.
    type: bool Function()?
  */
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

  /*
    Shown for 2 s after a successful channel change.
    type: Widget Function()?
  */
  zapBanner: () => ZapBannerWidget(channel: current),

  /*
    Persistent overlay above base layer. Return null to hide.
    type: Widget Function()?
  */
  notification: () => paused ? const PauseOverlay() : null,

  /*
    Called on back when no panel is open.
    type: VoidCallback?
  */
  onExitRequest: () => setState(() => playerOpen = false),

  /*
    Ms of inactivity before active panel auto-closes. Default: 4000.
    type: int
  */
  panelTimeout: 4000,

  /*
    Ms to wait before unmounting a closing panel (use for exit animations). Default: 250.
    type: int
  */
  transitionDuration: 250,

  /*
    Px width/height of the hover trigger zone on each edge. Default: 200.
    type: double
  */
  triggerSize: 200,

  /*
    Ms the pointer must dwell in a trigger zone before the panel opens. Default: 300.
    type: int
  */
  hoverDelay: 300,
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
        renderItem: (movie, fKey, index, disabled) => MovieCard(fKey: fKey, movie: movie),
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
- [x] `NavixStepper` — single-value stepper with scrollbar / progress / custom render
- [x] `NavixScroll` — focusable scrollbar embedded as a child of paginated list/grid
- [ ] Scroll-into-view integration
- [ ] Test suite

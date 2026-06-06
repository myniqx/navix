import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'nav_event.dart';
import 'focus_node.dart';

/// Configuration for a single logical navigation action (e.g. `'enter'`,
/// `'left'`).
///
/// Pass a map of [ActionConfig] values to [NavixScope.inputConfig] to
/// override the default key bindings.
///
/// ```dart
/// NavixScope(
///   inputConfig: {
///     'enter': ActionConfig(
///       keys: [LogicalKeyboardKey.enter],
///       longPress: true,
///       longPressMs: 600,
///     ),
///   },
///   child: MyApp(),
/// )
/// ```
class ActionConfig {
  /// The physical keys that trigger this action.
  final List<LogicalKeyboardKey> keys;

  /// Whether a long-press variant of this action is enabled.
  ///
  /// When `true`, holding the key for at least [longPressMs] milliseconds
  /// emits a [NavEventType.longPress] event instead of a normal press.
  final bool longPress;

  /// Duration in milliseconds before a long-press fires. Default: `500`.
  final int longPressMs;

  /// Whether a double-press variant of this action is enabled.
  ///
  /// When `true`, two presses within [doublePressMs] milliseconds emit a
  /// [NavEventType.doublePress] event.
  final bool doublePress;

  /// Window in milliseconds for detecting a double-press. Default: `300`.
  final int doublePressMs;

  /// Creates an [ActionConfig].
  const ActionConfig({
    required this.keys,
    this.longPress = false,
    this.longPressMs = 500,
    this.doublePress = false,
    this.doublePressMs = 300,
  });
}

/// A map from action name to its [ActionConfig].
///
/// Pass to [NavixScope.inputConfig] to replace the [defaultInputConfig].
typedef InputConfig = Map<String, ActionConfig>;

/// The built-in key mappings used when no [NavixScope.inputConfig] is
/// provided.
///
/// | Action         | Keys                                          |
/// |----------------|-----------------------------------------------|
/// | `left`         | ArrowLeft                                     |
/// | `right`        | ArrowRight                                    |
/// | `up`           | ArrowUp                                       |
/// | `down`         | ArrowDown                                     |
/// | `enter`        | Enter, Select (long-press after 500 ms)       |
/// | `back`         | Escape, GoBack, Backspace                     |
/// | `play`         | MediaPlay                                     |
/// | `pause`        | MediaPause                                    |
/// | `play_pause`   | MediaPlayPause, Space                         |
/// | `program_up`   | ChannelUp, PageUp                             |
/// | `program_down` | ChannelDown, PageDown                         |
final InputConfig defaultInputConfig = {
  'left': ActionConfig(keys: [LogicalKeyboardKey.arrowLeft]),
  'right': ActionConfig(keys: [LogicalKeyboardKey.arrowRight]),
  'up': ActionConfig(keys: [LogicalKeyboardKey.arrowUp]),
  'down': ActionConfig(keys: [LogicalKeyboardKey.arrowDown]),
  'enter': ActionConfig(
    keys: [LogicalKeyboardKey.enter, LogicalKeyboardKey.select],
    longPress: true,
    longPressMs: 500,
  ),
  'back': ActionConfig(
    keys: [
      LogicalKeyboardKey.escape,
      LogicalKeyboardKey.goBack,
      LogicalKeyboardKey.backspace
    ],
  ),
  'play': ActionConfig(keys: [LogicalKeyboardKey.mediaPlay]),
  'pause': ActionConfig(keys: [LogicalKeyboardKey.mediaPause]),
  'play_pause': ActionConfig(
    keys: [LogicalKeyboardKey.mediaPlayPause, LogicalKeyboardKey.space],
  ),
  'program_up': ActionConfig(
      keys: [LogicalKeyboardKey.channelUp, LogicalKeyboardKey.pageUp]),
  'program_down': ActionConfig(
      keys: [LogicalKeyboardKey.channelDown, LogicalKeyboardKey.pageDown]),
};

class _KeyState {
  final String action;
  final ActionConfig config;
  Timer? longPressTimer;
  bool longPressFired = false;
  bool repeatFired = false;
  int lastPressTime = 0;
  Timer? doublePressTimer;

  _KeyState({required this.action, required this.config});
}

/// Wires the [NavixFocusNode] root to [HardwareKeyboard].
///
/// Translates raw key events into [NavEvent] objects — applying long-press and
/// double-press timers — and dispatches them to the root node. Normally you
/// do not create this directly; [NavixScope] manages it for you.
class NavixFocusManager {
  /// The root [NavixFocusNode] of the focus tree.
  late final NavixFocusNode root;
  late final InputConfig _config;

  final Map<int, String> _keyToAction = {};
  final Map<String, _KeyState> _keyStates = {};

  bool _isAttached = false;

  NavixFocusManager({InputConfig? inputConfig}) {
    root = NavixFocusNode('root');
    _config = inputConfig ?? defaultInputConfig;
    _buildKeyMap();
  }

  void _buildKeyMap() {
    for (final entry in _config.entries) {
      for (final key in entry.value.keys) {
        _keyToAction[key.keyId] = entry.key;
      }
    }
  }

  /// Registers the keyboard handler. Call once at startup (done automatically
  /// by [NavixScope]).
  void attach() {
    if (_isAttached) return;
    _isAttached = true;
    HardwareKeyboard.instance.addHandler(_handleKeyEvent);
  }

  /// Unregisters the keyboard handler and disposes all focus tree state.
  /// Called automatically by [NavixScope] on dispose.
  void detach() {
    if (!_isAttached) return;
    _isAttached = false;
    HardwareKeyboard.instance.removeHandler(_handleKeyEvent);
    _destroy();
  }

  bool _handleKeyEvent(KeyEvent event) {
    final keyId = event.logicalKey.keyId;
    final action = _keyToAction[keyId];
    if (action == null) return false;

    bool consumed = false;

    if (event is KeyDownEvent) {
      _handleKeyDown(action);
      consumed = true;
    } else if (event is KeyRepeatEvent) {
      final state = _keyStates[action];
      if (state != null && !state.config.longPress) {
        state.repeatFired = true;
        consumed = _emit(NavEvent(action: action, type: NavEventType.press));
      }
      consumed = true;
    } else if (event is KeyUpEvent) {
      consumed = _handleKeyUp(action);
    }

    return consumed;
  }

  void _handleKeyDown(String action) {
    if (_keyStates.containsKey(action)) return;

    final cfg = _config[action]!;
    final state = _KeyState(action: action, config: cfg);
    _keyStates[action] = state;

    if (cfg.longPress) {
      state.longPressTimer = Timer(Duration(milliseconds: cfg.longPressMs), () {
        state.longPressFired = true;
        _emit(NavEvent(action: action, type: NavEventType.longPress));
      });
    }
  }

  bool _handleKeyUp(String action) {
    final state = _keyStates.remove(action);
    if (state == null) return false;

    state.longPressTimer?.cancel();
    state.longPressTimer = null;

    if (state.longPressFired || state.repeatFired) return true;

    final cfg = state.config;

    if (cfg.doublePress) {
      if (state.doublePressTimer != null) {
        state.doublePressTimer!.cancel();
        state.doublePressTimer = null;
        return _emit(NavEvent(action: action, type: NavEventType.doublePress));
      }

      state.lastPressTime = DateTime.now().millisecondsSinceEpoch;
      state.doublePressTimer = Timer(
        Duration(milliseconds: cfg.doublePressMs),
        () {
          state.doublePressTimer = null;
          _emit(NavEvent(action: action, type: NavEventType.press));
        },
      );
      _keyStates[action] = state;
      return true;
    }

    return _emit(NavEvent(action: action, type: NavEventType.press));
  }

  bool _emit(NavEvent event) {
    return root.handleEvent(event);
  }

  void _destroy() {
    for (final state in _keyStates.values) {
      state.longPressTimer?.cancel();
      state.doublePressTimer?.cancel();
    }
    _keyStates.clear();
    root.destroy();
  }
}

class NavixKVStore {
  final Map<String, Map<String, dynamic>> _map = {};

  Map<String, dynamic>? get(String key) => _map[key];

  void set(String key, Map<String, dynamic> value) => _map[key] = value;

  void update(String key, Map<String, dynamic> partial) {
    final prev = _map[key] ?? {};
    _map[key] = {...prev, ...partial};
  }

  void delete(String key) => _map.remove(key);
}

/// The root widget of the Navix focus system.
///
/// Wrap your entire app (or the subtree that needs keyboard navigation) with
/// [NavixScope]. It creates a [NavixFocusManager], calls [NavixFocusManager.attach]
/// on init and [NavixFocusManager.detach] on dispose, and exposes the root
/// [NavixFocusNode] to all descendants via [InheritedWidget].
///
/// All Navix widgets must be inside a [NavixScope].
///
/// ```dart
/// void main() {
///   runApp(NavixScope(child: MyApp()));
/// }
/// ```
class NavixScope extends StatefulWidget {
  /// The widget subtree that gains keyboard navigation.
  final Widget child;

  /// Custom key bindings. When `null`, [defaultInputConfig] is used.
  ///
  /// You can partially override the defaults by merging maps:
  /// ```dart
  /// inputConfig: {
  ///   ...defaultInputConfig,
  ///   'enter': ActionConfig(
  ///     keys: [LogicalKeyboardKey.enter],
  ///     longPress: true,
  ///     longPressMs: 800,
  ///   ),
  /// },
  /// ```
  final InputConfig? inputConfig;

  /// Creates a [NavixScope].
  const NavixScope({
    super.key,
    required this.child,
    this.inputConfig,
  });

  /// Returns the root [NavixFocusNode] from the nearest [NavixScope].
  ///
  /// Throws if no [NavixScope] is found in the widget tree.
  static NavixFocusNode of(BuildContext context) {
    final inherited =
        context.dependOnInheritedWidgetOfExactType<_NavixInherited>();
    assert(inherited != null, 'NavixScope not found in widget tree');
    return inherited!.root;
  }

  /// Returns the root [NavixFocusNode] from the nearest [NavixScope], or
  /// `null` if none is found.
  static NavixFocusNode? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<_NavixInherited>()?.root;
  }

  static NavixKVStore storeOf(BuildContext context) {
    final inherited =
        context.dependOnInheritedWidgetOfExactType<_NavixKVInherited>();
    assert(inherited != null, 'NavixScope not found in widget tree');
    return inherited!.store;
  }

  @override
  State<NavixScope> createState() => _NavixScopeState();
}

class _NavixScopeState extends State<NavixScope> {
  late NavixFocusManager _manager;
  final NavixKVStore _kvStore = NavixKVStore();

  @override
  void initState() {
    super.initState();
    _manager = NavixFocusManager(inputConfig: widget.inputConfig);
    _manager.attach();
  }

  @override
  void dispose() {
    _manager.detach();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _NavixKVInherited(
      store: _kvStore,
      child: _NavixInherited(
        root: _manager.root,
        child: widget.child,
      ),
    );
  }
}

class _NavixInherited extends InheritedWidget {
  final NavixFocusNode root;

  const _NavixInherited({
    required this.root,
    required super.child,
  });

  @override
  bool updateShouldNotify(_NavixInherited old) => old.root != root;
}

class _NavixKVInherited extends InheritedWidget {
  final NavixKVStore store;

  const _NavixKVInherited({
    required this.store,
    required super.child,
  });

  @override
  bool updateShouldNotify(_NavixKVInherited old) => false;
}

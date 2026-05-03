import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'nav_event.dart';
import 'focus_node.dart';

class ActionConfig {
  final List<LogicalKeyboardKey> keys;
  final bool longPress;
  final int longPressMs;
  final bool doublePress;
  final int doublePressMs;

  const ActionConfig({
    required this.keys,
    this.longPress = false,
    this.longPressMs = 500,
    this.doublePress = false,
    this.doublePressMs = 300,
  });
}

typedef InputConfig = Map<String, ActionConfig>;

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

class NavixFocusManager {
  late final NavixFocusNode root;
  late final InputConfig _config;

  final Map<int, String> _keyToAction = {};
  final Map<String, _KeyState> _keyStates = {};

  bool _isAttached = false;

  // Double-back-to-exit state
  bool _backPendingExit = false;
  Timer? _backExitTimer;

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

  void attach() {
    if (_isAttached) return;
    _isAttached = true;
    HardwareKeyboard.instance.addHandler(_handleKeyEvent);
  }

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

    if (!consumed && action == 'back') {
      return _handleBackExit();
    }

    return consumed;
  }

  bool _handleBackExit() {
    if (_backPendingExit) {
      _backExitTimer?.cancel();
      _backExitTimer = null;
      _backPendingExit = false;
      return false;
    }
    _backPendingExit = true;
    _backExitTimer = Timer(const Duration(milliseconds: 2000), () {
      _backPendingExit = false;
      _backExitTimer = null;
    });
    return true;
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
    _backExitTimer?.cancel();
    _backExitTimer = null;
    _backPendingExit = false;
    for (final state in _keyStates.values) {
      state.longPressTimer?.cancel();
      state.doublePressTimer?.cancel();
    }
    _keyStates.clear();
    root.destroy();
  }
}

class NavixScope extends StatefulWidget {
  final Widget child;
  final InputConfig? inputConfig;

  const NavixScope({
    super.key,
    required this.child,
    this.inputConfig,
  });

  static NavixFocusNode of(BuildContext context) {
    final inherited =
        context.dependOnInheritedWidgetOfExactType<_NavixInherited>();
    assert(inherited != null, 'NavixScope not found in widget tree');
    return inherited!.root;
  }

  static NavixFocusNode? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<_NavixInherited>()?.root;
  }

  @override
  State<NavixScope> createState() => _NavixScopeState();
}

class _NavixScopeState extends State<NavixScope> {
  late NavixFocusManager _manager;

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
    return _NavixInherited(
      root: _manager.root,
      child: widget.child,
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

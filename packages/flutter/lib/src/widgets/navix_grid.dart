import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

class _GridBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  int columns;

  _GridBehavior(this._node, this.columns) {
    onEvent = _handleEvent;
    canReceiveFocus = _canReceiveFocus;
  }

  bool _canReceiveFocus() => _node.children.any((c) => c.canReceiveFocus());

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;

    final idx = _node.children.indexWhere((c) => c.id == _node.activeChildId);
    if (idx == -1) return false;

    if (event.action == 'left') {
      if (idx % columns == 0) return false;
      return _node.focusPrev();
    }
    if (event.action == 'right') {
      if (idx % columns == columns - 1) return false;
      if (idx == _node.children.length - 1) return false;
      return _node.focusNext();
    }
    if (event.action == 'up') {
      int target = idx - columns;
      while (target >= 0) {
        if (_node.children[target].canReceiveFocus()) {
          return _node.focusChild(_node.children[target].id);
        }
        target -= columns;
      }
      return false;
    }
    if (event.action == 'down') {
      int target = idx + columns;
      while (target < _node.children.length) {
        if (_node.children[target].canReceiveFocus()) {
          return _node.focusChild(_node.children[target].id);
        }
        target += columns;
      }
      return false;
    }

    return false;
  }
}

class NavixGrid extends StatefulWidget {
  final String fKey;
  final int columns;
  final Widget child;
  final bool disabled;
  final bool focusOnRegister;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixGrid({
    super.key,
    required this.fKey,
    required this.columns,
    required this.child,
    this.disabled = false,
    this.focusOnRegister = false,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  State<NavixGrid> createState() => _NavixGridState();
}

class _NavixGridState extends State<NavixGrid> {
  _GridBehavior? _behavior;

  @override
  void didUpdateWidget(NavixGrid oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.columns != widget.columns) {
      _behavior?.columns = widget.columns;
    }
  }

  @override
  Widget build(BuildContext context) {
    return NavixFocusable(
      fKey: widget.fKey,
      callbacks: NavixFocusableCallbacks(
        onFocus: widget.onFocus,
        onBlurred: widget.onBlurred,
        onRegister: widget.onRegister,
        onUnregister: widget.onUnregister,
        onEvent: widget.onEvent,
        disabled: widget.disabled,
        focusOnRegister: widget.focusOnRegister,
      ),
      createBehavior: (node) {
        _behavior = _GridBehavior(node, widget.columns);
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) => widget.child,
    );
  }
}

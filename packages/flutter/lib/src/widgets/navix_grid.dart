import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

class _GridBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  int columns;

  _GridBehavior(this._node, this.columns) {
    onEvent = _handleEvent;
  }

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
      final target = idx - columns;
      if (target < 0) return false;
      return _node.focusChild(_node.children[target].id);
    }
    if (event.action == 'down') {
      final target = idx + columns;
      if (target >= _node.children.length) return false;
      return _node.focusChild(_node.children[target].id);
    }

    return false;
  }
}

class NavixGrid extends StatefulWidget {
  final String fKey;
  final int columns;
  final Widget child;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;

  const NavixGrid({
    super.key,
    required this.fKey,
    required this.columns,
    required this.child,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
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
      ),
      createBehavior: (node) {
        _behavior = _GridBehavior(node, widget.columns);
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) => widget.child,
    );
  }
}

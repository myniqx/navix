import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

enum _ListOrientation { horizontal, vertical }

class _ListBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final String _prev;
  final String _next;

  _ListBehavior(this._node, _ListOrientation orientation)
      : _prev = orientation == _ListOrientation.horizontal ? 'left' : 'up',
        _next = orientation == _ListOrientation.horizontal ? 'right' : 'down' {
    onEvent = _handleEvent;
  }

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;
    if (event.action == _prev) return _node.focusPrev();
    if (event.action == _next) return _node.focusNext();
    return false;
  }
}

class NavixHorizontalList extends StatelessWidget {
  final String fKey;
  final Widget child;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;

  const NavixHorizontalList({
    super.key,
    required this.fKey,
    required this.child,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
  });

  @override
  Widget build(BuildContext context) {
    return NavixFocusable(
      fKey: fKey,
      callbacks: NavixFocusableCallbacks(
        onFocus: onFocus,
        onBlurred: onBlurred,
        onRegister: onRegister,
        onUnregister: onUnregister,
      ),
      createBehavior: (node) =>
          _ListBehavior(node, _ListOrientation.horizontal),
      builder: (context, node, focused, directlyFocused) => child,
    );
  }
}

class NavixVerticalList extends StatelessWidget {
  final String fKey;
  final Widget child;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;

  const NavixVerticalList({
    super.key,
    required this.fKey,
    required this.child,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
  });

  @override
  Widget build(BuildContext context) {
    return NavixFocusable(
      fKey: fKey,
      callbacks: NavixFocusableCallbacks(
        onFocus: onFocus,
        onBlurred: onBlurred,
        onRegister: onRegister,
        onUnregister: onUnregister,
      ),
      createBehavior: (node) => _ListBehavior(node, _ListOrientation.vertical),
      builder: (context, node, focused, directlyFocused) => child,
    );
  }
}

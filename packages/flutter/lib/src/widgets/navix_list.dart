import 'dart:async';

import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

enum _ListOrientation { horizontal, vertical }

const Duration _kReorderDebounce = Duration(milliseconds: 500);

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

class NavixHorizontalList extends StatefulWidget {
  final String fKey;
  final Widget child;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixHorizontalList({
    super.key,
    required this.fKey,
    required this.child,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  State<NavixHorizontalList> createState() => _NavixHorizontalListState();
}

class _NavixHorizontalListState extends State<NavixHorizontalList>
    with _ReorderingListMixin {
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
      ),
      createBehavior: (node) {
        final behavior = _ListBehavior(node, _ListOrientation.horizontal);
        bindNode(node, behavior);
        return behavior;
      },
      builder: (context, node, focused, directlyFocused) {
        return Builder(
          builder: (innerContext) {
            captureHost(innerContext);
            return widget.child;
          },
        );
      },
    );
  }
}

class NavixVerticalList extends StatefulWidget {
  final String fKey;
  final Widget child;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixVerticalList({
    super.key,
    required this.fKey,
    required this.child,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  State<NavixVerticalList> createState() => _NavixVerticalListState();
}

class _NavixVerticalListState extends State<NavixVerticalList>
    with _ReorderingListMixin {
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
      ),
      createBehavior: (node) {
        final behavior = _ListBehavior(node, _ListOrientation.vertical);
        bindNode(node, behavior);
        return behavior;
      },
      builder: (context, node, focused, directlyFocused) {
        return Builder(
          builder: (innerContext) {
            captureHost(innerContext);
            return widget.child;
          },
        );
      },
    );
  }
}

// Shared logic: debounced reorder of the parent node's children based on
// the render-order traversal of the host element. Triggered when a child
// registers; unregistration alone cannot reorder children, so it is ignored.
mixin _ReorderingListMixin<T extends StatefulWidget> on State<T> {
  NavixFocusNode? _node;
  Timer? _debounce;
  BuildContext? _hostContext;

  void bindNode(NavixFocusNode node, IFocusNodeBehavior behavior) {
    _node = node;
    final originalOnChildRegistered = behavior.onChildRegistered;
    behavior.onChildRegistered = (child) {
      originalOnChildRegistered?.call(child);
      _scheduleReorder();
    };
  }

  // Captured every build from the inner Builder so traversal starts from
  // the element that actually contains the user-provided child subtree.
  void captureHost(BuildContext context) {
    _hostContext = context;
  }

  void _scheduleReorder() {
    _debounce?.cancel();
    _debounce = Timer(_kReorderDebounce, _performReorder);
  }

  void _performReorder() {
    final node = _node;
    final ctx = _hostContext;
    if (node == null || ctx == null || !ctx.mounted) return;
    final element = ctx as Element;
    final ordered = collectImmediateFocusNodes(element);
    node.reorderChildren(ordered);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}

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
    canReceiveFocus = _canReceiveFocus;
  }

  bool _canReceiveFocus() => _node.children.any((c) => c.canReceiveFocus());

  bool _handleEvent(NavEvent event) {
    if (event.type != NavEventType.press) return false;
    if (event.action == _prev) return _node.focusPrev();
    if (event.action == _next) return _node.focusNext();
    return false;
  }
}

/// A container node that routes left/right arrow keys between its focusable
/// children.
///
/// Place any widget subtree in [child] — Navix discovers focusable descendants
/// automatically.  Non-focusable (decorative) widgets are ignored.
///
/// ```dart
/// NavixHorizontalList(
///   fKey: 'toolbar',
///   child: Row(
///     children: [
///       NavixButton(fKey: 'play',  onClick: play,  child: const Text('▶')),
///       NavixButton(fKey: 'pause', onClick: pause, child: const Text('⏸')),
///     ],
///   ),
/// )
/// ```
class NavixHorizontalList extends StatefulWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// The widget subtree containing the focusable children. Rendered as-is —
  /// no wrapper widget is injected.
  final Widget child;

  /// Prevents this list from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this node when it registers. Default: `false`.
  final bool focusOnRegister;

  /// Called when this node becomes directly focused.
  final void Function(String key)? onFocus;

  /// Called when this node loses direct focus.
  final void Function(String key)? onBlurred;

  /// Called when this node registers with its parent.
  final void Function(String key)? onRegister;

  /// Called when this node is unregistered (widget disposed).
  final void Function(String key)? onUnregister;

  /// Custom event handler. Return `true` to consume, `false` to bubble.
  final bool Function(NavEvent event)? onEvent;

  /// Creates a [NavixHorizontalList].
  const NavixHorizontalList({
    super.key,
    required this.fKey,
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
        disabled: widget.disabled,
        focusOnRegister: widget.focusOnRegister,
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

/// A container node that routes up/down arrow keys between its focusable
/// children.
///
/// Use [NavixVerticalList] as the outer shell for pages or settings screens
/// and nest [NavixHorizontalList] rows inside it for a two-dimensional layout.
///
/// ```dart
/// NavixVerticalList(
///   fKey: 'page',
///   child: Column(
///     children: [
///       NavixHorizontalList(fKey: 'row-0', child: ...),
///       NavixHorizontalList(fKey: 'row-1', child: ...),
///     ],
///   ),
/// )
/// ```
class NavixVerticalList extends StatefulWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// The widget subtree containing the focusable children.
  final Widget child;

  /// Prevents this list from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this node when it registers. Default: `false`.
  final bool focusOnRegister;

  /// Called when this node becomes directly focused.
  final void Function(String key)? onFocus;

  /// Called when this node loses direct focus.
  final void Function(String key)? onBlurred;

  /// Called when this node registers with its parent.
  final void Function(String key)? onRegister;

  /// Called when this node is unregistered (widget disposed).
  final void Function(String key)? onUnregister;

  /// Custom event handler. Return `true` to consume, `false` to bubble.
  final bool Function(NavEvent event)? onEvent;

  /// Creates a [NavixVerticalList].
  const NavixVerticalList({
    super.key,
    required this.fKey,
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
        disabled: widget.disabled,
        focusOnRegister: widget.focusOnRegister,
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

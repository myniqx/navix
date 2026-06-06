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

/// A fixed 2-D grid container.
///
/// Navigates in all four directions. Left/right stop at row edges; up/down
/// skip over disabled items and stop at column edges.
///
/// Unlike [NavixPaginatedGrid], this widget does **not** virtualize its
/// children — all items are rendered at once. Use it for small, fixed-size
/// grids (e.g. a channel list with ≤ 50 items).
///
/// ```dart
/// NavixGrid(
///   fKey: 'channel-grid',
///   columns: 5,
///   child: Wrap(
///     children: channels.map((ch) =>
///       NavixButton(fKey: ch.id, onClick: () => tune(ch), child: Text(ch.name)),
///     ).toList(),
///   ),
/// )
/// ```
class NavixGrid extends StatefulWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// Number of columns in the grid. Synced on every rebuild — can be changed
  /// dynamically.
  final int columns;

  /// The widget subtree containing the focusable children.
  final Widget child;

  /// Prevents this grid from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this grid when it registers. Default: `false`.
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

  /// Creates a [NavixGrid].
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

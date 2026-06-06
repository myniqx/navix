import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import 'navix_focusable.dart';

class _ExpandableBehavior extends IFocusNodeBehavior {
  final NavixFocusNode _node;
  final void Function(bool expanded) _onChange;
  bool isExpanded = false;

  _ExpandableBehavior(this._node, this._onChange) {
    onEvent = _handleEvent;
    onUnregister = _onUnregister;
    expand = _expand;
    collapse = _collapse;
  }

  @override
  bool get isTrapped => isExpanded;

  bool _handleEvent(NavEvent event) {
    if (!isExpanded) {
      if (event.action == 'enter' && event.type == NavEventType.press) {
        _expand();
        return true;
      }
      return false;
    }

    if (event.action == 'back' && event.type == NavEventType.press) {
      _collapse();
      return true;
    }

    // Expanded: swallow all events — focus is trapped inside.
    return true;
  }

  void _onUnregister() {
    isExpanded = false;
  }

  void _expand() {
    if (isExpanded) return;
    final ancestors = _getAncestors();
    _walkCollapse(_node.getRoot(), ancestors);
    _node.requestFocus();
    isExpanded = true;
    _onChange(true);
  }

  void _collapse() {
    if (!isExpanded) return;
    isExpanded = false;
    _onChange(false);
  }

  Set<NavixFocusNode> _getAncestors() {
    final set = <NavixFocusNode>{};
    NavixFocusNode? current = _node.parent;
    while (current != null) {
      set.add(current);
      current = current.parent;
    }
    return set;
  }

  void _walkCollapse(NavixFocusNode current, Set<NavixFocusNode> ancestors) {
    if (current != _node && !ancestors.contains(current)) {
      current.behavior.collapse?.call();
    }
    for (final child in current.children) {
      _walkCollapse(child, ancestors);
    }
  }
}

/// Signature for the builder of [NavixExpandable].
///
/// - [isExpanded] — whether this expandable is currently open.
/// - [focused] — `true` for every node on the active path.
/// - [directlyFocused] — `true` only when this node is the active leaf.
/// - `expand` — programmatically open this expandable.
/// - `collapse` — programmatically close this expandable.
typedef NavixExpandableBuilder = Widget Function(
  BuildContext context,
  bool isExpanded,
  bool focused,
  bool directlyFocused,
  VoidCallback expand,
  VoidCallback collapse,
);

/// A two-state expandable container.
///
/// **Collapsed**: Enter expands; focus and events behave normally.
/// **Expanded**: Back collapses; focus is trapped inside. Only one
/// [NavixExpandable] can be open at a time — expanding one automatically
/// collapses all others (ancestors on the active path are excluded).
///
/// Mouse hover calls [NavixFocusNode.requestFocus]; tap calls `expand`.
///
/// ```dart
/// NavixExpandable(
///   fKey: 'card',
///   builder: (context, isExpanded, focused, directlyFocused, expand, collapse) {
///     return Column(
///       children: [
///         const Text('Title'),
///         if (isExpanded)
///           NavixButton(fKey: 'play', onClick: play, child: const Text('▶ Play')),
///       ],
///     );
///   },
/// )
/// ```
class NavixExpandable extends StatefulWidget {
  /// Unique string identifier for this node.
  final String fKey;

  /// Builder for the visible widget. The `expand` and `collapse` callbacks
  /// passed to the builder allow programmatic open/close.
  final NavixExpandableBuilder builder;

  /// Prevents this expandable from receiving focus. Default: `false`.
  final bool disabled;

  /// Auto-focus this expandable when it registers. Default: `false`.
  final bool focusOnRegister;

  /// Called when this node becomes directly focused (collapsed state).
  final void Function(String key)? onFocus;

  /// Called when this node loses direct focus.
  final void Function(String key)? onBlurred;

  /// Called when this node registers with its parent.
  final void Function(String key)? onRegister;

  /// Called when this node is unregistered (widget disposed).
  final void Function(String key)? onUnregister;

  /// Custom event handler. Return `true` to consume, `false` to bubble.
  final bool Function(NavEvent event)? onEvent;

  /// Creates a [NavixExpandable].
  const NavixExpandable({
    super.key,
    required this.fKey,
    required this.builder,
    this.disabled = false,
    this.focusOnRegister = false,
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });

  @override
  State<NavixExpandable> createState() => _NavixExpandableState();
}

class _NavixExpandableState extends State<NavixExpandable> {
  bool _isExpanded = false;
  _ExpandableBehavior? _behavior;

  void _onExpandedChanged(bool expanded) {
    setState(() => _isExpanded = expanded);
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
        _behavior = _ExpandableBehavior(node, _onExpandedChanged);
        return _behavior!;
      },
      builder: (context, node, focused, directlyFocused) {
        return MouseRegion(
          onEnter: (_) => node.requestFocus(),
          child: GestureDetector(
            onTap: () {
              if (!_isExpanded) _behavior?._expand();
            },
            child: widget.builder(
              context,
              _isExpanded,
              focused,
              directlyFocused,
              () => _behavior?._expand(),
              () => _behavior?._collapse(),
            ),
          ),
        );
      },
    );
  }
}

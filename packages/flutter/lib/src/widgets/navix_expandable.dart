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

typedef NavixExpandableBuilder = Widget Function(
  BuildContext context,
  bool isExpanded,
  bool focused,
  bool directlyFocused,
  VoidCallback expand,
  VoidCallback collapse,
);

class NavixExpandable extends StatefulWidget {
  final String fKey;
  final NavixExpandableBuilder builder;
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixExpandable({
    super.key,
    required this.fKey,
    required this.builder,
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

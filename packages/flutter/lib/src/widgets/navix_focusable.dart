import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import '../core/focus_manager.dart';

typedef NavixFocusableBuilder = Widget Function(
  BuildContext context,
  NavixFocusNode node,
  bool focused,
  bool directlyFocused,
);

typedef NavixBehaviorFactory = IFocusNodeBehavior Function(NavixFocusNode node);

class NavixFocusableCallbacks {
  final void Function(String key)? onFocus;
  final void Function(String key)? onBlurred;
  final void Function(String key)? onRegister;
  final void Function(String key)? onUnregister;
  final bool Function(NavEvent event)? onEvent;

  const NavixFocusableCallbacks({
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
  });
}

class NavixFocusable extends StatefulWidget {
  final String fKey;
  final NavixFocusableCallbacks? callbacks;
  final NavixBehaviorFactory? createBehavior;
  final NavixFocusableBuilder builder;

  const NavixFocusable({
    super.key,
    required this.fKey,
    required this.builder,
    this.callbacks,
    this.createBehavior,
  });

  static NavixFocusNode of(BuildContext context) {
    final inherited =
        context.dependOnInheritedWidgetOfExactType<_NavixFocusInherited>();
    assert(inherited != null, 'NavixFocusable not found in widget tree');
    return inherited!.node;
  }

  static NavixFocusNode? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<_NavixFocusInherited>()
        ?.node;
  }

  @override
  State<NavixFocusable> createState() => _NavixFocusableState();
}

class _NavixFocusableState extends State<NavixFocusable> {
  late NavixFocusNode _node;

  // Behavior's own callbacks captured once at creation so we can chain them.
  void Function(NavixFocusNode)? _origOnFocus;
  void Function(NavixFocusNode)? _origOnBlurred;
  void Function()? _origOnRegister;
  void Function()? _origOnUnregister;
  bool Function(NavEvent)? _origOnEvent;

  bool _focused = false;
  bool _directlyFocused = false;
  VoidCallback? _unsubscribe;

  @override
  void initState() {
    super.initState();
    _node = NavixFocusNode(widget.fKey);
    _node.behavior = widget.createBehavior?.call(_node) ?? _DefaultBehavior();

    _origOnFocus = _node.behavior.onFocus;
    _origOnBlurred = _node.behavior.onBlurred;
    _origOnRegister = _node.behavior.onRegister;
    _origOnUnregister = _node.behavior.onUnregister;
    _origOnEvent = _node.behavior.onEvent;

    _wireCallbacks();
    _unsubscribe = _node.subscribe(_onNodeChanged);
  }

  @override
  void didUpdateWidget(NavixFocusable oldWidget) {
    super.didUpdateWidget(oldWidget);
    _wireCallbacks();
  }

  void _wireCallbacks() {
    final cb = widget.callbacks;
    final key = widget.fKey;

    _node.behavior.onFocus = (n) {
      _origOnFocus?.call(n);
      cb?.onFocus?.call(key);
    };
    _node.behavior.onBlurred = (n) {
      _origOnBlurred?.call(n);
      cb?.onBlurred?.call(key);
    };
    _node.behavior.onRegister = () {
      _origOnRegister?.call();
      cb?.onRegister?.call(key);
    };
    _node.behavior.onUnregister = () {
      _origOnUnregister?.call();
      cb?.onUnregister?.call(key);
    };
    _node.behavior.onEvent = (e) {
      if (cb?.onEvent?.call(e) == true) return true;
      return _origOnEvent?.call(e) ?? false;
    };
  }

  void _onNodeChanged() {
    final newFocused = _node.isFocused;
    final newDirectly = _node.isDirectlyFocused;
    if (newFocused != _focused || newDirectly != _directlyFocused) {
      setState(() {
        _focused = newFocused;
        _directlyFocused = newDirectly;
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final parent =
        NavixFocusable.maybeOf(context) ?? NavixScope.maybeOf(context);
    if (parent != null && _node.parent != parent) {
      _node.parent?.unregister(_node);
      parent.register(_node);
    }
  }

  @override
  void dispose() {
    _unsubscribe?.call();
    _node.parent?.unregister(_node);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _NavixFocusInherited(
      node: _node,
      child: widget.builder(context, _node, _focused, _directlyFocused),
    );
  }
}

class _NavixFocusInherited extends InheritedWidget {
  final NavixFocusNode node;

  const _NavixFocusInherited({
    required this.node,
    required super.child,
  });

  @override
  bool updateShouldNotify(_NavixFocusInherited old) => old.node != node;
}

class DefaultNavixBehavior extends IFocusNodeBehavior {}

class _DefaultBehavior extends DefaultNavixBehavior {}

import 'package:flutter/widgets.dart';

import '../core/nav_event.dart';
import '../core/focus_node.dart';
import '../core/focus_manager.dart';

/// Signature for the builder used by [NavixFocusable].
///
/// - [node] — the underlying [NavixFocusNode]; use it to call
///   [NavixFocusNode.requestFocus] or read [NavixFocusNode.isFocused].
/// - [focused] — `true` for every node on the active path to the leaf.
/// - [directlyFocused] — `true` only for the deepest active leaf.
typedef NavixFocusableBuilder = Widget Function(
  BuildContext context,
  NavixFocusNode node,
  bool focused,
  bool directlyFocused,
);

/// Factory that creates the [IFocusNodeBehavior] for a [NavixFocusable].
///
/// Called once at mount with the newly created [NavixFocusNode].
typedef NavixBehaviorFactory = IFocusNodeBehavior Function(NavixFocusNode node);

/// Lifecycle and event callbacks shared by all Navix widgets.
///
/// All callbacks receive the widget's `fKey` as their first argument so you
/// can identify the source without capturing it in a closure.
class NavixFocusableCallbacks {
  /// Called when this node becomes the deepest active leaf
  /// ([NavixFocusNode.isDirectlyFocused] transitions to `true`).
  final void Function(String key)? onFocus;

  /// Called when this node is no longer the deepest active leaf.
  final void Function(String key)? onBlurred;

  /// Called after this node registers with its parent.
  final void Function(String key)? onRegister;

  /// Called after this node is unregistered from its parent (widget disposed).
  final void Function(String key)? onUnregister;

  /// Called for every [NavEvent] routed to this node before the behavior
  /// handles it. Return `true` to consume the event; `false` to let it
  /// continue to the behavior and then bubble up.
  final bool Function(NavEvent event)? onEvent;

  /// When `true`, this node cannot receive focus via arrow-key navigation or
  /// [NavixFocusNode.requestFocus]. The node remains in the tree and is still
  /// rendered. Default: `false`.
  final bool disabled;

  /// When `true`, [NavixFocusNode.requestFocus] is called automatically as
  /// soon as this node registers with its parent. Useful for giving a specific
  /// widget initial focus on mount. If multiple widgets have
  /// `focusOnRegister: true`, the last one to register wins. Default: `false`.
  final bool focusOnRegister;

  /// Creates a [NavixFocusableCallbacks] instance.
  const NavixFocusableCallbacks({
    this.onFocus,
    this.onBlurred,
    this.onRegister,
    this.onUnregister,
    this.onEvent,
    this.disabled = false,
    this.focusOnRegister = false,
  });
}

/// The primitive focusable widget all higher-level Navix widgets are built on.
///
/// Creates a [NavixFocusNode], registers it with the nearest
/// [NavixFocusable] or [NavixScope] ancestor, and exposes focus state to
/// [builder]. Use this directly when no built-in widget fits your needs.
///
/// ```dart
/// NavixFocusable(
///   fKey: 'my-item',
///   builder: (context, node, focused, directlyFocused) {
///     return Container(
///       color: directlyFocused ? Colors.blue : Colors.grey,
///       child: const Text('Item'),
///     );
///   },
/// )
/// ```
class NavixFocusable extends StatefulWidget {
  /// Unique string identifier for this node within its parent. Used by
  /// [NavixFocusNode.key] and surfaced in all lifecycle callbacks.
  final String fKey;

  /// Lifecycle and event callbacks. See [NavixFocusableCallbacks].
  final NavixFocusableCallbacks? callbacks;

  /// Factory called once at mount to create the [IFocusNodeBehavior] for
  /// this node. Omit to use the default no-op behavior.
  final NavixBehaviorFactory? createBehavior;

  /// Builder for the widget subtree.
  ///
  /// Rebuilt whenever the node's focus state changes.
  final NavixFocusableBuilder builder;

  /// Creates a [NavixFocusable].
  const NavixFocusable({
    super.key,
    required this.fKey,
    required this.builder,
    this.callbacks,
    this.createBehavior,
  });

  /// Returns the nearest [NavixFocusNode] from a descendant's [BuildContext].
  ///
  /// Throws if no [NavixFocusable] is found in the widget tree.
  static NavixFocusNode of(BuildContext context) {
    final inherited =
        context.dependOnInheritedWidgetOfExactType<_NavixFocusInherited>();
    assert(inherited != null, 'NavixFocusable not found in widget tree');
    return inherited!.node;
  }

  /// Returns the nearest [NavixFocusNode], or `null` if no [NavixFocusable]
  /// is found in the widget tree.
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
  bool Function()? _origCanReceiveFocus;

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
    _origCanReceiveFocus = _node.behavior.canReceiveFocus;

    // Wrap canReceiveFocus once: disabled prop check before behavior's own logic.
    _node.behavior.canReceiveFocus = () {
      if (widget.callbacks?.disabled == true) return false;
      return _origCanReceiveFocus?.call() ?? true;
    };

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
      if (cb?.focusOnRegister == true) {
        _node.requestFocus();
      }
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

// Walks the element tree below [root] in render order and collects the
// nearest `NavixFocusNode` at each branch — descent stops as soon as a
// focusable is found, so nested NavixHorizontalList/Grid instances are not
// flattened into the outer parent.
List<NavixFocusNode> collectImmediateFocusNodes(Element root) {
  final result = <NavixFocusNode>[];
  void visit(Element element) {
    final widget = element.widget;
    if (widget is _NavixFocusInherited) {
      result.add(widget.node);
      return; // do not descend into this focusable's subtree
    }
    element.visitChildren(visit);
  }

  root.visitChildren(visit);
  return result;
}

/// A no-op [IFocusNodeBehavior] you can extend when you only need to override
/// specific callbacks without implementing the full interface.
class DefaultNavixBehavior extends IFocusNodeBehavior {}

class _DefaultBehavior extends DefaultNavixBehavior {}

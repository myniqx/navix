import 'package:flutter/scheduler.dart';

import 'nav_event.dart';

/// Interface that all node behaviors implement.
///
/// Behaviors encapsulate the navigation and lifecycle logic for a
/// [NavixFocusNode]. All fields are nullable function references — override
/// only the ones you need; no `@override` boilerplate required.
///
/// ```dart
/// class MyBehavior extends IFocusNodeBehavior {
///   MyBehavior(NavixFocusNode node) {
///     onEvent = (event) {
///       if (event.action == 'enter' && event.type == NavEventType.press) {
///         doSomething();
///         return true; // consumed
///       }
///       return false; // bubble up
///     };
///   }
/// }
/// ```
abstract class IFocusNodeBehavior {
  /// Called after this node is registered with a parent.
  void Function()? onRegister;

  /// Called after this node is unregistered from its parent.
  void Function()? onUnregister;

  /// Programmatically collapse this node (used by [NavixExpandable]).
  void Function()? collapse;

  /// Programmatically expand this node (used by [NavixExpandable]).
  void Function()? expand;

  /// When `true`, [NavixFocusNode.requestFocus] calls on nodes outside this
  /// subtree are silently ignored.  Used by [NavixExpandable], [NavixInput],
  /// and [NavixMultiLayer] to trap focus.
  bool get isTrapped => false;

  /// Return `false` to prevent this node from receiving focus via
  /// [NavixFocusNode.requestFocus] or arrow-key navigation.
  bool Function()? canReceiveFocus;

  /// Called when a direct child node is registered.
  void Function(NavixFocusNode child)? onChildRegistered;

  /// Called when a direct child node is unregistered.
  void Function(NavixFocusNode child)? onChildUnregistered;

  /// Called when the active child changes (i.e. focus moves between children).
  void Function(NavixFocusNode child)? onActiveChildChanged;

  /// Called when this node becomes the deepest active leaf
  /// ([NavixFocusNode.isDirectlyFocused] transitions to `true`).
  void Function(NavixFocusNode node)? onFocus;

  /// Called when this node is no longer the deepest active leaf
  /// ([NavixFocusNode.isDirectlyFocused] transitions to `false`).
  void Function(NavixFocusNode node)? onBlurred;

  /// Handle a [NavEvent] routed to this node.
  ///
  /// Return `true` to consume the event (stops propagation). Return `false`
  /// to let it bubble to the parent.
  bool Function(NavEvent event)? onEvent;

  /// Called on the parent when one of its children consumes an event.
  void Function(NavEvent event)? onConsumedByChild;
}

class _DefaultFocusNodeBehavior extends IFocusNodeBehavior {}

int _nodeCounter = 0;

/// One node in the Navix focus tree.
///
/// Every focusable widget creates a [NavixFocusNode] and registers it with
/// the nearest parent node via [register]. The tree is kept in sync
/// automatically as widgets mount and unmount.
///
/// You rarely need to create or manage nodes directly — the widget layer
/// (e.g. [NavixFocusable], [NavixButton]) does this for you.
class NavixFocusNode {
  /// Auto-generated unique identifier (`fn_N`). Used internally for
  /// active-child tracking; prefer [key] for application logic.
  final String id;

  /// The string identifier supplied by the widget's `fKey` parameter.
  final String key;

  /// The parent node, or `null` if this is the root.
  NavixFocusNode? parent;

  /// Direct children of this node in registration order.
  final List<NavixFocusNode> children = [];

  /// The [id] of the currently active (focused) child, or `null` if there
  /// are no children.
  String? activeChildId;

  /// `true` for every node on the active path from the root to the focused
  /// leaf, including the leaf itself.
  bool isFocused = false;

  /// `true` only for the deepest active leaf — the node that actually
  /// "has focus" in the traditional sense.
  bool isDirectlyFocused = false;

  /// The behavior attached to this node. Replaced once by the widget layer
  /// immediately after construction; do not replace it after that.
  IFocusNodeBehavior behavior = _DefaultFocusNodeBehavior();

  final Set<VoidCallback> _subscribers = {};

  /// Creates a node with the given [key].
  NavixFocusNode(this.key) : id = 'fn_${++_nodeCounter}';

  /// Registers a change listener.
  ///
  /// Returns an unsubscribe callback — call it to remove the listener.
  VoidCallback subscribe(VoidCallback fn) {
    _subscribers.add(fn);
    return () => _subscribers.remove(fn);
  }

  void _notify() {
    _runOrDefer(() {
      for (final fn in List.of(_subscribers)) {
        fn();
      }
    });
  }

  static void _runOrDefer(VoidCallback fn) {
    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase == SchedulerPhase.persistentCallbacks ||
        phase == SchedulerPhase.transientCallbacks) {
      SchedulerBinding.instance.addPostFrameCallback((_) => fn());
    } else {
      fn();
    }
  }

  /// Adds [child] to this node's children.
  ///
  /// The first child registered on an unfocused node automatically becomes
  /// the active child. If this node is already directly focused the focus
  /// path is propagated down to the new child.
  void register(NavixFocusNode child) {
    if (children.contains(child)) return;
    child.parent = this;
    children.add(child);

    final becameFirstChild = activeChildId == null;
    if (becameFirstChild) activeChildId = child.id;

    _runOrDefer(() {
      child.behavior.onRegister?.call();
      behavior.onChildRegistered?.call(child);
    });

    if (becameFirstChild && isDirectlyFocused) {
      _propagateFocus();
    } else {
      _notify();
    }
  }

  /// Removes [child] from this node's children.
  ///
  /// If [child] was on the active focus path, focus falls back to an adjacent
  /// sibling (next preferred, then previous, then no child).
  void unregister(NavixFocusNode child) {
    final idx = children.indexOf(child);
    if (idx == -1) return;

    _runOrDefer(() {
      child.behavior.onUnregister?.call();
      behavior.onChildUnregistered?.call(child);
    });

    final wasOnActivePath = child.isFocused;

    children.removeAt(idx);
    child.parent = null;
    child._clearFocusFlags();

    if (activeChildId == child.id) {
      final fallback = idx < children.length
          ? children[idx]
          : (children.isNotEmpty ? children[idx - 1] : null);
      activeChildId = fallback?.id;
    }

    if (wasOnActivePath) {
      _propagateFocus();
    } else {
      _notify();
    }
  }

  /// Routes [event] down to the active child first, then up via
  /// [IFocusNodeBehavior.onEvent] if the child did not consume it.
  ///
  /// Returns `true` if the event was consumed anywhere in this subtree.
  bool handleEvent(NavEvent event) {
    final active = getActiveChild();
    if (active != null && active.handleEvent(event)) {
      behavior.onConsumedByChild?.call(event);
      return true;
    }
    return behavior.onEvent?.call(event) ?? false;
  }

  bool canReceiveFocus() => behavior.canReceiveFocus?.call() ?? true;

  /// Moves the active child to the next sibling that can receive focus.
  ///
  /// Returns `true` if focus moved, `false` if already at the last focusable
  /// child or there are no children.
  bool focusNext() {
    if (activeChildId == null || children.isEmpty) return false;
    final idx = children.indexWhere((c) => c.id == activeChildId);
    if (idx == -1) return false;
    for (int i = idx + 1; i < children.length; i++) {
      if (children[i].canReceiveFocus()) {
        activeChildId = children[i].id;
        _propagateFocus();
        _notify();
        return true;
      }
    }
    return false;
  }

  /// Moves the active child to the previous sibling that can receive focus.
  ///
  /// Returns `true` if focus moved, `false` if already at the first focusable
  /// child or there are no children.
  bool focusPrev() {
    if (activeChildId == null || children.isEmpty) return false;
    final idx = children.indexWhere((c) => c.id == activeChildId);
    if (idx <= 0) return false;
    for (int i = idx - 1; i >= 0; i--) {
      if (children[i].canReceiveFocus()) {
        activeChildId = children[i].id;
        _propagateFocus();
        _notify();
        return true;
      }
    }
    return false;
  }

  /// Reorders existing children without firing register/unregister callbacks.
  ///
  /// [ordered] must contain exactly the same nodes as [children] — no
  /// additions or removals. Mismatched lists are silently ignored.
  /// [activeChildId] is preserved across the reorder.
  void reorderChildren(List<NavixFocusNode> ordered) {
    if (ordered.length != children.length) return;
    final currentSet = Set<NavixFocusNode>.identity()..addAll(children);
    for (final n in ordered) {
      if (!currentSet.contains(n)) return;
    }
    bool changed = false;
    for (int i = 0; i < ordered.length; i++) {
      if (!identical(children[i], ordered[i])) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    children
      ..clear()
      ..addAll(ordered);
    _notify();
  }

  /// Focuses the child with the given [childId] (its [NavixFocusNode.id]).
  ///
  /// Returns `true` if the child was found and focused.
  bool focusChild(String childId) {
    final child = children.cast<NavixFocusNode?>().firstWhere(
          (c) => c!.id == childId,
          orElse: () => null,
        );
    if (child == null) return false;
    final changed = activeChildId != childId;
    activeChildId = childId;
    if (changed) behavior.onActiveChildChanged?.call(child);
    _propagateFocus();
    _notify();
    return true;
  }

  /// Returns the currently active child node, or `null` if there are none.
  NavixFocusNode? getActiveChild() {
    if (activeChildId == null) return null;
    return children.cast<NavixFocusNode?>().firstWhere(
          (c) => c!.id == activeChildId,
          orElse: () => null,
        );
  }

  /// Returns the ordered list of nodes from this node down to the current
  /// active leaf (inclusive on both ends).
  List<NavixFocusNode> getActivePath() {
    final path = <NavixFocusNode>[this];
    NavixFocusNode current = this;
    while (true) {
      final child = current.getActiveChild();
      if (child == null) break;
      path.add(child);
      current = child;
    }
    return path;
  }

  void _propagateFocus() {
    _runOrDefer(() {
      final root = getRoot();
      final path = root.getActivePath();
      final pathSet = Set<NavixFocusNode>.identity()..addAll(path);
      final toNotify = <NavixFocusNode>[];
      root._applyFocusFlags(pathSet, path, toNotify);
      for (final node in toNotify) {
        node._notify();
      }
    });
  }

  void _applyFocusFlags(
    Set<NavixFocusNode> pathSet,
    List<NavixFocusNode> path,
    List<NavixFocusNode> toNotify,
  ) {
    final newFocused = pathSet.contains(this);
    final newDirectly = newFocused && path.last == this;

    if (isFocused != newFocused || isDirectlyFocused != newDirectly) {
      isFocused = newFocused;
      if (isDirectlyFocused != newDirectly) {
        isDirectlyFocused = newDirectly;
        if (newDirectly) {
          behavior.onFocus?.call(this);
        } else {
          behavior.onBlurred?.call(this);
        }
      }
      toNotify.add(this);
    }

    for (final child in children) {
      child._applyFocusFlags(pathSet, path, toNotify);
    }
  }

  void _clearFocusFlags() {
    if (isFocused || isDirectlyFocused) {
      isFocused = false;
      if (isDirectlyFocused) {
        isDirectlyFocused = false;
        _runOrDefer(() => behavior.onBlurred?.call(this));
      }
      _notify();
    }
    for (final child in children) {
      child._clearFocusFlags();
    }
  }

  NavixFocusNode getRoot() {
    NavixFocusNode node = this;
    while (node.parent != null) {
      node = node.parent!;
    }
    return node;
  }

  /// Programmatically focuses this node from anywhere in the tree.
  ///
  /// Does nothing if [canReceiveFocus] returns `false`, or if a focus trap is
  /// active and this node is outside the trapped subtree.
  void requestFocus() {
    if (!canReceiveFocus()) return;
    final trapNode = _findTrap(getRoot());
    if (trapNode != null && !_isDescendantOf(trapNode)) return;

    NavixFocusNode current = this;
    while (current.parent != null) {
      current.parent!.focusChild(current.id);
      current = current.parent!;
    }
  }

  NavixFocusNode? _findTrap(NavixFocusNode node) {
    if (node.behavior.isTrapped) return node;
    for (final child in node.children) {
      final found = _findTrap(child);
      if (found != null) return found;
    }
    return null;
  }

  bool _isDescendantOf(NavixFocusNode ancestor) {
    NavixFocusNode? current = parent;
    while (current != null) {
      if (current == ancestor) return true;
      current = current.parent;
    }
    return false;
  }

  /// Detaches this node from its parent and recursively disposes all children.
  ///
  /// Called automatically by the widget layer on dispose. You should not
  /// need to call this directly.
  void destroy() {
    parent?.unregister(this);
    _subscribers.clear();
    for (final child in [...children]) {
      child.destroy();
    }
    children.clear();
  }
}

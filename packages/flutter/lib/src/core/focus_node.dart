import 'package:flutter/scheduler.dart';

import 'nav_event.dart';

abstract class IFocusNodeBehavior {
  void Function()? onRegister;
  void Function()? onUnregister;
  void Function()? collapse;
  void Function()? expand;
  bool get isTrapped => false;
  void Function(NavixFocusNode child)? onChildRegistered;
  void Function(NavixFocusNode child)? onChildUnregistered;
  void Function(NavixFocusNode child)? onActiveChildChanged;
  void Function(NavixFocusNode node)? onFocus;
  void Function(NavixFocusNode node)? onBlurred;
  bool Function(NavEvent event)? onEvent;
}

class _DefaultFocusNodeBehavior extends IFocusNodeBehavior {}

int _nodeCounter = 0;

class NavixFocusNode {
  final String id;
  final String key;

  NavixFocusNode? parent;
  final List<NavixFocusNode> children = [];
  String? activeChildId;
  bool isFocused = false;
  bool isDirectlyFocused = false;

  IFocusNodeBehavior behavior = _DefaultFocusNodeBehavior();

  final Set<VoidCallback> _subscribers = {};

  NavixFocusNode(this.key) : id = 'fn_${++_nodeCounter}';

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

  bool handleEvent(NavEvent event) {
    final active = getActiveChild();
    if (active != null && active.handleEvent(event)) return true;
    return behavior.onEvent?.call(event) ?? false;
  }

  bool focusNext() {
    if (activeChildId == null || children.isEmpty) return false;
    final idx = children.indexWhere((c) => c.id == activeChildId);
    if (idx == -1 || idx >= children.length - 1) return false;
    activeChildId = children[idx + 1].id;
    _propagateFocus();
    _notify();
    return true;
  }

  bool focusPrev() {
    if (activeChildId == null || children.isEmpty) return false;
    final idx = children.indexWhere((c) => c.id == activeChildId);
    if (idx <= 0) return false;
    activeChildId = children[idx - 1].id;
    _propagateFocus();
    _notify();
    return true;
  }

  // Reorders existing children without firing register/unregister callbacks.
  // The new list must contain exactly the same nodes as `children` (no
  // additions, no removals); otherwise the call is a no-op. `activeChildId`
  // is preserved.
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

  NavixFocusNode? getActiveChild() {
    if (activeChildId == null) return null;
    return children.cast<NavixFocusNode?>().firstWhere(
          (c) => c!.id == activeChildId,
          orElse: () => null,
        );
  }

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

  void requestFocus() {
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

  void destroy() {
    parent?.unregister(this);
    _subscribers.clear();
    for (final child in [...children]) {
      child.destroy();
    }
    children.clear();
  }
}

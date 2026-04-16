import type { NavEvent, IFocusNodeBehavior } from './types';

let counter = 0;

export class FocusNode {
  readonly id: string;
  key: string;
  parent: FocusNode | null = null;
  children: FocusNode[] = [];
  activeChildId: string | null = null;
  isFocused: boolean = false;
  isDirectlyFocused: boolean = false;

  // Attached behavior — set by behavior constructors via node.behavior = this
  behavior: IFocusNodeBehavior | null = null;

  // Subscribers notified on any state change (used by React adapter)
  private subscribers: Set<() => void> = new Set();

  constructor(key: string) {
    this.id = `fn_${++counter}`;
    this.key = key;
  }

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private notify(): void {
    for (const fn of this.subscribers) fn();
  }

  register(child: FocusNode): void {
    if (this.children.includes(child)) return;
    child.parent = this;
    this.children.push(child);

    const becameFirstChild = this.activeChildId === null;
    if (becameFirstChild) {
      this.activeChildId = child.id;
    }

    child.behavior?.onRegister?.();
    this.behavior?.onChildRegistered?.(child);

    // If this node was the leaf of the active path, the new child extends
    // the path and must take over as the direct-focus leaf. Recompute flags
    // from root so every ancestor/descendant reflects the new path.
    if (becameFirstChild && this.isDirectlyFocused) {
      this._propagateFocus();
    } else {
      this.notify();
    }
  }

  unregister(child: FocusNode): void {
    const idx = this.children.indexOf(child);
    if (idx === -1) return;

    child.behavior?.onUnregister?.();
    this.behavior?.onChildUnregistered?.(child);

    const wasOnActivePath = child.isFocused;

    this.children.splice(idx, 1);
    child.parent = null;

    // Clear stale focus flags on the detached subtree — _propagateFocus
    // below can no longer reach these nodes to reset them.
    child._clearFocusFlags();

    if (this.activeChildId === child.id) {
      const fallback = this.children[idx] ?? this.children[idx - 1] ?? null;
      this.activeChildId = fallback ? fallback.id : null;
    }

    // If the removed child was on the active path, the path is now broken.
    // Recompute from root so the nearest surviving ancestor becomes the leaf
    // (or a fallback sibling, depending on activeChildId above).
    if (wasOnActivePath) {
      this._propagateFocus();
    } else {
      this.notify();
    }
  }

  handleEvent(event: NavEvent): boolean {
    const activeChild = this.getActiveChild();

    if (activeChild) {
      const consumed = activeChild.handleEvent(event);
      if (consumed) return true;
    }

    if (this.behavior) {
      return this.behavior.onEvent(event);
    }

    return false;
  }

  focusNext(): boolean {
    if (this.activeChildId === null || this.children.length === 0) return false;

    const idx = this.children.findIndex((c) => c.id === this.activeChildId);
    if (idx === -1 || idx >= this.children.length - 1) return false;

    this.activeChildId = this.children[idx + 1]!.id;
    this._propagateFocus();
    this.notify();
    return true;
  }

  focusPrev(): boolean {
    if (this.activeChildId === null || this.children.length === 0) return false;

    const idx = this.children.findIndex((c) => c.id === this.activeChildId);
    if (idx <= 0) return false;

    this.activeChildId = this.children[idx - 1]!.id;
    this._propagateFocus();
    this.notify();
    return true;
  }

  focusChild(childId: string): boolean {
    const child = this.children.find((c) => c.id === childId);
    if (!child) return false;

    this.activeChildId = childId;
    this._propagateFocus();
    this.notify();
    return true;
  }

  getActiveChild(): FocusNode | null {
    if (this.activeChildId === null) return null;
    return this.children.find((c) => c.id === this.activeChildId) ?? null;
  }

  getActivePath(): FocusNode[] {
    const path: FocusNode[] = [this];
    let current: FocusNode = this;

    while (true) {
      const child = current.getActiveChild();
      if (!child) break;
      path.push(child);
      current = child;
    }

    return path;
  }

  // Walk up to root and recompute isFocused / isDirectlyFocused for the whole tree.
  // Reset and set happen in a single pass — no notify is called until all flags are
  // correct, preventing React from seeing an intermediate state where every node
  // appears focused or unfocused at the same time.
  private _propagateFocus(): void {
    const root = this.getRoot();
    const path = root.getActivePath();
    const pathSet = new Set(path);

    // Single traversal: set correct flags everywhere, then notify all at once
    const toNotify: FocusNode[] = [];
    root._applyFocusFlags(pathSet, path, toNotify);
    for (const node of toNotify) node.notify();
  }

  private _applyFocusFlags(
    pathSet: Set<FocusNode>,
    path: FocusNode[],
    toNotify: FocusNode[],
  ): void {
    const newFocused = pathSet.has(this);
    const newDirectly = newFocused && path[path.length - 1] === this;

    if (this.isFocused !== newFocused || this.isDirectlyFocused !== newDirectly) {
      this.isFocused = newFocused;
      if (this.isDirectlyFocused !== newDirectly) {
        this.isDirectlyFocused = newDirectly;
        if (newDirectly)
          this.behavior?.onFocus?.(this)
        else
          this.behavior?.onBlurred?.(this)
      }
      toNotify.push(this);
    }

    for (const child of this.children) {
      child._applyFocusFlags(pathSet, path, toNotify);
    }
  }

  // Recursively clear focus flags on this node and all its descendants.
  // Called when a subtree is detached (unregister) so stale flags don't persist.
  private _clearFocusFlags(): void {
    if (this.isFocused || this.isDirectlyFocused) {
      this.isFocused = false;
      if (this.isDirectlyFocused) {
        this.isDirectlyFocused = false;
        this.behavior?.onBlurred?.(this)
      }
      this.notify();
    }
    for (const child of this.children) {
      child._clearFocusFlags();
    }
  }

  getRoot(): FocusNode {
    let node: FocusNode = this;
    while (node.parent) node = node.parent;
    return node;
  }

  // Walk up the tree from this node to root, making each ancestor point to
  // the next node as its activeChildId. This gives this node the full active
  // path, which triggers _propagateFocus and clears any previously focused branch.
  //
  // Focus trap: if any node in the tree has behavior.isTrapped = true, only
  // nodes that are descendants of that node may receive focus. Any request
  // from outside is silently ignored.
  requestFocus(): void {
    const trapNode = this._findTrap(this.getRoot());
    if (trapNode !== null && !this._isDescendantOf(trapNode)) return;

    let current: FocusNode = this;
    while (current.parent) {
      current.parent.focusChild(current.id);
      current = current.parent;
    }
  }

  // Returns the first node in the tree whose behavior has isTrapped = true,
  // or null if no trap is active.
  private _findTrap(node: FocusNode): FocusNode | null {
    if (node.behavior?.isTrapped) return node;
    for (const child of node.children) {
      const found = this._findTrap(child);
      if (found) return found;
    }
    return null;
  }

  // Returns true if this node is a descendant of the given ancestor.
  private _isDescendantOf(ancestor: FocusNode): boolean {
    let current: FocusNode | null = this.parent;
    while (current !== null) {
      if (current === ancestor) return true;
      current = current.parent;
    }
    return false;
  }


  destroy(): void {
    if (this.parent) {
      this.parent.unregister(this);
    }
    this.subscribers.clear();
    for (const child of [...this.children]) {
      child.destroy();
    }
    this.children = [];
  }
}

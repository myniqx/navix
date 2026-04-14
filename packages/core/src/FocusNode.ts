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

  onEvent?: (event: NavEvent) => boolean;

  // Attached behavior — set by behavior constructors via node.behavior = this
  behavior?: IFocusNodeBehavior;

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

    // Auto-focus first registered child
    if (this.activeChildId === null) {
      this.activeChildId = child.id;
      this._propagateFocus();
    }

    child.behavior?.onRegister?.();
    this.notify();
  }

  unregister(child: FocusNode): void {
    const idx = this.children.indexOf(child);
    if (idx === -1) return;

    child.behavior?.onUnregister?.();

    this.children.splice(idx, 1);
    child.parent = null;

    if (this.activeChildId === child.id) {
      // Fall back to nearest sibling
      const fallback = this.children[idx] ?? this.children[idx - 1] ?? null;
      this.activeChildId = fallback ? fallback.id : null;
      this._propagateFocus();
    }

    this.notify();
  }

  handleEvent(event: NavEvent): boolean {
    const activeChild = this.getActiveChild();

    if (activeChild) {
      const consumed = activeChild.handleEvent(event);
      if (consumed) return true;
    }

    if (this.onEvent) {
      return this.onEvent(event);
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

  // Walk up to root and recompute isFocused / isDirectlyFocused for the whole tree
  private _propagateFocus(): void {
    const root = this.getRoot();
    root._resetFocusFlags();
    const path = root.getActivePath();

    for (let i = 0; i < path.length; i++) {
      const node = path[i]!;
      node.isFocused = true;
      node.isDirectlyFocused = i === path.length - 1;
      node.notify();
    }
  }

  getRoot(): FocusNode {
    let node: FocusNode = this;
    while (node.parent) node = node.parent;
    return node;
  }

  private _resetFocusFlags(): void {
    this.isFocused = false;
    this.isDirectlyFocused = false;
    this.notify();
    for (const child of this.children) {
      child._resetFocusFlags();
    }
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

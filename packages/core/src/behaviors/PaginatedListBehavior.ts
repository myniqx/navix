import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export type PaginatedListOrientation = 'horizontal' | 'vertical';

const MIN_VISIBLE_COUNT = 2;

export class PaginatedListBehavior implements IFocusNodeBehavior {
  totalCount: number;
  activeIndex: number = 0;
  viewOffset: number = 0;

  private _visibleCount: number = MIN_VISIBLE_COUNT;
  private _threshold: number = 1;

  get visibleCount(): number {
    return this._visibleCount;
  }
  set visibleCount(value: number) {
    this._visibleCount = Math.max(MIN_VISIBLE_COUNT, value);
  }

  get threshold(): number {
    return this._threshold;
  }
  set threshold(value: number) {
    this._threshold = Math.max(1, Math.min(value, this._visibleCount - 2));
  }

  private _node: FocusNode;
  private _pendingFocusKey: string | null = null;
  private _prev: string;
  private _next: string;
  private _onChange: (newIndex: number, newOffset: number) => void;
  private _keyToIndex: (key: string) => number;

  // Called with (newIndex, newOffset) after every navigation step.
  // React adapter uses this to sync viewOffset state and resolve focusChild.
  set onChange(fn: (newIndex: number, newOffset: number) => void) {
    this._onChange = fn;
  }

  constructor(
    node: FocusNode,
    orientation: PaginatedListOrientation,
    totalCount: number,
    visibleCount: number,
    threshold: number,
    onChange: (newIndex: number, newOffset: number) => void,
    keyToIndex: (key: string) => number,
  ) {
    this._node = node;
    this.totalCount = totalCount;
    this.visibleCount = visibleCount;
    this.threshold = threshold; // setter clamps the value
    this._prev = orientation === 'horizontal' ? 'left' : 'up';
    this._next = orientation === 'horizontal' ? 'right' : 'down';
    this._onChange = onChange;
    this._keyToIndex = keyToIndex;
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;
    if (event.action === this._prev) return this._moveTo(this.activeIndex - 1);
    if (event.action === this._next) return this._moveTo(this.activeIndex + 1);
    return false;
  };

  // Called by React adapter after resolving the key for newIndex.
  // Focuses the child if mounted, otherwise stores as pending.
  focusByKey(key: string): void {
    const child = this._node.children.find((c) => c.key === key);
    if (child) {
      this._node.focusChild(child.id);
    } else {
      this._pendingFocusKey = key;
    }
  }

  onChildRegistered = (child: FocusNode): void => {
    if (this._keyToIndex(child.key) === -1) {
      console.warn(
        `[PaginatedList:${this._node.key}] Registered child key "${child.key}" does not match any key produced by keyForItem. ` +
          `Pass the fKey argument from renderItem to your child component instead of assigning a custom fKey, ` +
          `or supply a keyForItem that returns the same key your child uses.`,
      );
    }

    if (this._pendingFocusKey !== null && child.key === this._pendingFocusKey) {
      this._pendingFocusKey = null;
      this._node.focusChild(child.id);
    }
  };

  onActiveChildChanged = (child: FocusNode): void => {
    const idx = this._keyToIndex(child.key);
    if (idx !== -1) this.activeIndex = idx;
  };

  private _moveTo(newIndex: number): boolean {
    if (newIndex < 0 || newIndex >= this.totalCount) return false;

    this.activeIndex = newIndex;
    this._updateOffset();
    this._onChange(this.activeIndex, this.viewOffset);
    return true;
  }

  private _updateOffset(): void {
    const maxOffset = Math.max(0, this.totalCount - this.visibleCount);
    let offset = this.viewOffset;
    const positionInView = this.activeIndex - offset;

    if (positionInView < this.threshold) {
      offset = Math.max(0, this.activeIndex - this.threshold);
    } else if (positionInView > this.visibleCount - 1 - this.threshold) {
      offset = Math.min(
        maxOffset,
        this.activeIndex - (this.visibleCount - 1 - this.threshold),
      );
    }

    this.viewOffset = offset;
  }
}

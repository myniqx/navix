import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export type PaginatedListOrientation = 'horizontal' | 'vertical';

export class PaginatedListBehavior implements IFocusNodeBehavior {
  totalCount: number;
  visibleCount: number;
  threshold: number;
  activeIndex: number = 0;
  viewOffset: number = 0;

  // Called with (newIndex, newOffset) after every navigation step.
  // React adapter uses this to sync viewOffset state and resolve focusChild.
  onChange: ((newIndex: number, newOffset: number) => void) | null = null;

  private _node: FocusNode;
  private _pendingFocusKey: string | null = null;
  private _prev: string;
  private _next: string;

  constructor(
    node: FocusNode,
    orientation: PaginatedListOrientation,
    totalCount: number,
    visibleCount: number,
    threshold: number,
  ) {
    this._node = node;
    this.totalCount = totalCount;
    this.visibleCount = visibleCount;
    this.threshold = threshold;
    this._prev = orientation === 'horizontal' ? 'left' : 'up';
    this._next = orientation === 'horizontal' ? 'right' : 'down';
    node.behavior = this;
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
    if (this._pendingFocusKey !== null && child.key === this._pendingFocusKey) {
      this._pendingFocusKey = null;
      this._node.focusChild(child.id);
    }
  };

  private _moveTo(newIndex: number): boolean {
    if (newIndex < 0 || newIndex >= this.totalCount) return false;

    this.activeIndex = newIndex;
    this._updateOffset();
    this.onChange?.(this.activeIndex, this.viewOffset);
    return true;
  }

  private _updateOffset(): void {
    const maxOffset = Math.max(0, this.totalCount - this.visibleCount);
    let offset = this.viewOffset;
    const positionInView = this.activeIndex - offset;

    if (positionInView < this.threshold) {
      offset = Math.max(0, this.activeIndex - this.threshold);
    } else if (positionInView > this.visibleCount - 1 - this.threshold) {
      offset = Math.min(maxOffset, this.activeIndex - (this.visibleCount - 1 - this.threshold));
    }

    this.viewOffset = offset;
  }
}

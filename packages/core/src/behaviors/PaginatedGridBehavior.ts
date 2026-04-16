import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export type PaginatedGridOrientation = 'horizontal' | 'vertical';

export class PaginatedGridBehavior implements IFocusNodeBehavior {
  totalCount: number;
  rows: number;
  columns: number;
  threshold: number;
  activeIndex: number = 0;
  viewOffset: number = 0;
  orientation: PaginatedGridOrientation;

  // Called with (newIndex, newOffset) after every navigation step.
  // React adapter uses this to sync viewOffset state and resolve focusChild.
  onChange: ((newIndex: number, newOffset: number) => void) | null = null;

  private _node: FocusNode;
  private _pendingFocusKey: string | null = null;

  constructor(
    node: FocusNode,
    orientation: PaginatedGridOrientation,
    totalCount: number,
    rows: number,
    columns: number,
    threshold: number,
  ) {
    this._node = node;
    this.orientation = orientation;
    this.totalCount = totalCount;
    this.rows = rows;
    this.columns = columns;
    this.threshold = threshold;
    node.behavior = this;
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;

    if (this.orientation === 'horizontal') {
      if (event.action === 'up') return this._moveTo(this.activeIndex - 1, 'cross');
      if (event.action === 'down') return this._moveTo(this.activeIndex + 1, 'cross');
      if (event.action === 'left') return this._moveTo(this.activeIndex - this.rows, 'main');
      if (event.action === 'right') return this._moveTo(this.activeIndex + this.rows, 'main');
    } else {
      if (event.action === 'left') return this._moveTo(this.activeIndex - 1, 'cross');
      if (event.action === 'right') return this._moveTo(this.activeIndex + 1, 'cross');
      if (event.action === 'up') return this._moveTo(this.activeIndex - this.columns, 'main');
      if (event.action === 'down') return this._moveTo(this.activeIndex + this.columns, 'main');
    }

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

  private _moveTo(newIndex: number, axis: 'main' | 'cross'): boolean {
    if (newIndex < 0 || newIndex >= this.totalCount) return false;

    // Cross axis boundary check — don't wrap across slices
    if (axis === 'cross') {
      const sliceSize = this.orientation === 'horizontal' ? this.rows : this.columns;
      const oldSlice = Math.floor(this.activeIndex / sliceSize);
      const newSlice = Math.floor(newIndex / sliceSize);
      if (oldSlice !== newSlice) return false;
    }

    this.activeIndex = newIndex;
    this._updateOffset();
    this.onChange?.(this.activeIndex, this.viewOffset);
    return true;
  }

  private _updateOffset(): void {
    const sliceSize = this.orientation === 'horizontal' ? this.rows : this.columns;
    const visibleSlices = this.orientation === 'horizontal' ? this.columns : this.rows;
    const totalSlices = Math.ceil(this.totalCount / sliceSize);
    const maxOffset = Math.max(0, totalSlices - visibleSlices);

    const currentSlice = Math.floor(this.activeIndex / sliceSize);
    let offset = this.viewOffset;
    const positionInView = currentSlice - offset;

    if (positionInView < this.threshold) {
      offset = Math.max(0, currentSlice - this.threshold);
    } else if (positionInView > visibleSlices - 1 - this.threshold) {
      offset = Math.min(maxOffset, currentSlice - (visibleSlices - 1 - this.threshold));
    }

    this.viewOffset = offset;
  }
}

import type { FocusNode } from '../core/FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../core/types';

export type PaginatedGridOrientation =
  | 'horizontal'
  | 'vertical'
  | 'auto-horizontal';

const MIN_GRID_DIMENSION = 2;

export class PaginatedGridBehavior implements IFocusNodeBehavior {
  totalCount: number;
  activeIndex: number = 0;
  viewOffset: number = 0;
  orientation: PaginatedGridOrientation;

  private _rows: number = MIN_GRID_DIMENSION;
  private _columns: number = MIN_GRID_DIMENSION;
  private _threshold: number = 1;

  get effectiveOrientation(): 'horizontal' | 'vertical' {
    if (this.orientation === 'auto-horizontal') {
      return this.totalCount < this._rows * this._columns
        ? 'vertical'
        : 'horizontal';
    }
    return this.orientation;
  }

  get rows(): number {
    return this._rows;
  }
  set rows(value: number) {
    this._rows = Math.max(MIN_GRID_DIMENSION, value);
  }

  get columns(): number {
    return this._columns;
  }
  set columns(value: number) {
    this._columns = Math.max(MIN_GRID_DIMENSION, value);
  }

  get threshold(): number {
    return this._threshold;
  }
  set threshold(value: number) {
    const visibleSlices =
      this.effectiveOrientation === 'horizontal' ? this._columns : this._rows;
    this._threshold = Math.max(1, Math.min(value, visibleSlices - 2));
  }

  private _node: FocusNode;
  private _pendingFocusKey: string | null = null;
  private _onChange: (newIndex: number, newOffset: number) => void;
  private _keyToIndex: (key: string) => number;

  set onChange(fn: (newIndex: number, newOffset: number) => void) {
    this._onChange = fn;
  }

  constructor(
    node: FocusNode,
    orientation: PaginatedGridOrientation,
    totalCount: number,
    rows: number,
    columns: number,
    threshold: number,
    onChange: (newIndex: number, newOffset: number) => void,
    keyToIndex: (key: string) => number,
  ) {
    this._node = node;
    this.orientation = orientation;
    this.totalCount = totalCount;
    this.rows = rows;
    this.columns = columns;
    this.threshold = threshold;
    this._onChange = onChange;
    this._keyToIndex = keyToIndex;
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;

    if (this.effectiveOrientation === 'horizontal') {
      if (event.action === 'up')
        return this._moveTo(this.activeIndex - 1, 'cross');
      if (event.action === 'down')
        return this._moveTo(this.activeIndex + 1, 'cross');
      if (event.action === 'left')
        return this._moveTo(this.activeIndex - this.rows, 'main');
      if (event.action === 'right')
        return this._moveTo(this.activeIndex + this.rows, 'main');
    } else {
      if (event.action === 'left')
        return this._moveTo(this.activeIndex - 1, 'cross');
      if (event.action === 'right')
        return this._moveTo(this.activeIndex + 1, 'cross');
      if (event.action === 'up')
        return this._moveTo(this.activeIndex - this.columns, 'main');
      if (event.action === 'down')
        return this._moveTo(this.activeIndex + this.columns, 'main');
    }

    return false;
  };

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
        `[PaginatedGrid:${this._node.key}] Registered child key "${child.key}" does not match any key produced by keyForItem. ` +
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

  private _moveTo(newIndex: number, axis: 'main' | 'cross'): boolean {
    if (newIndex < 0 || newIndex >= this.totalCount) return false;

    if (axis === 'cross') {
      const sliceSize =
        this.effectiveOrientation === 'horizontal' ? this.rows : this.columns;
      const oldSlice = Math.floor(this.activeIndex / sliceSize);
      const newSlice = Math.floor(newIndex / sliceSize);
      if (oldSlice !== newSlice) return false;
    }

    this.activeIndex = newIndex;
    this._updateOffset();
    this._onChange(this.activeIndex, this.viewOffset);
    return true;
  }

  private _updateOffset(): void {
    const sliceSize =
      this.effectiveOrientation === 'horizontal' ? this.rows : this.columns;
    const visibleSlices =
      this.effectiveOrientation === 'horizontal' ? this.columns : this.rows;
    const totalSlices = Math.ceil(this.totalCount / sliceSize);
    const maxOffset = Math.max(0, totalSlices - visibleSlices);

    const currentSlice = Math.floor(this.activeIndex / sliceSize);
    let offset = this.viewOffset;
    const positionInView = currentSlice - offset;

    if (positionInView < this.threshold) {
      offset = Math.max(0, currentSlice - this.threshold);
    } else if (positionInView > visibleSlices - 1 - this.threshold) {
      offset = Math.min(
        maxOffset,
        currentSlice - (visibleSlices - 1 - this.threshold),
      );
    }

    this.viewOffset = offset;
  }
}

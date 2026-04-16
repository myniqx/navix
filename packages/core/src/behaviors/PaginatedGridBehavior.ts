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

  onChange: ((activeIndex: number, viewOffset: number) => void) | null = null;
  onChildRegistered?: ((child: FocusNode) => void) | undefined;
  onChildUnregistered?: ((child: FocusNode) => void) | undefined;
  onBlurred?: ((child: FocusNode) => void) | undefined;
  onFocus?: ((child: FocusNode) => void) | undefined;

  constructor(
    node: FocusNode,
    orientation: PaginatedGridOrientation,
    totalCount: number,
    rows: number,
    columns: number,
    threshold: number,
  ) {
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
      // Columns are the pagination axis, rows are fixed per column
      // up/down = move within same column (±1)
      // left/right = move to prev/next column (±rows)
      if (event.action === 'up') return this._moveTo(this.activeIndex - 1, 'cross');
      if (event.action === 'down') return this._moveTo(this.activeIndex + 1, 'cross');
      if (event.action === 'left') return this._moveTo(this.activeIndex - this.rows, 'main');
      if (event.action === 'right') return this._moveTo(this.activeIndex + this.rows, 'main');
    } else {
      // Rows are the pagination axis, columns are fixed per row
      // left/right = move within same row (±1)
      // up/down = move to prev/next row (±columns)
      if (event.action === 'left') return this._moveTo(this.activeIndex - 1, 'cross');
      if (event.action === 'right') return this._moveTo(this.activeIndex + 1, 'cross');
      if (event.action === 'up') return this._moveTo(this.activeIndex - this.columns, 'main');
      if (event.action === 'down') return this._moveTo(this.activeIndex + this.columns, 'main');
    }

    return false;
  };

  // axis: 'main' = pagination direction, 'cross' = within a page slice
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
    // Page slice = one column (horizontal) or one row (vertical)
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

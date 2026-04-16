import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export type PaginatedListOrientation = 'horizontal' | 'vertical';

export class PaginatedListBehavior implements IFocusNodeBehavior {
  totalCount: number;
  visibleCount: number;
  threshold: number;
  activeIndex: number = 0;
  viewOffset: number = 0;

  onChange: ((activeIndex: number, viewOffset: number) => void) | null = null;
  onChildRegistered?: ((child: FocusNode) => void) | undefined;
  onChildUnregistered?: ((child: FocusNode) => void) | undefined;

  constructor(
    node: FocusNode,
    orientation: PaginatedListOrientation,
    totalCount: number,
    visibleCount: number,
    threshold: number,
  ) {
    this.totalCount = totalCount;
    this.visibleCount = visibleCount;
    this.threshold = threshold;
    node.behavior = this;

    const prev = orientation === 'horizontal' ? 'left' : 'up';
    const next = orientation === 'horizontal' ? 'right' : 'down';

    node.onEvent = (event: NavEvent): boolean => {
      if (event.type !== 'press') return false;

      if (event.action === prev) return this._moveTo(this.activeIndex - 1);
      if (event.action === next) return this._moveTo(this.activeIndex + 1);

      return false;
    };
  }

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

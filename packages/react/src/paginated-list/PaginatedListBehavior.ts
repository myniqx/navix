import type { FocusNode } from '../core/FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../core/types';

export type PaginatedListOrientation = 'horizontal' | 'vertical';

const MIN_VISIBLE_COUNT = 2;

export class PaginatedListBehavior implements IFocusNodeBehavior {
  totalCount: number;
  activeIndex: number = 0;
  viewOffset: number = 0;
  scrollMode: boolean = false;

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
  private _scrollEnter: string;
  private _scrollExit: string;
  private _onChange: (newIndex: number, newOffset: number) => void;
  private _onScrollModeChange: ((scrollMode: boolean) => void) | null = null;
  private _keyToIndex: (key: string) => number;
  private _isItemDisabled?: (index: number) => boolean;

  set onChange(fn: (newIndex: number, newOffset: number) => void) {
    this._onChange = fn;
  }

  set onScrollModeChange(fn: (scrollMode: boolean) => void) {
    this._onScrollModeChange = fn;
  }

  constructor(
    node: FocusNode,
    orientation: PaginatedListOrientation,
    totalCount: number,
    visibleCount: number,
    threshold: number,
    onChange: (newIndex: number, newOffset: number) => void,
    keyToIndex: (key: string) => number,
    isItemDisabled?: (index: number) => boolean,
  ) {
    this._node = node;
    this.totalCount = totalCount;
    this.visibleCount = visibleCount;
    this.threshold = threshold;
    this._prev = orientation === 'horizontal' ? 'left' : 'up';
    this._next = orientation === 'horizontal' ? 'right' : 'down';
    this._scrollEnter = orientation === 'horizontal' ? 'down' : 'right';
    this._scrollExit = orientation === 'horizontal' ? 'up' : 'left';
    this._onChange = onChange;
    this._keyToIndex = keyToIndex;
    this._isItemDisabled = isItemDisabled;
    this.activeIndex = this._findFirst();
  }

  canReceiveFocus = (): boolean => {
    if (this.totalCount === 0) return false;
    if (!this._isItemDisabled) return true;
    for (let i = 0; i < this.totalCount; i++) {
      if (!this._isItemDisabled(i)) return true;
    }
    return false;
  };

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;

    if (this.scrollMode) {
      if (event.action === this._prev) {
        return this._scrollPage(-1);
      }
      if (event.action === this._next) {
        return this._scrollPage(1);
      }
      if (event.action === this._scrollExit) {
        this._setScrollMode(false);
        return true;
      }
      if (event.action === this._scrollEnter) {
        this._setScrollMode(false);
        return false;
      }
      return false;
    }

    if (event.action === this._prev) {
      const next = this._findNext(this.activeIndex, -1);
      return next !== null ? this._moveTo(next) : false;
    }
    if (event.action === this._next) {
      const next = this._findNext(this.activeIndex, 1);
      return next !== null ? this._moveTo(next) : false;
    }
    if (event.action === this._scrollEnter) {
      this._setScrollMode(true);
      return true;
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

  jumpToIndex(index: number): void {
    if (index < 0 || index >= this.totalCount) return;
    let target = index;
    if (this._isItemDisabled?.(index)) {
      const fwd = this._findNext(index, 1);
      const bwd = this._findNext(index, -1);
      if (fwd === null && bwd === null) return;
      target = fwd !== null ? fwd : bwd!;
    }
    this.activeIndex = target;
    this._updateOffset();
  }

  onChildRegistered = (child: FocusNode): void => {
    if (this._keyToIndex(child.key) === -1) {
      console.warn(
        `[NavixPaginatedList:${this._node.key}] Registered child key "${child.key}" does not match any key produced by keyForItem. ` +
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

  private _setScrollMode(value: boolean): void {
    this.scrollMode = value;
    this._onScrollModeChange?.(value);
  }

  get maxOffset(): number {
    return Math.max(0, this.totalCount - this.visibleCount);
  }

  setPage(page: number): void {
    const newOffset = Math.max(0, Math.min(page, this.maxOffset));
    if (newOffset === this.viewOffset) return;

    const newActiveIndex = Math.min(
      Math.max(newOffset + (this.activeIndex - this.viewOffset), 0),
      this.totalCount - 1,
    );

    this.viewOffset = newOffset;
    this.activeIndex = newActiveIndex;
    this._onChange(newActiveIndex, newOffset);
  }

  private _scrollPage(dir: 1 | -1): boolean {
    this.setPage(this.viewOffset + dir * this.visibleCount);
    return true;
  }

  private _findFirst(): number {
    if (!this._isItemDisabled) return 0;
    for (let i = 0; i < this.totalCount; i++) {
      if (!this._isItemDisabled(i)) return i;
    }
    return 0;
  }

  private _findNext(from: number, dir: 1 | -1): number | null {
    let i = from + dir;
    while (i >= 0 && i < this.totalCount) {
      if (!this._isItemDisabled?.(i)) return i;
      i += dir;
    }
    return null;
  }

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

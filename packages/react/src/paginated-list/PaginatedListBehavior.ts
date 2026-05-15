import type { FocusNode } from '../core/FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../core/types';

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
  private _scrollEnter: string;
  private _scrollExit: string;
  private _scrollbarKey: string | null;
  private _onChange: (newIndex: number, newOffset: number, refocusItem: boolean) => void;
  private _keyToIndex: (key: string) => number;
  private _isItemDisabled?: (index: number) => boolean;

  set onChange(fn: (newIndex: number, newOffset: number, refocusItem: boolean) => void) {
    this._onChange = fn;
  }

  constructor(
    node: FocusNode,
    orientation: PaginatedListOrientation,
    totalCount: number,
    visibleCount: number,
    threshold: number,
    onChange: (newIndex: number, newOffset: number, refocusItem: boolean) => void,
    keyToIndex: (key: string) => number,
    isItemDisabled?: (index: number) => boolean,
    scrollbarKey: string | null = null,
  ) {
    this._node = node;
    this.totalCount = totalCount;
    this.visibleCount = visibleCount;
    this.threshold = threshold;
    this._prev = orientation === 'horizontal' ? 'left' : 'up';
    this._next = orientation === 'horizontal' ? 'right' : 'down';
    this._scrollEnter = orientation === 'horizontal' ? 'down' : 'right';
    this._scrollExit = orientation === 'horizontal' ? 'up' : 'left';
    this._scrollbarKey = scrollbarKey;
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

  private _isScrollbarActive(): boolean {
    if (this._scrollbarKey === null) return false;
    const active = this._node.getActiveChild();
    return active !== null && active.key === this._scrollbarKey;
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;

    // Scrollbar child is active — only handle scrollExit here. Other events
    // are consumed by the scrollbar itself; if the scrollbar returned false
    // for scrollExit, return focus to the active item.
    if (this._isScrollbarActive()) {
      if (event.action === this._scrollExit) {
        this._focusActiveItem();
        return true;
      }
      return false;
    }

    // Active item is focused — same prev/next item nav as before.
    if (event.action === this._prev) {
      const next = this._findNext(this.activeIndex, -1);
      return next !== null ? this._moveTo(next) : false;
    }
    if (event.action === this._next) {
      const next = this._findNext(this.activeIndex, 1);
      return next !== null ? this._moveTo(next) : false;
    }
    if (event.action === this._scrollEnter) {
      return this._focusScrollbar();
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
    if (this._scrollbarKey !== null && child.key === this._scrollbarKey) {
      // Keep scrollbar pinned at index 0 of the children list so it remains
      // reachable via a known position and never alters item index math.
      const others = this._node.children.filter((c) => c !== child);
      this._node.reorderChildren([child, ...others]);
      return;
    }

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
    if (this._scrollbarKey !== null && child.key === this._scrollbarKey) return;
    const idx = this._keyToIndex(child.key);
    if (idx !== -1) this.activeIndex = idx;
  };

  private _focusScrollbar(): boolean {
    if (this._scrollbarKey === null) return false;
    const scrollbar = this._node.children.find((c) => c.key === this._scrollbarKey);
    if (!scrollbar) return false;
    scrollbar.requestFocus();
    return true;
  }

  private _focusActiveItem(): void {
    // Find item child at activeIndex by looking up its key, then focus it.
    const items = this._node.children.filter(
      (c) => c.key !== this._scrollbarKey,
    );
    for (const item of items) {
      if (this._keyToIndex(item.key) === this.activeIndex) {
        this._node.focusChild(item.id);
        return;
      }
    }
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
    // Scrollbar-driven page change: do not pull focus back to the item, the
    // scrollbar (or the caller) keeps focus.
    this._onChange(newActiveIndex, newOffset, false);
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
    this._onChange(this.activeIndex, this.viewOffset, true);
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

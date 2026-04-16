import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export type ListOrientation = 'horizontal' | 'vertical';

export class ListBehavior implements IFocusNodeBehavior {
  private prev;
  private next;

  constructor(
    private node: FocusNode,
    orientation: ListOrientation
  ) {
    node.behavior = this;
    this.prev = orientation === 'horizontal' ? 'left' : 'up';
    this.next = orientation === 'horizontal' ? 'right' : 'down';
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;

    if (event.action === this.prev) return this.node.focusPrev();
    if (event.action === this.next) return this.node.focusNext();

    return false;
  };
}

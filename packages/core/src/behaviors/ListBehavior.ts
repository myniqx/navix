import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export type ListOrientation = 'horizontal' | 'vertical';

export class ListBehavior implements IFocusNodeBehavior {
  constructor(node: FocusNode, orientation: ListOrientation) {
    node.behavior = this;
    const prev = orientation === 'horizontal' ? 'left' : 'up';
    const next = orientation === 'horizontal' ? 'right' : 'down';

    node.onEvent = (event: NavEvent): boolean => {
      if (event.type !== 'press') return false;

      if (event.action === prev) return node.focusPrev();
      if (event.action === next) return node.focusNext();

      return false;
    };
  }
}

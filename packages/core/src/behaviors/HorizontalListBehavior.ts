import type { FocusNode } from '../FocusNode';
import type { NavEvent } from '../types';

export class HorizontalListBehavior {
  constructor(node: FocusNode) {
    node.onEvent = (event: NavEvent): boolean => {
      if (event.type !== 'press') return false;

      if (event.action === 'left') return node.focusPrev();
      if (event.action === 'right') return node.focusNext();

      return false;
    };
  }
}

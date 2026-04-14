import type { FocusNode } from '../FocusNode';
import type { NavEvent } from '../types';

export class VerticalListBehavior {
  constructor(node: FocusNode) {
    node.onEvent = (event: NavEvent): boolean => {
      if (event.type !== 'press') return false;

      if (event.action === 'up') return node.focusPrev();
      if (event.action === 'down') return node.focusNext();

      return false;
    };
  }
}

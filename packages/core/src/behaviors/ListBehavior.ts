import type { FocusNode } from '../FocusNode';
import type { NavEvent } from '../types';

export type ListOrientation = 'horizontal' | 'vertical';

export class ListBehavior {
  constructor(node: FocusNode, orientation: ListOrientation) {
    const prev = orientation === 'horizontal' ? 'left' : 'up';
    const next = orientation === 'horizontal' ? 'right' : 'down';

    node.onEvent = (event: NavEvent): boolean => {
      if (event.type !== 'press') return false;

      if (event.action === prev) {
        // Wrap around: if focusPrev fails (already at first), jump to last
        if (!node.focusPrev()) {
          const last = node.children[node.children.length - 1];
          if (last) return node.focusChild(last.id);
        }
        return true;
      }

      if (event.action === next) {
        // Wrap around: if focusNext fails (already at last), jump to first
        if (!node.focusNext()) {
          const first = node.children[0];
          if (first) return node.focusChild(first.id);
        }
        return true;
      }

      return false;
    };
  }
}

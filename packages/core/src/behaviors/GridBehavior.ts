import type { FocusNode } from '../FocusNode';
import type { NavEvent } from '../types';

export class GridBehavior {
  constructor(node: FocusNode, columns: number) {
    node.onEvent = (event: NavEvent): boolean => {
      if (event.type !== 'press') return false;

      const idx = node.children.findIndex((c) => c.id === node.activeChildId);
      if (idx === -1) return false;

      if (event.action === 'left')  return node.focusPrev();
      if (event.action === 'right') return node.focusNext();

      if (event.action === 'up') {
        const target = idx - columns;
        if (target < 0) return false;
        return node.focusChild(node.children[target]!.id);
      }

      if (event.action === 'down') {
        const target = idx + columns;
        if (target >= node.children.length) return false;
        return node.focusChild(node.children[target]!.id);
      }

      return false;
    };
  }
}

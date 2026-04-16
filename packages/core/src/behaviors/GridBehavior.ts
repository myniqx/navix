import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export class GridBehavior implements IFocusNodeBehavior {
  columns: number;

  onRegister(): void { }

  constructor(node: FocusNode, columns: number) {
    this.columns = columns;
    node.behavior = this;
    node.onEvent = (event: NavEvent): boolean => {
      if (event.type !== 'press') return false;

      const idx = node.children.findIndex((c) => c.id === node.activeChildId);
      if (idx === -1) return false;

      if (event.action === 'left') {
        if (idx % this.columns === 0) return false;
        return node.focusPrev();
      }
      if (event.action === 'right') {
        if (idx % this.columns === this.columns - 1) return false;
        if (idx === node.children.length - 1) return false;
        return node.focusNext();
      }

      if (event.action === 'up') {
        const target = idx - this.columns;
        if (target < 0) return false;
        return node.focusChild(node.children[target]!.id);
      }

      if (event.action === 'down') {
        const target = idx + this.columns;
        if (target >= node.children.length) return false;
        return node.focusChild(node.children[target]!.id);
      }

      return false;
    };
  }
  onUnregister?: (() => void) | undefined;
  collapse?: (() => void) | undefined;
  expand?: (() => void) | undefined;
  isTrapped?: boolean | undefined;
}

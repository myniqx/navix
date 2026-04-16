import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export class GridBehavior implements IFocusNodeBehavior {

  onRegister(): void { }

  constructor(
    private node: FocusNode,
    public columns: number
  ) {
    this.columns = columns;
    node.behavior = this;
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;

    const idx = this.node.children.findIndex((c) => c.id === this.node.activeChildId);
    if (idx === -1) return false;

    if (event.action === 'left') {
      if (idx % this.columns === 0) return false;
      return this.node.focusPrev();
    }
    if (event.action === 'right') {
      if (idx % this.columns === this.columns - 1) return false;
      if (idx === this.node.children.length - 1) return false;
      return this.node.focusNext();
    }

    if (event.action === 'up') {
      const target = idx - this.columns;
      if (target < 0) return false;
      return this.node.focusChild(this.node.children[target]!.id);
    }

    if (event.action === 'down') {
      const target = idx + this.columns;
      if (target >= this.node.children.length) return false;
      return this.node.focusChild(this.node.children[target]!.id);
    }

    return false;
  };

  onUnregister?: (() => void) | undefined;
  collapse?: (() => void) | undefined;
  expand?: (() => void) | undefined;
  isTrapped?: boolean | undefined;
}

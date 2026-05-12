import type { FocusNode } from '../core/FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../core/types';

export class GridBehavior implements IFocusNodeBehavior {
  onRegister(): void {}

  constructor(
    private node: FocusNode,
    public columns: number,
  ) {
    this.columns = columns;
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;

    const idx = this.node.children.findIndex(
      (c) => c.id === this.node.activeChildId,
    );
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
      let target = idx - this.columns;
      while (target >= 0) {
        if (this.node.children[target]!.canReceiveFocus()) {
          return this.node.focusChild(this.node.children[target]!.id);
        }
        target -= this.columns;
      }
      return false;
    }

    if (event.action === 'down') {
      let target = idx + this.columns;
      while (target < this.node.children.length) {
        if (this.node.children[target]!.canReceiveFocus()) {
          return this.node.focusChild(this.node.children[target]!.id);
        }
        target += this.columns;
      }
      return false;
    }

    return false;
  };

  onUnregister?: (() => void) | undefined;
  collapse?: (() => void) | undefined;
  expand?: (() => void) | undefined;
  isTrapped?: boolean | undefined;
}

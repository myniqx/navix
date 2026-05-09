import type { FocusNode } from '../core/FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../core/types';

export class ExpandableBehavior implements IFocusNodeBehavior {
  isExpanded: boolean = false;

  get isTrapped(): boolean {
    return this.isExpanded;
  }

  onChildRegistered?: ((child: FocusNode) => void) | undefined;
  onChildUnregistered?: ((child: FocusNode) => void) | undefined;
  onBlurred?: ((child: FocusNode) => void) | undefined;
  onFocus?: ((child: FocusNode) => void) | undefined;

  private _node: FocusNode;
  private _onChange: (expanded: boolean) => void;

  constructor(node: FocusNode, onChange: (expanded: boolean) => void) {
    this._node = node;
    this._onChange = onChange;
  }

  onEvent = (e: NavEvent): boolean => {
    if (!this.isExpanded) {
      if (e.action === 'enter' && e.type === 'press') {
        this.expand();
        return true;
      }
      return false;
    }

    if (e.action === 'back' && e.type === 'press') {
      this.collapse();
      return true;
    }

    return true;
  };

  onUnregister(): void {
    this.isExpanded = false;
  }

  expand(): void {
    if (this.isExpanded) return;
    const ancestors = this._getAncestors();
    this._walkCollapse(this._node.getRoot(), ancestors);
    this._node.requestFocus();
    this.isExpanded = true;
    this._onChange(true);
  }

  collapse(): void {
    if (!this.isExpanded) return;
    this.isExpanded = false;
    this._onChange(false);
  }

  private _getAncestors(): Set<FocusNode> {
    const set = new Set<FocusNode>();
    let current = this._node.parent;
    while (current !== null) {
      set.add(current);
      current = current.parent;
    }
    return set;
  }

  private _walkCollapse(current: FocusNode, ancestors: Set<FocusNode>): void {
    if (current !== this._node && !ancestors.has(current)) {
      current.behavior?.collapse?.();
    }
    for (const child of current.children) {
      this._walkCollapse(child, ancestors);
    }
  }
}

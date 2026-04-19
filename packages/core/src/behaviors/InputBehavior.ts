import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export class InputBehavior implements IFocusNodeBehavior {
  isEditing: boolean = false;

  get isTrapped(): boolean {
    return this.isEditing;
  }

  // Called whenever editing state changes. Assign from the adapter layer.
  onChange: ((editing: boolean) => void) | null = null;

  private _node: FocusNode;

  constructor(node: FocusNode) {
    this._node = node;
  }

  onEvent = (e: NavEvent): boolean => {
    if (!this.isEditing) {
      if (e.action === 'enter' && e.type === 'press') {
        this.startEditing();
        return true;
      }
      return false;
    }

    if ((e.action === 'back' || e.action === 'enter') && e.type === 'press') {
      this.stopEditing();
      return true;
    }

    // Editing: swallow all nav events — focus stays on this input.
    return true;
  };

  onUnregister(): void {
    this.isEditing = false;
  }

  startEditing(): void {
    if (this.isEditing) return;
    this._node.requestFocus();
    this.isEditing = true;
    this.onChange?.(true);
  }

  stopEditing(): void {
    if (!this.isEditing) return;
    this.isEditing = false;
    this.onChange?.(false);
  }
}

import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

export class InputBehavior implements IFocusNodeBehavior {
  isEditing: boolean = false;

  get isTrapped(): boolean {
    return this.isEditing;
  }

  private _node: FocusNode;
  private _onChange: (editing: boolean) => void;

  constructor(node: FocusNode, onChange: (editing: boolean) => void) {
    this._node = node;
    this._onChange = onChange;
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
    this._onChange(true);
  }

  stopEditing(): void {
    if (!this.isEditing) return;
    this.isEditing = false;
    this._onChange(false);
  }
}

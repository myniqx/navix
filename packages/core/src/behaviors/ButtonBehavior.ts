import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

interface ButtonHandlers {
  onPress?: () => void;
  onLongPress?: () => void;
  onDoublePress?: () => void;
}

export class ButtonBehavior implements IFocusNodeBehavior {
  constructor(
    node: FocusNode,
    private handlers: ButtonHandlers
  ) {
    node.behavior = this;
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.action !== 'enter') return false;

    if (event.type === 'press') { this.handlers.onPress?.(); return true; }
    if (event.type === 'longpress') { this.handlers.onLongPress?.(); return true; }
    if (event.type === 'doublepress') { this.handlers.onDoublePress?.(); return true; }

    return false;
  };
}

import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

interface ButtonHandlers {
  onPress?: () => void;
  onLongPress?: () => void;
  onDoublePress?: () => void;
}

export class ButtonBehavior implements IFocusNodeBehavior {
  constructor(node: FocusNode, handlers: ButtonHandlers) {
    node.behavior = this;
    node.onEvent = (event: NavEvent): boolean => {
      if (event.action !== 'enter') return false;

      if (event.type === 'press')       { handlers.onPress?.();       return true; }
      if (event.type === 'longpress')   { handlers.onLongPress?.();   return true; }
      if (event.type === 'doublepress') { handlers.onDoublePress?.(); return true; }

      return false;
    };
  }
}

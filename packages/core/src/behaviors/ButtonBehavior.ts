import type { FocusNode } from '../FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../types';

interface ButtonHandlers {
  onPress?: () => void;
  onLongPress?: () => void;
  onDoublePress?: () => void;
}

export class ButtonBehavior implements IFocusNodeBehavior {
  constructor(
    _node: FocusNode,
    private handlers: ButtonHandlers,
  ) {}

  onEvent = (event: NavEvent): boolean => {
    if (event.action !== 'enter') return false;

    if (event.type === 'press') {
      this.handlers.onPress?.();
      return true;
    }
    if (event.type === 'longPress') {
      this.handlers.onLongPress?.();
      return true;
    }
    if (event.type === 'doublePress') {
      this.handlers.onDoublePress?.();
      return true;
    }

    return false;
  };
}

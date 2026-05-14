import type { FocusNode } from '../core/FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../core/types';

export type StepperOrientation = 'horizontal' | 'vertical';
export type StepType = 'single' | 'long' | 'double';

interface StepperHandlers {
  onIncrease?: (type: StepType) => void;
  onDecrease?: (type: StepType) => void;
  long: boolean;
  double: boolean;
  orientation: StepperOrientation;
}

export class StepperBehavior implements IFocusNodeBehavior {
  private handlers: StepperHandlers;

  constructor(_node: FocusNode, handlers: StepperHandlers) {
    this.handlers = handlers;
  }

  update(handlers: StepperHandlers) {
    this.handlers = handlers;
  }

  onEvent = (event: NavEvent): boolean => {
    const { orientation, long, double } = this.handlers;
    const prev = orientation === 'horizontal' ? 'left' : 'up';
    const next = orientation === 'horizontal' ? 'right' : 'down';

    if (event.action !== prev && event.action !== next) return false;

    if (event.type === 'longPress' && !long) return false;
    if (event.type === 'doublePress' && !double) return false;

    const type: StepType =
      event.type === 'longPress'
        ? 'long'
        : event.type === 'doublePress'
          ? 'double'
          : 'single';

    if (event.action === next) {
      this.handlers.onIncrease?.(type);
    } else {
      this.handlers.onDecrease?.(type);
    }

    return true;
  };
}

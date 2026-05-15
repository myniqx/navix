import type { FocusNode } from '../core/FocusNode';
import type { NavEvent, IFocusNodeBehavior } from '../core/types';

export type ScrollOrientation = 'horizontal' | 'vertical';

interface ScrollHandlers {
  orientation: ScrollOrientation;
  onDelta?: (delta: number) => void;
  onPageDelta?: (delta: number) => void;
}

export class ScrollBehavior implements IFocusNodeBehavior {
  private handlers: ScrollHandlers;

  constructor(_node: FocusNode, handlers: ScrollHandlers) {
    this.handlers = handlers;
  }

  update(handlers: ScrollHandlers) {
    this.handlers = handlers;
  }

  onEvent = (event: NavEvent): boolean => {
    if (event.type !== 'press') return false;

    const { orientation } = this.handlers;
    const prev = orientation === 'horizontal' ? 'left' : 'up';
    const next = orientation === 'horizontal' ? 'right' : 'down';

    if (event.action === prev) {
      this.handlers.onDelta?.(-1);
      return true;
    }
    if (event.action === next) {
      this.handlers.onDelta?.(1);
      return true;
    }
    if (event.action === 'program_up') {
      this.handlers.onPageDelta?.(-1);
      return true;
    }
    if (event.action === 'program_down') {
      this.handlers.onPageDelta?.(1);
      return true;
    }

    return false;
  };
}

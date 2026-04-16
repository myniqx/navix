import type { FocusNode } from './FocusNode';

export interface NavEvent {
  action: string;
  type: 'press' | 'longpress' | 'doublepress';
}

/**
 * Interface that all behavior classes implement.
 * Behaviors attach themselves to a FocusNode via node.behavior = this.
 * All methods are optional — implement only what the behavior needs.
 */
export interface IFocusNodeBehavior {
  onRegister?: () => void;
  onUnregister?: () => void;
  collapse?: () => void;
  expand?: () => void;
  readonly isTrapped?: boolean;
  onChildRegistered?: (child: FocusNode) => void;
  onChildUnregistered?: (child: FocusNode) => void;
  onFocus?: (child: FocusNode) => void;
  onBlurred?: (child: FocusNode) => void;
  onEvent: (event: NavEvent) => boolean
}

export interface ActionConfig {
  keys: string[];
  longpress?: boolean;
  longpressMs?: number;
  doublepress?: boolean;
  doublepressMs?: number;
}

export interface InputConfig {
  actions: Record<string, ActionConfig>;
}

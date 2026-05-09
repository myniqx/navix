import type { FocusNode } from './FocusNode';

export interface NavEvent {
  action: string;
  type: 'press' | 'longPress' | 'doublePress';
}

export interface IFocusNodeBehavior {
  onRegister?: () => void;
  onUnregister?: () => void;
  collapse?: () => void;
  expand?: () => void;
  readonly isTrapped?: boolean;
  onChildRegistered?: (child: FocusNode) => void;
  onChildUnregistered?: (child: FocusNode) => void;
  onActiveChildChanged?: (child: FocusNode) => void;
  onFocus?: (child: FocusNode) => void;
  onBlurred?: (child: FocusNode) => void;
  onEvent: (event: NavEvent) => boolean;
  onConsumedByChild?: (event: NavEvent) => void;
}

export interface ActionConfig {
  keys?: string[];
  keyCodes?: number[];
  longPress?: boolean;
  longPressMs?: number;
  doublePress?: boolean;
  doublePressMs?: number;
}

export interface InputConfig {
  actions: Record<string, ActionConfig>;
}

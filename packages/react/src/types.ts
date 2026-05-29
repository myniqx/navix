import type { NavEvent } from './core/types';

export interface UseFocusableCallbacks {
  onFocus?: (key: string) => void;
  onBlurred?: (key: string) => void;
  onRegister?: (key: string) => void;
  onUnregister?: (key: string) => void;
  onEvent?: (event: NavEvent) => boolean;
  disabled?: boolean;
  focusOnRegister?: boolean;
}


export interface BaseComponentProps extends UseFocusableCallbacks {
  fKey: string;
}



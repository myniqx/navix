import type { NavEvent } from './core/types';

export interface BaseComponentProps {
  fKey: string;
  onFocus?: (key: string) => void;
  onBlurred?: (key: string) => void;
  onRegister?: (key: string) => void;
  onUnregister?: (key: string) => void;
  onEvent?: (event: NavEvent) => boolean;
}

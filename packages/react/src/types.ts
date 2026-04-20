import type { NavEvent } from '@navix/core';

export interface BaseComponentProps {
  fKey: string;
  onFocus?: (key: string) => void;
  onBlurred?: (key: string) => void;
  onRegister?: (key: string) => void;
  onUnregister?: (key: string) => void;
  onEvent?: (event: NavEvent) => boolean;
}

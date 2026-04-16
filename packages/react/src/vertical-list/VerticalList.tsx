import { type ReactNode } from 'react';
import { ListBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useFocusable } from '../useFocusable';
import type { BaseComponentProps } from '../types';

interface VerticalListProps extends BaseComponentProps {
  children: ReactNode;
}

export function VerticalList({ fKey, onFocus, onBlurred, onRegister, onUnregister, children }: VerticalListProps) {
  const { FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister },
    (node: FocusNode) => new ListBehavior(node, 'vertical'),
  );
  return <FocusProvider>{children}</FocusProvider>;
}

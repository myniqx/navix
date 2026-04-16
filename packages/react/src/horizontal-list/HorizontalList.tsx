import { type ReactNode } from 'react';
import { ListBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useFocusable } from '../useFocusable';
import type { BaseComponentProps } from '../types';

interface HorizontalListProps extends BaseComponentProps {
  children: ReactNode;
}

export function HorizontalList({ fKey, onFocus, onBlurred, onRegister, onUnregister, children }: HorizontalListProps) {
  const { FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister },
    (node: FocusNode) => new ListBehavior(node, 'horizontal'),
  );
  return <FocusProvider>{children}</FocusProvider>;
}

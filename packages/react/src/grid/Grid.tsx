import { useRef, type ReactNode } from 'react';
import { GridBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useFocusable } from '../useFocusable';
import type { BaseComponentProps } from '../types';

interface GridProps extends BaseComponentProps {
  columns: number;
  children: ReactNode;
}

export function Grid({ fKey, columns, onFocus, onBlurred, onRegister, onUnregister, children }: GridProps) {
  const behaviorRef = useRef<GridBehavior | null>(null);

  const { FocusProvider } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister },
    (node: FocusNode) => {
      behaviorRef.current = new GridBehavior(node, columns);
      return behaviorRef.current;
    },
  );

  if (behaviorRef.current) {
    behaviorRef.current.columns = columns;
  }

  return <FocusProvider>{children}</FocusProvider>;
}

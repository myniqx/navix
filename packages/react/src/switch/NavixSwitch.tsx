import type { ReactNode } from 'react';

import { NavixButton } from '../button';
import type { BaseComponentProps } from '../types';

type SwitchRenderFn = (checked: boolean, focused: boolean) => ReactNode;

interface SwitchProps extends BaseComponentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children: SwitchRenderFn;
}

export function NavixSwitch({
  fKey,
  checked,
  onChange,
  disabled,
  children,
  ...rest
}: SwitchProps) {
  return (
    <NavixButton fKey={fKey} onClick={() => onChange(!checked)} disabled={disabled} {...rest}>
      {({ focused }) => children(checked, focused)}
    </NavixButton>
  );
}

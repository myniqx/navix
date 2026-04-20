import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { InputBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useFocusable } from '../useFocusable';
import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';

export interface InputRenderProps {
  value: string;
  focused: boolean;
  editing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  stopEditing: () => void;
}

type InputRenderFn = (props: InputRenderProps) => ReactNode;

interface InputProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
  focusedStyle?: CSSProperties;
  editingStyle?: CSSProperties;
  className?: string;
  focusedClassName?: string;
  editingClassName?: string;
  children?: InputRenderFn;
}

export function Input({
  fKey,
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  onEvent,
  value,
  onChange,
  style,
  focusedStyle,
  editingStyle,
  className,
  focusedClassName,
  editingClassName,
  children,
}: InputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { focused, focusSelf, FocusProvider, node } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (n: FocusNode) => new InputBehavior(n),
  );

  const behavior = node.behavior as InputBehavior;
  behavior.onChange = setIsEditing;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.blur();
    }
  }, [isEditing]);

  const stopEditing = () => behavior.stopEditing();

  const mergedStyle: CSSProperties = {
    ...style,
    ...(focused ? focusedStyle : undefined),
    ...(isEditing ? editingStyle : undefined),
  };

  const mergedClassName = mergeClassName(
    className,
    focused ? focusedClassName : undefined,
    isEditing ? editingClassName : undefined,
  );

  const renderProps: InputRenderProps = {
    value,
    focused,
    editing: isEditing,
    inputRef,
    stopEditing,
  };

  return (
    <FocusProvider>
      <div
        style={mergedStyle}
        className={mergedClassName || undefined}
        onMouseEnter={focusSelf}
        onClick={() => {
          if (!isEditing) behavior.startEditing();
        }}
      >
        {children ? (
          children(renderProps)
        ) : (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </FocusProvider>
  );
}

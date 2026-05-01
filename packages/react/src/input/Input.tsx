import { InputBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';

import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';

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
  placeholder?: string;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  children?: InputRenderFn;
}

const DEFAULT_FOCUSED_STYLE: CSSProperties = {
  outline: '2px solid rgba(255,255,255,0.25)',
};

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
  placeholder,
  type,
  maxLength,
  autoComplete,
  inputMode,
  children,
}: InputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { focused, focusSelf, FocusProvider, node } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent },
    (n: FocusNode) => new InputBehavior(n, setIsEditing),
  );

  const behavior = node.behavior as InputBehavior;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.blur();
    }
  }, [isEditing]);

  const stopEditing = useCallback(() => behavior.stopEditing(), [behavior]);

  const mergedStyle = useMemo<CSSProperties>(
    () => ({
      ...style,
      ...(focused
        ? (focusedStyle ?? (!focusedClassName ? DEFAULT_FOCUSED_STYLE : undefined))
        : undefined),
      ...(isEditing ? editingStyle : undefined),
    }),
    [style, focusedStyle, focusedClassName, editingStyle, focused, isEditing],
  );

  const mergedClassName = useMemo(
    () =>
      mergeClassName(
        className,
        focused ? focusedClassName : undefined,
        isEditing ? editingClassName : undefined,
      ),
    [className, focusedClassName, editingClassName, focused, isEditing],
  );

  const renderProps = useMemo<InputRenderProps>(
    () => ({ value, focused, editing: isEditing, inputRef, stopEditing }),
    [value, focused, isEditing, stopEditing],
  );

  const handleClick = useCallback(() => {
    if (!isEditing) behavior.startEditing();
  }, [isEditing, behavior]);

  return (
    <FocusProvider>
      <div
        data-navix-node-id={node.id}
        style={mergedStyle}
        className={mergedClassName || undefined}
        onMouseEnter={focusSelf}
        onClick={handleClick}
      >
        {children ? (
          children(renderProps)
        ) : (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            type={type}
            maxLength={maxLength}
            autoComplete={autoComplete}
            inputMode={inputMode}
          />
        )}
      </div>
    </FocusProvider>
  );
}

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type React from 'react';

import type { FocusNode } from '../core/FocusNode';
import { mergeClassName } from '../mergeClassName';
import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';
import { StepperBehavior } from './StepperBehavior';
import type { StepperOrientation, StepType } from './StepperBehavior';

export type { StepperOrientation, StepType };

export type StepperStatus = 'natural' | 'increase' | 'decrease';

type StepperRenderFn = (props: {
  focused: boolean;
  status: StepperStatus;
}) => ReactNode;

interface StepperProps extends BaseComponentProps {
  orientation: StepperOrientation;
  onIncrease?: (type: StepType) => void;
  onDecrease?: (type: StepType) => void;
  long?: boolean;
  double?: boolean;
  feedbackTimeout?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
  focusedStyle?: React.CSSProperties;
  className?: string;
  focusedClassName?: string;
  trackStyle?: React.CSSProperties;
  thumbStyle?: React.CSSProperties;
  children?: ReactNode | StepperRenderFn;
}

export function NavixStepper({
  fKey,
  orientation,
  onIncrease,
  onDecrease,
  long = false,
  double = false,
  feedbackTimeout = 300,
  disabled,
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  onEvent,
  style,
  focusedStyle,
  className,
  focusedClassName,
  trackStyle,
  thumbStyle,
  children,
}: StepperProps) {
  const [status, setStatus] = useState<StepperStatus>('natural');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onIncreaseRef = useRef(onIncrease);
  const onDecreaseRef = useRef(onDecrease);
  onIncreaseRef.current = onIncrease;
  onDecreaseRef.current = onDecrease;

  const triggerFeedback = useCallback((s: 'increase' | 'decrease') => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setStatus(s);
    timerRef.current = setTimeout(() => {
      setStatus('natural');
      timerRef.current = null;
    }, feedbackTimeout);
  }, [feedbackTimeout]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const { node, directlyFocused } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent, disabled },
    (n: FocusNode) =>
      new StepperBehavior(n, {
        orientation,
        long,
        double,
        onIncrease: (type) => {
          onIncreaseRef.current?.(type);
          triggerFeedback('increase');
        },
        onDecrease: (type) => {
          onDecreaseRef.current?.(type);
          triggerFeedback('decrease');
        },
      }),
  );

  const behavior = node.behavior as StepperBehavior;
  useEffect(() => {
    behavior.update({ orientation, long, double,
      onIncrease: (type) => {
        onIncreaseRef.current?.(type);
        triggerFeedback('increase');
      },
      onDecrease: (type) => {
        onDecreaseRef.current?.(type);
        triggerFeedback('decrease');
      },
    });
  }, [behavior, orientation, long, double, triggerFeedback]);

  const mergedStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
      ...(directlyFocused ? focusedStyle : undefined),
    }),
    [style, focusedStyle, directlyFocused],
  );

  const mergedClassName = useMemo(
    () => mergeClassName(className, directlyFocused ? focusedClassName : undefined),
    [className, focusedClassName, directlyFocused],
  );

  const defaultTrackStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'relative',
      width: orientation === 'horizontal' ? '100%' : 8,
      height: orientation === 'horizontal' ? 8 : '100%',
      borderRadius: 4,
      backgroundColor: directlyFocused ? '#555' : '#333',
      ...trackStyle,
    }),
    [orientation, directlyFocused, trackStyle],
  );

  const defaultThumbStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'absolute',
      width: orientation === 'horizontal' ? 16 : '100%',
      height: orientation === 'horizontal' ? '100%' : 16,
      borderRadius: 4,
      backgroundColor:
        status === 'increase'
          ? '#4fc3f7'
          : status === 'decrease'
            ? '#ef9a9a'
            : directlyFocused
              ? '#fff'
              : '#888',
      transition: 'background-color 0.15s ease',
      ...(orientation === 'horizontal'
        ? { left: status === 'increase' ? '100%' : status === 'decrease' ? 0 : '50%',
            transform: 'translateX(-50%)' }
        : { top: status === 'increase' ? '100%' : status === 'decrease' ? 0 : '50%',
            transform: 'translateY(-50%)' }),
      ...thumbStyle,
    }),
    [orientation, directlyFocused, status, thumbStyle],
  );

  let rendered: ReactNode;
  if (typeof children === 'function') {
    rendered = (children as StepperRenderFn)({ focused: directlyFocused, status });
  } else if (children != null) {
    rendered = children;
  } else {
    rendered = (
      <div style={defaultTrackStyle}>
        <div style={defaultThumbStyle} />
      </div>
    );
  }

  return (
    <div
      data-navix-node-id={node.id}
      style={mergedStyle}
      className={mergedClassName || undefined}
    >
      {rendered}
    </div>
  );
}

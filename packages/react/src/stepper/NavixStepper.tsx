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

export type StepperRenderFn = (props: {
  focused: boolean;
  status: StepperStatus;
  value: number;
  min: number;
  max: number;
  step: number;
}) => ReactNode;

interface StepperProps extends BaseComponentProps {
  orientation: StepperOrientation;
  render?: 'scrollbar' | 'progress' | StepperRenderFn;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
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
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function NavixStepper({
  fKey,
  orientation,
  render = 'scrollbar',
  value: controlledValue,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onChange,
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
}: StepperProps) {
  const isControlled = controlledValue !== undefined;

  const [internalValue, setInternalValue] = useState<number>(() =>
    clamp(defaultValue ?? min, min, max),
  );

  const value = isControlled ? clamp(controlledValue, min, max) : internalValue;

  const [status, setStatus] = useState<StepperStatus>('natural');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const triggerFeedback = useCallback(
    (s: 'increase' | 'decrease') => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      setStatus(s);
      timerRef.current = setTimeout(() => {
        setStatus('natural');
        timerRef.current = null;
      }, feedbackTimeout);
    },
    [feedbackTimeout],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDelta = useCallback(
    (delta: number) => {
      const newValue = clamp(
        Math.round((value + delta * step) / step) * step,
        min,
        max,
      );
      if (!isControlled) setInternalValue(newValue);
      onChangeRef.current?.(newValue);
      triggerFeedback(delta > 0 ? 'increase' : 'decrease');
    },
    [value, step, min, max, isControlled, triggerFeedback],
  );

  const handleDeltaRef = useRef(handleDelta);
  handleDeltaRef.current = handleDelta;

  const { node, directlyFocused } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister, onEvent, disabled },
    (n: FocusNode) =>
      new StepperBehavior(n, {
        orientation,
        long,
        double,
        onChange: (delta) => handleDeltaRef.current(delta),
      }),
  );

  const behavior = node.behavior as StepperBehavior;
  useEffect(() => {
    behavior.update({
      orientation,
      long,
      double,
      onChange: (delta) => handleDeltaRef.current(delta),
    });
  }, [behavior, orientation, long, double]);

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

  const ratio = max > min ? (value - min) / (max - min) : 0;

  const scrollbarTrackStyle = useMemo<React.CSSProperties>(
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

  const scrollbarThumbStyle = useMemo<React.CSSProperties>(
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
      transition: 'background-color 0.15s ease, left 0.1s ease, top 0.1s ease',
      ...(orientation === 'horizontal'
        ? {
            left: `calc(${ratio * 100}% - ${ratio * 16}px)`,
            transform: 'none',
          }
        : {
            top: `calc(${ratio * 100}% - ${ratio * 16}px)`,
            transform: 'none',
          }),
      ...thumbStyle,
    }),
    [orientation, directlyFocused, status, ratio, thumbStyle],
  );

  const progressTrackStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'relative',
      width: orientation === 'horizontal' ? '100%' : 8,
      height: orientation === 'horizontal' ? 8 : '100%',
      borderRadius: 4,
      backgroundColor: directlyFocused ? '#555' : '#333',
      overflow: 'hidden',
      ...trackStyle,
    }),
    [orientation, directlyFocused, trackStyle],
  );

  const progressFillStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'absolute',
      borderRadius: 4,
      backgroundColor:
        status === 'increase'
          ? '#4fc3f7'
          : status === 'decrease'
            ? '#ef9a9a'
            : directlyFocused
              ? '#fff'
              : '#888',
      transition: 'background-color 0.15s ease, width 0.1s ease, height 0.1s ease',
      ...(orientation === 'horizontal'
        ? { left: 0, top: 0, bottom: 0, width: `${ratio * 100}%` }
        : { left: 0, right: 0, bottom: 0, height: `${ratio * 100}%` }),
      ...thumbStyle,
    }),
    [orientation, directlyFocused, status, ratio, thumbStyle],
  );

  let rendered: ReactNode;
  if (typeof render === 'function') {
    rendered = render({ focused: directlyFocused, status, value, min, max, step });
  } else if (render === 'progress') {
    rendered = (
      <div style={progressTrackStyle}>
        <div style={progressFillStyle} />
      </div>
    );
  } else {
    rendered = (
      <div style={scrollbarTrackStyle}>
        <div style={scrollbarThumbStyle} />
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

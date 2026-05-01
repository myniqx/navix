import { ButtonBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import {
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';

import { Expandable } from '../expandable/Expandable';
import { PaginatedList } from '../paginated-list/PaginatedList';
import type { BaseComponentProps } from '../types';
import { useFocusable } from '../useFocusable';

export interface DropdownOption {
  label: string;
  value: string;
}

type DropdownRenderOptionFn = (props: {
  option: DropdownOption;
  selected: boolean;
  focused: boolean;
  index: number;
}) => ReactNode;

interface DropdownProps extends BaseComponentProps {
  options: DropdownOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  multiple?: boolean;
  position?: 'top' | 'bottom';
  maxVisible?: number;
  placeholder?: string;
  renderOption?: DropdownRenderOptionFn;
  renderTrigger?: (props: {
    label: string;
    isExpanded: boolean;
    focused: boolean;
  }) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

function DefaultOption({
  option,
  selected,
  focused,
}: {
  option: DropdownOption;
  selected: boolean;
  focused: boolean;
}) {
  return (
    <div
      style={{
        padding: '0 10px',
        height: '100%',
        fontSize: 12,
        fontWeight: selected ? 700 : 400,
        color: focused ? '#fff' : selected ? '#4fc3f7' : '#aaa',
        background: focused ? '#1a2a3a' : 'transparent',
        borderLeft: `2px solid ${focused ? '#4fc3f7' : selected ? '#4fc3f780' : 'transparent'}`,
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {option.label}
      </span>
      {selected && (
        <span style={{ fontSize: 10, color: '#4fc3f7', flexShrink: 0 }}>✓</span>
      )}
    </div>
  );
}

function DefaultTrigger({
  label,
  isExpanded,
  focused,
}: {
  label: string;
  isExpanded: boolean;
  focused: boolean;
}) {
  return (
    <div
      style={{
        padding: '6px 10px',
        fontSize: 12,
        color: focused ? '#fff' : '#aaa',
        background: focused ? '#1a2a3a' : '#0d0d1a',
        border: `1px solid ${isExpanded ? '#4fc3f7' : focused ? '#4fc3f780' : '#222'}`,
        borderRadius: isExpanded ? '4px 4px 0 0' : 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        minWidth: 120,
      }}
    >
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          color: '#4fc3f7',
          transform: isExpanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }}
      >
        ▼
      </span>
    </div>
  );
}

const SLOT_HEIGHT = 34;

export function Dropdown({
  fKey,
  options,
  value = [],
  onChange,
  multiple = false,
  position = 'bottom',
  maxVisible = 3,
  placeholder = 'Select...',
  onFocus,
  onBlurred,
  onRegister,
  onUnregister,
  renderOption,
  renderTrigger,
  className,
  style,
}: DropdownProps) {
  const listFKey = `${fKey}-list`;

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1)
      return options.find((o) => o.value === value[0])?.label ?? placeholder;
    return `${value.length} selected`;
  }, [value, options, placeholder]);

  const listHeight = useMemo(
    () => Math.min(options.length, maxVisible) * SLOT_HEIGHT,
    [options.length, maxVisible],
  );

  const panelStyle = useMemo<CSSProperties>(
    () => ({
      position: 'absolute',
      left: 0,
      right: 0,
      ...(position === 'bottom' ? { top: '100%' } : { bottom: '100%' }),
      height: listHeight,
      background: '#0d0d1a',
      border: '1px solid #4fc3f7',
      ...(position === 'bottom'
        ? { borderTop: 'none', borderRadius: '0 0 4px 4px' }
        : { borderBottom: 'none', borderRadius: '4px 4px 0 0' }),
      overflow: 'hidden',
      zIndex: 100,
    }),
    [position, listHeight],
  );

  const outerStyle = useMemo<CSSProperties>(
    () => ({ position: 'relative', display: 'inline-block', ...style }),
    [style],
  );

  const outerListStyle = useMemo<CSSProperties>(
    () => ({ height: listHeight }),
    [listHeight],
  );

  const handleSelect = useCallback(
    (index: number, collapse: () => void) => {
      const selected = options[index]!.value;
      let next: string[];
      if (multiple) {
        next = value.includes(selected)
          ? value.filter((v) => v !== selected)
          : [...value, selected];
      } else {
        next = [selected];
        collapse();
      }
      onChange?.(next);
    },
    [options, value, multiple, onChange],
  );

  return (
    <Expandable
      fKey={fKey}
      onFocus={onFocus}
      onBlurred={onBlurred}
      onRegister={onRegister}
      onUnregister={onUnregister}
    >
      {({ isExpanded, focused, directlyFocused, collapse }) => (
        <div className={className} style={outerStyle}>
          {/* Trigger */}
          {renderTrigger ? (
            renderTrigger({
              label: triggerLabel,
              isExpanded,
              focused: focused || directlyFocused,
            })
          ) : (
            <DefaultTrigger
              label={triggerLabel}
              isExpanded={isExpanded}
              focused={focused || directlyFocused}
            />
          )}

          {/* Options panel */}
          {isExpanded && (
            <div style={panelStyle}>
              <PaginatedList
                fKey={listFKey}
                orientation="vertical"
                visibleCount={maxVisible}
                threshold={1}
                items={options}
                outerStyle={outerListStyle}
                renderItem={(option, itemFKey, index) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <OptionButton
                      fKey={itemFKey}
                      height={SLOT_HEIGHT}
                      onSelect={() => handleSelect(index, collapse)}
                    >
                      {(isFocused) =>
                        renderOption ? (
                          renderOption({
                            option,
                            selected: isSelected,
                            focused: isFocused,
                            index,
                          })
                        ) : (
                          <DefaultOption
                            option={option}
                            selected={isSelected}
                            focused={isFocused}
                          />
                        )
                      }
                    </OptionButton>
                  );
                }}
              />
            </div>
          )}
        </div>
      )}
    </Expandable>
  );
}

function OptionButton({
  fKey,
  height,
  onSelect,
  children,
}: {
  fKey: string;
  height: number;
  onSelect: () => void;
  children: (focused: boolean) => ReactNode;
}) {
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const handleClick = useCallback(() => onSelectRef.current(), []);

  const { node, directlyFocused, focusSelf } = useFocusable(
    fKey,
    undefined,
    (n: FocusNode) =>
      new ButtonBehavior(n, { onPress: () => onSelectRef.current() }),
  );

  return (
    <div
      data-navix-node-id={node.id}
      style={{ height, flexShrink: 0, width: '100%' }}
      onMouseEnter={focusSelf}
      onClick={handleClick}
    >
      {children(directlyFocused)}
    </div>
  );
}

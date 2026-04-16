import { useState, type ReactNode } from 'react';
import { ExpandableBehavior, PaginatedListBehavior, ButtonBehavior } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useFocusable } from '../useFocusable';
import type { BaseComponentProps } from '../types';

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
  renderTrigger?: (props: { label: string; isExpanded: boolean; focused: boolean }) => ReactNode;
}

function DefaultOption({ option, selected, focused }: {
  option: DropdownOption;
  selected: boolean;
  focused: boolean;
}) {
  return (
    <div style={{
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
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {option.label}
      </span>
      {selected && <span style={{ fontSize: 10, color: '#4fc3f7', flexShrink: 0 }}>✓</span>}
    </div>
  );
}

function DefaultTrigger({ label, isExpanded, focused }: {
  label: string;
  isExpanded: boolean;
  focused: boolean;
}) {
  return (
    <div style={{
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
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{
        fontSize: 10,
        color: '#4fc3f7',
        transform: isExpanded ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s ease',
        flexShrink: 0,
      }}>
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
}: DropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewOffset, setViewOffset] = useState(0);

  const optionKeys = options.map((_, i) => `${fKey}-opt-${i}`);
  const listFKey = `${fKey}-list`;

  const { focused, directlyFocused, focusSelf, FocusProvider, node } = useFocusable(
    fKey,
    { onFocus, onBlurred, onRegister, onUnregister },
    (n: FocusNode) => new ExpandableBehavior(n),
  );

  const expandable = node.behavior as ExpandableBehavior;
  expandable.onChange = (expanded) => {
    setIsExpanded(expanded);
    if (!expanded) setViewOffset(0);
  };

  const handleSelect = (index: number) => {
    const selected = options[index]!.value;
    let next: string[];
    if (multiple) {
      next = value.includes(selected)
        ? value.filter((v) => v !== selected)
        : [...value, selected];
    } else {
      next = [selected];
      expandable.collapse();
    }
    onChange?.(next);
  };

  const triggerLabel = value.length === 0
    ? placeholder
    : value.length === 1
      ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
      : `${value.length} selected`;

  const listHeight = Math.min(options.length, maxVisible) * SLOT_HEIGHT;
  const renderStart = viewOffset;
  const renderEnd = Math.min(options.length, viewOffset + maxVisible);
  const paddingBefore = renderStart * SLOT_HEIGHT;

  return (
    <FocusProvider>
      <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={focusSelf}>

        {/* Trigger */}
        <div onClick={(e) => { e.stopPropagation(); isExpanded ? expandable.collapse() : expandable.expand(); }}>
          {renderTrigger
            ? renderTrigger({ label: triggerLabel, isExpanded, focused: focused || directlyFocused })
            : <DefaultTrigger label={triggerLabel} isExpanded={isExpanded} focused={focused || directlyFocused} />
          }
        </div>

        {/* Options panel */}
        {isExpanded && (
          <div style={{
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
          }}>
            <OptionList
              fKey={listFKey}
              options={options}
              optionKeys={optionKeys}
              value={value}
              maxVisible={maxVisible}
              viewOffset={viewOffset}
              renderStart={renderStart}
              renderEnd={renderEnd}
              paddingBefore={paddingBefore}
              renderOption={renderOption}
              onChangeOffset={(newIndex, newOffset) => setViewOffset(newOffset)}
              onSelect={handleSelect}
            />
          </div>
        )}
      </div>
    </FocusProvider>
  );
}

// Separate component so it mounts/unmounts with the panel
// and useFocusable registers fresh each time the dropdown opens
function OptionList({
  fKey,
  options,
  optionKeys,
  value,
  maxVisible,
  viewOffset,
  renderStart,
  renderEnd,
  paddingBefore,
  renderOption,
  onChangeOffset,
  onSelect,
}: {
  fKey: string;
  options: DropdownOption[];
  optionKeys: string[];
  value: string[];
  maxVisible: number;
  viewOffset: number;
  renderStart: number;
  renderEnd: number;
  paddingBefore: number;
  renderOption?: DropdownRenderOptionFn;
  onChangeOffset: (newIndex: number, newOffset: number) => void;
  onSelect: (index: number) => void;
}) {
  const { node, FocusProvider } = useFocusable(
    fKey,
    undefined,
    (n: FocusNode) => new PaginatedListBehavior(n, 'vertical', options.length, maxVisible, 0),
  );

  const behavior = node.behavior as PaginatedListBehavior;
  behavior.totalCount = options.length;
  behavior.visibleCount = maxVisible;

  behavior.onChange = (newIndex: number, newOffset: number) => {
    onChangeOffset(newIndex, newOffset);
    behavior.focusByKey(optionKeys[newIndex]!);
  };

  return (
    <FocusProvider>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        transform: `translateY(${-viewOffset * SLOT_HEIGHT}px)`,
        transition: 'transform 0.15s ease',
      }}>
        {paddingBefore > 0 && <div style={{ minHeight: paddingBefore, flexShrink: 0 }} />}
        {options.slice(renderStart, renderEnd).map((option, localIdx) => {
          const globalIdx = renderStart + localIdx;
          const optKey = optionKeys[globalIdx]!;
          const isSelected = value.includes(option.value);

          return (
            <OptionButton
              key={optKey}
              fKey={optKey}
              height={SLOT_HEIGHT}
              onSelect={() => onSelect(globalIdx)}
            >
              {(focused) => renderOption
                ? renderOption({ option, selected: isSelected, focused, index: globalIdx })
                : <DefaultOption option={option} selected={isSelected} focused={focused} />
              }
            </OptionButton>
          );
        })}
      </div>
    </FocusProvider>
  );
}

function OptionButton({ fKey, height, onSelect, children }: {
  fKey: string;
  height: number;
  onSelect: () => void;
  children: (focused: boolean) => ReactNode;
}) {
  const onSelectRef = { current: onSelect };
  onSelectRef.current = onSelect;

  const { directlyFocused, focusSelf } = useFocusable(
    fKey,
    undefined,
    (n: FocusNode) => new ButtonBehavior(n, { onPress: () => onSelectRef.current() }),
  );

  return (
    <div
      style={{ height, flexShrink: 0 }}
      onMouseEnter={focusSelf}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {children(directlyFocused)}
    </div>
  );
}

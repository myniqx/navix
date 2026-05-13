/**
 * MenuRow
 *
 * The top navigation bar. Wraps all menu items in a NavixHorizontalList so
 * left/right arrow keys move focus between them.
 *
 * Layout note: NavixHorizontalList only manages focus — it renders no DOM of its
 * own. The inner <div style="display:flex"> provides the actual horizontal layout.
 *
 * Props:
 *   onSelect — called with the label string when the user presses Enter on an item.
 */

import { NavixHorizontalList, NavixExpandable } from '@navix/react';
import { useState } from 'react';

import { MENU_ITEMS, DEFAULT_OPTIONS } from '../data';
import type { OptionsState } from '../data';
import { MenuItem } from './MenuItem';
import { OptionsModal } from './OptionsModal';

interface MenuRowProps {
  onSelect: (item: string) => void;
}

export function MenuRow({ onSelect }: MenuRowProps) {
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTIONS);

  return (
    <div
      style={{
        padding: '16px 32px',
        borderBottom: '1px solid #1a1a2e',
        background: '#0d0d1a',
      }}
    >
      {/*
        fKey="menu" — identifier for this node in the focus tree.
        NavixHorizontalList attaches HorizontalListBehavior: left→focusPrev, right→focusNext.
        Events not handled here (up/down) bubble up to the parent NavixVerticalList.
      */}
      <NavixHorizontalList fKey="menu">
        <div style={{ display: 'flex', gap: 4 }}>
          {MENU_ITEMS.map((item) =>
            item === 'Options' ? (
              <NavixExpandable key={item} fKey="menu-Options">
                {({ isExpanded, directlyFocused, focused, collapse }) => (
                  <>
                    <div
                      style={{
                        padding: '8px 20px',
                        fontSize: 14,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        color:
                          directlyFocused || (focused && isExpanded)
                            ? '#fff'
                            : '#888',
                        borderBottom:
                          directlyFocused || (focused && isExpanded)
                            ? '2px solid #4fc3f7'
                            : '2px solid transparent',
                        transition: 'all 0.15s',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Options
                    </div>
                    {isExpanded && (
                      <OptionsModal
                        options={options}
                        onChange={(key, value) =>
                          setOptions((prev) => ({ ...prev, [key]: value }))
                        }
                        onClose={collapse}
                      />
                    )}
                  </>
                )}
              </NavixExpandable>
            ) : (
              [
                <MenuItem
                  key={item}
                  fKey={`menu-${item}`}
                  label={item}
                  onClick={() => onSelect(item)}
                />,
                item === 'Series' && (
                  <MenuItem
                    key="menu-Premium"
                    fKey="menu-Premium"
                    label="Premium"
                    disabled
                    onClick={() => {}}
                  />
                ),
              ]
            ),
          )}
        </div>
      </NavixHorizontalList>
    </div>
  );
}

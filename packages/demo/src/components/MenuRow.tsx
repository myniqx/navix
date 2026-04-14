/**
 * MenuRow
 *
 * The top navigation bar. Wraps all menu items in a HorizontalList so
 * left/right arrow keys move focus between them.
 *
 * Layout note: HorizontalList only manages focus — it renders no DOM of its
 * own. The inner <div style="display:flex"> provides the actual horizontal layout.
 *
 * Props:
 *   onSelect — called with the label string when the user presses Enter on an item.
 */

import { HorizontalList } from '@navix/react';
import { MENU_ITEMS } from '../data';
import { MenuItem } from './MenuItem';

interface MenuRowProps {
  onSelect: (item: string) => void;
}

export function MenuRow({ onSelect }: MenuRowProps) {
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
        HorizontalList attaches HorizontalListBehavior: left→focusPrev, right→focusNext.
        Events not handled here (up/down) bubble up to the parent VerticalList.
      */}
      <HorizontalList fKey="menu">
        <div style={{ display: 'flex', gap: 4 }}>
          {MENU_ITEMS.map((item) => (
            <MenuItem
              key={item}
              // fKey must be unique within this HorizontalList's children
              fKey={`menu-${item}`}
              label={item}
              onPress={() => onSelect(item)}
            />
          ))}
        </div>
      </HorizontalList>
    </div>
  );
}

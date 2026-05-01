import type { FocusNode } from '@navix/core';
import { useEffect, useRef, type RefObject } from 'react';

const REORDER_DEBOUNCE_MS = 500;

// Walks the DOM subtree under `root` in document order and collects the
// nearest `[data-navix-node-id]` element at each branch — descent stops as
// soon as a navix node is found, so nested HorizontalList/VerticalList
// instances are not flattened into the outer parent.
function collectImmediateNodeIds(root: HTMLElement): string[] {
  const result: string[] = [];
  const visit = (el: Element) => {
    const id = (el as HTMLElement).getAttribute?.('data-navix-node-id');
    if (id !== null && id !== undefined && id !== '') {
      result.push(id);
      return;
    }
    for (const child of Array.from(el.children)) visit(child);
  };
  for (const child of Array.from(root.children)) visit(child);
  return result;
}

// Wraps `parent.behavior.onChildRegistered` with a debounced reorder that
// reads DOM order from `containerRef` and calls `parent.reorderChildren`.
// Unregister is not handled — removing a child cannot break sibling order.
export function useChildReorder(
  parent: FocusNode,
  containerRef: RefObject<HTMLElement | null>,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const behavior = parent.behavior;
    const original = behavior.onChildRegistered;

    const performReorder = () => {
      const root = containerRef.current;
      if (!root) return;
      const ids = collectImmediateNodeIds(root);
      const byId = new Map(parent.children.map((n) => [n.id, n]));
      const ordered: FocusNode[] = [];
      for (const id of ids) {
        const node = byId.get(id);
        if (node) ordered.push(node);
      }
      parent.reorderChildren(ordered);
    };

    behavior.onChildRegistered = (child) => {
      original?.(child);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(performReorder, REORDER_DEBOUNCE_MS);
    };

    return () => {
      behavior.onChildRegistered = original;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [parent, containerRef]);
}

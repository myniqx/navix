import { createContext, useContext } from 'react';

/**
 * ExpandableContext
 *
 * Provided by <Expandable> and consumed by any descendant via useExpandable().
 * Allows deeply nested children (e.g. a close button inside a modal) to
 * collapse the nearest parent Expandable without prop drilling.
 */
export interface ExpandableContextValue {
  isExpanded: boolean;
  expand: () => void;
  collapse: () => void;
}

export const ExpandableContext = createContext<ExpandableContextValue | null>(
  null,
);

/**
 * useExpandable
 *
 * Returns the nearest parent Expandable's state and controls.
 * Throws if used outside of an <Expandable>.
 */
export function useExpandable(): ExpandableContextValue {
  const ctx = useContext(ExpandableContext);
  if (!ctx) throw new Error('useExpandable must be used inside <Expandable>');
  return ctx;
}

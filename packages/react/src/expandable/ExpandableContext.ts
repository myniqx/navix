import { createContext, useContext } from 'react';

/**
 * ExpandableContext
 *
 * Provided by <NavixExpandable> and consumed by any descendant via useExpandable().
 * Allows deeply nested children (e.g. a close button inside a modal) to
 * collapse the nearest parent NavixExpandable without prop drilling.
 */
export interface NavixExpandableContextValue {
  isExpanded: boolean;
  expand: () => void;
  collapse: () => void;
}

export const ExpandableContext = createContext<NavixExpandableContextValue | null>(
  null,
);

/**
 * useExpandable
 *
 * Returns the nearest parent NavixExpandable's state and controls.
 * Throws if used outside of an <NavixExpandable>.
 */
export function useExpandable(): NavixExpandableContextValue {
  const ctx = useContext(ExpandableContext);
  if (!ctx) throw new Error('useExpandable must be used inside <NavixExpandable>');
  return ctx;
}

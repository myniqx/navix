import { useState, useRef, type ReactNode } from 'react';
import { ExpandableBehavior } from '@navix/core';
import { useFocusable } from '../useFocusable';
import { ExpandableContext } from './ExpandableContext';

/**
 * Values passed to the render prop child function.
 */
export interface ExpandableRenderProps {
  /** Whether the expandable is currently open. Use this to conditionally render children. */
  isExpanded: boolean;
  /** True when this node or any of its descendants is in the active focus path. */
  focused: boolean;
  /** True when this node itself is the active leaf — no expanded children yet. */
  directlyFocused: boolean;
  /** Programmatically open the expandable. */
  expand: () => void;
  /** Programmatically close the expandable. */
  collapse: () => void;
}

interface ExpandableProps {
  /**
   * Unique key for this node in the focus tree.
   * Must be unique within the parent focus scope.
   */
  fKey: string;
  /**
   * Render prop — receives focus state and expand/collapse controls.
   * Called on every render, including when isExpanded or focus state changes.
   *
   * Render children conditionally based on isExpanded:
   *   {({ isExpanded, directlyFocused, collapse }) => (
   *     <>
   *       <CardPoster focused={directlyFocused} />
   *       {isExpanded && (
   *         <ActionRow onClose={collapse} />
   *       )}
   *     </>
   *   )}
   */
  children: (props: ExpandableRenderProps) => ReactNode;
}

/**
 * Expandable
 *
 * A focus node that wraps ExpandableBehavior from core.
 * Manages two states — collapsed and expanded — and exposes them via:
 *   1. Render prop   — for direct children that need isExpanded / controls
 *   2. Context       — for deeply nested children via useExpandable()
 *
 * Event routing (handled entirely by core, no React logic needed):
 *   Collapsed: enter → expands. All other events bubble to parent.
 *   Expanded:  back → collapses. All other events route to active children first.
 */
export function Expandable({ fKey, children }: ExpandableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Behavior is created once and lives for the lifetime of this component.
  // It owns the onEvent handler on the FocusNode.
  const behaviorRef = useRef<ExpandableBehavior | null>(null);

  const { focused, directlyFocused, FocusProvider, node } = useFocusable(fKey);

  // Attach behavior to node once
  if (behaviorRef.current === null) {
    behaviorRef.current = new ExpandableBehavior(node);
  }

  // Wire behavior's onChange to React state — this is the only bridge between
  // core and React. Core stays framework-free; the callback is a plain function.
  behaviorRef.current.onChange = setIsExpanded;

  const expand = () => behaviorRef.current!.expand();
  const collapse = () => behaviorRef.current!.collapse();

  const contextValue = { isExpanded, expand, collapse };
  const renderProps: ExpandableRenderProps = {
    isExpanded,
    focused,
    directlyFocused,
    expand,
    collapse,
  };

  return (
    <ExpandableContext.Provider value={contextValue}>
      <FocusProvider>
        {/* Mouse click mirrors keyboard enter/back — toggle expand state */}
        <div style={{ display: 'contents' }} onClick={() => isExpanded ? collapse() : expand()}>
          {children(renderProps)}
        </div>
      </FocusProvider>
    </ExpandableContext.Provider>
  );
}

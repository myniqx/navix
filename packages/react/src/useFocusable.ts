import {
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
  createElement,
} from 'react';
import { FocusNode } from '@navix/core';
import type { NavEvent } from '@navix/core';
import { FocusContext } from './FocusContext';

interface UseFocusableOptions {
  onEvent?: (event: NavEvent) => boolean;
}

interface UseFocusableResult {
  node: FocusNode;
  focused: boolean;
  directlyFocused: boolean;
  // Call on onMouseEnter to move focus to this node via mouse/pointer
  focusSelf: () => void;
  FocusProvider: React.FC<{ children: ReactNode }>;
}

export function useFocusable(
  key: string,
  options?: UseFocusableOptions,
): UseFocusableResult {
  const parent = useContext(FocusContext);
  const nodeRef = useRef<FocusNode | null>(null);

  if (nodeRef.current === null) {
    nodeRef.current = new FocusNode(key);
  }

  const node = nodeRef.current;

  // Only set onEvent if explicitly provided — do NOT overwrite behavior-set onEvent
  if (options?.onEvent !== undefined) {
    node.onEvent = options.onEvent;
  }

  // Register/unregister with parent
  useEffect(() => {
    if (!parent) return;
    parent.register(node);
    return () => {
      parent.unregister(node);
    };
  }, [parent, node]);

  // Subscribe to node state changes for re-render
  const subscribe = useCallback(
    (callback: () => void) => node.subscribe(callback),
    [node],
  );

  const getFocused = useCallback(() => node.isFocused, [node]);
  const getDirectlyFocused = useCallback(() => node.isDirectlyFocused, [node]);

  const focused = useSyncExternalStore(subscribe, getFocused, getFocused);
  const directlyFocused = useSyncExternalStore(
    subscribe,
    getDirectlyFocused,
    getDirectlyFocused,
  );

  // Stable FocusProvider component — provides this node as context to children
  const FocusProvider = useCallback(
    ({ children }: { children: ReactNode }) =>
      createElement(FocusContext.Provider, { value: node }, children),
    [node],
  );

  // Moves focus to this node from mouse/pointer interaction.
  // Walks up the tree via requestFocus() so all ancestors update their activeChildId,
  // ensuring only one active path exists in the tree at any time.
  const focusSelf = useCallback(() => node.requestFocus(), [node]);

  return { node, focused, directlyFocused, focusSelf, FocusProvider };
}

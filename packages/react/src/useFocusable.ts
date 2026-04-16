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
import type { IFocusNodeBehavior } from '@navix/core';
import { FocusContext } from './FocusContext';

interface UseFocusableCallbacks {
  onFocus?: (key: string) => void;
  onBlurred?: (key: string) => void;
  onRegister?: (key: string) => void;
  onUnregister?: (key: string) => void;
}

interface UseFocusableResult {
  node: FocusNode;
  focused: boolean;
  directlyFocused: boolean;
  focusSelf: () => void;
  FocusProvider: React.FC<{ children: ReactNode }>;
}

export function useFocusable(
  key: string,
  callbacks?: UseFocusableCallbacks,
  createBehavior?: (node: FocusNode) => IFocusNodeBehavior,
): UseFocusableResult {
  const parent = useContext(FocusContext);
  const nodeRef = useRef<FocusNode | null>(null);
  const callbacksRef = useRef<UseFocusableCallbacks>({});
  callbacksRef.current = callbacks ?? {};

  if (nodeRef.current === null) {
    nodeRef.current = new FocusNode(key);
    if (createBehavior !== undefined) {
      createBehavior(nodeRef.current);
    } else {
      // Default behavior — only needed for callback wiring
      nodeRef.current.behavior = {
        onEvent: () => false
      };
    }
  }

  const node = nodeRef.current;

  // Wire callbacks into behavior — updated every render so closures stay fresh
  node.behavior!.onFocus = () => callbacksRef.current.onFocus?.(key);
  node.behavior!.onBlurred = () => callbacksRef.current.onBlurred?.(key);
  node.behavior!.onRegister = () => callbacksRef.current.onRegister?.(key);
  node.behavior!.onUnregister = () => callbacksRef.current.onUnregister?.(key);

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

  const focusSelf = useCallback(() => node.requestFocus(), [node]);

  return { node, focused, directlyFocused, focusSelf, FocusProvider };
}

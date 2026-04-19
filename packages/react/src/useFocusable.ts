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

  const origCallbacksRef = useRef<{
    onFocus?: IFocusNodeBehavior['onFocus'];
    onBlurred?: IFocusNodeBehavior['onBlurred'];
    onRegister?: IFocusNodeBehavior['onRegister'];
    onUnregister?: IFocusNodeBehavior['onUnregister'];
  } | null>(null);

  if (nodeRef.current === null) {
    nodeRef.current = new FocusNode(key);
    if (createBehavior !== undefined) {
      const result = createBehavior(nodeRef.current);
      if (!nodeRef.current.behavior) {
        nodeRef.current.behavior = result ?? { onEvent: () => false };
      }
    } else {
      nodeRef.current.behavior = { onEvent: () => false };
    }
    const behavior = nodeRef.current.behavior;
    // Capture behavior's own callbacks once, before we override them
    origCallbacksRef.current = {
      onFocus: behavior.onFocus?.bind(behavior),
      onBlurred: behavior.onBlurred?.bind(behavior),
      onRegister: behavior.onRegister?.bind(behavior),
      onUnregister: behavior.onUnregister?.bind(behavior),
    };
  }

  const node = nodeRef.current;
  const orig = origCallbacksRef.current!;

  // Wire callbacks into behavior — chain with behavior's own callbacks
  node.behavior.onFocus = (n) => { orig.onFocus?.(n); callbacksRef.current.onFocus?.(key); };
  node.behavior.onBlurred = (n) => { orig.onBlurred?.(n); callbacksRef.current.onBlurred?.(key); };
  node.behavior.onRegister = () => { orig.onRegister?.(); callbacksRef.current.onRegister?.(key); };
  node.behavior.onUnregister = () => { orig.onUnregister?.(); callbacksRef.current.onUnregister?.(key); };

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

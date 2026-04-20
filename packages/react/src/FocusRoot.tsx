import { FocusTree } from '@navix/core';
import type { InputConfig } from '@navix/core';
import type { FocusNode } from '@navix/core';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { FocusContext } from './FocusContext';
import { setMergeClassName } from './mergeClassName';

interface FocusRootProps {
  children: ReactNode;
  inputConfig?: InputConfig;
  mergeClassName?: (...classes: (string | undefined)[]) => string;
}

export function FocusRoot({
  children,
  inputConfig,
  mergeClassName,
}: FocusRootProps) {
  setMergeClassName(mergeClassName);
  const treeRef = useRef<FocusTree | null>(null);
  const [root, setRoot] = useState<FocusNode>(() => {
    treeRef.current = new FocusTree(inputConfig);
    return treeRef.current.root;
  });

  useEffect(() => {
    // StrictMode: first run destroys the tree, second run recreates it
    if (treeRef.current === null) {
      const tree = new FocusTree(inputConfig);
      treeRef.current = tree;
      setRoot(tree.root);
    }
    const tree = treeRef.current;

    const onKeyDown = (e: KeyboardEvent) =>
      tree.inputManager.handleKeyDown(e.code);
    const onKeyUp = (e: KeyboardEvent) => tree.inputManager.handleKeyUp(e.code);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      tree.destroy();
      treeRef.current = null;
    };
  }, []);

  return <FocusContext.Provider value={root}>{children}</FocusContext.Provider>;
}

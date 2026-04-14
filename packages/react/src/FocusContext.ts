import { createContext } from 'react';
import type { FocusNode } from '@navix/core';

// Context value is the parent FocusNode that children register themselves into
export const FocusContext = createContext<FocusNode | null>(null);

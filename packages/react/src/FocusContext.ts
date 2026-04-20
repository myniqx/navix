import type { FocusNode } from '@navix/core';
import { createContext } from 'react';

// Context value is the parent FocusNode that children register themselves into
export const FocusContext = createContext<FocusNode | null>(null);

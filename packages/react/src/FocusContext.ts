import type { FocusNode } from './core/FocusNode';
import { createContext } from 'react';

// Context value is the parent FocusNode that children register themselves into
export const FocusContext = createContext<FocusNode | null>(null);

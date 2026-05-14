import { createContext, useContext } from 'react';

export interface KVStore {
  get: (key: string) => Record<string, unknown> | undefined;
  set: (key: string, value: Record<string, unknown>) => void;
  update: (key: string, partial: Record<string, unknown>) => void;
  delete: (key: string) => void;
}

export const KVContext = createContext<KVStore | null>(null);

export function useNavixStore(): KVStore {
  const store = useContext(KVContext);
  if (!store) throw new Error('useNavixStore must be used inside NavixScope');
  return store;
}

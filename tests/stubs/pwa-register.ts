import { useState } from 'react';

export function useRegisterSW(_options?: unknown) {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  return { needRefresh, offlineReady, updateServiceWorker: async (_reload?: boolean) => {} };
}

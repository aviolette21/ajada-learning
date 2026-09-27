import { useEffect, useState } from 'react';

interface Options {
  onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
}

/** Tests set this to hand UpdateBanner a fake registration. */
export const swStub: { registration?: ServiceWorkerRegistration } = {};

export function useRegisterSW(options?: Options) {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  useEffect(() => {
    if (swStub.registration) options?.onRegisteredSW?.('sw.js', swStub.registration);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { needRefresh, offlineReady, updateServiceWorker: async (_reload?: boolean) => {} };
}

import { AnimatePresence, motion } from 'motion/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { IconClose } from '../ui/icons';
import { spring } from '../ui/motion';

const HOUR = 60 * 60 * 1000;

export function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) setInterval(() => registration.update().catch(() => {}), HOUR); // offline checks fail; the next hour retries
    },
  });
  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div className="update-toast" role="status" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} transition={spring}>
          <span className="grow">Update ready</span>
          <button type="button" className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>Reload</button>
          <button type="button" className="icon-btn" aria-label="Dismiss update" onClick={() => setNeedRefresh(false)}><IconClose /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

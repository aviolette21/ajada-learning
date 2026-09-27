import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { IconClose } from '../ui/icons';
import { spring } from '../ui/motion';

export const SAVE_FAILED = "Couldn't save your progress. Try again.";
export const TOAST_MS = 6000;

type Notify = (message: string) => void;
const NotifierContext = createContext<Notify | null>(null);

export function useNotify(): Notify {
  const notify = useContext(NotifierContext);
  if (!notify) throw new Error('useNotify must be used inside <NotifierProvider>');
  return notify;
}

/** Swallows a rejection that has already been reported to the user (see ProgressProvider). */
export const ignore = () => {};

/** Shows one message at a time in a toast; a repeat of the same message restarts its timer. */
export function NotifierProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const notify = useCallback<Notify>((message) => setToast((t) => ({ message, id: (t?.id ?? 0) + 1 })), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <NotifierContext.Provider value={notify}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div className="update-toast error-toast" role="alert" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} transition={spring}>
            <span className="grow">{toast.message}</span>
            <button type="button" className="icon-btn" aria-label="Dismiss message" onClick={() => setToast(null)}><IconClose /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </NotifierContext.Provider>
  );
}

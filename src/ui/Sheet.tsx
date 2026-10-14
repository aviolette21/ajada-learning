import { AnimatePresence, motion, useDragControls } from 'motion/react';
import type { ReactNode } from 'react';
import { sheetSpring } from './motion';

/**
 * A bottom sheet. With onClose, pulling the grip strip down dismisses it; only the strip starts a drag, so long
 * content inside the sheet still scrolls normally.
 */
export function Sheet({ open, label, onClose, children }: { open: boolean; label: string; onClose?: () => void; children: ReactNode }) {
  const controls = useDragControls();
  return (
    <AnimatePresence>
      {open && (
        <motion.section className="sheet" role="dialog" aria-label={label}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={sheetSpring}
          {...(onClose && {
            drag: 'y' as const, dragControls: controls, dragListener: false,
            dragConstraints: { top: 0, bottom: 0 }, dragElastic: { top: 0, bottom: 1 },
            onDragEnd: (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            },
          })}>
          <div className={onClose ? 'sheet-handle' : undefined} onPointerDown={onClose ? (e) => controls.start(e) : undefined}>
            <div className="sheet-grip" aria-hidden="true" />
          </div>
          {children}
        </motion.section>
      )}
    </AnimatePresence>
  );
}

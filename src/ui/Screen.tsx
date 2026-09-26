import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from './icons';
import { pageTransition } from './motion';

export function Screen({ title, back, action, children, className }: {
  title?: ReactNode;
  back?: string | true;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <motion.main className={`screen ${className ?? ''}`} {...pageTransition}>
      {(title || back || action) && (
        <header className="screen-head">
          {back && (
            <button type="button" className="icon-btn" aria-label="Back" onClick={() => (back === true ? navigate(-1) : navigate(back))}>
              <IconBack />
            </button>
          )}
          {title && <h1>{title}</h1>}
          <div className="spacer" />
          {action}
        </header>
      )}
      {children}
    </motion.main>
  );
}

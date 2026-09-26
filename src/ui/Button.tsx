import { motion, type HTMLMotionProps } from 'motion/react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ variant = 'primary', block = false, className, ...rest }: HTMLMotionProps<'button'> & { variant?: Variant; block?: boolean }) {
  const classes = ['btn', `btn-${variant}`, block ? 'btn-block' : '', className ?? ''].filter(Boolean).join(' ');
  return <motion.button type="button" whileTap={{ scale: 0.96 }} className={classes} {...rest} />;
}

import { motion } from 'motion/react';

export function Meter({ value, label }: { value: number | null; label: string }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  const tone = value === null ? 'none' : value >= 0.75 ? 'good' : value >= 0.55 ? 'mid' : 'low';
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <motion.i className={`meter-fill tone-${tone}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}

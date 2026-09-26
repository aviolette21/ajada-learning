import { useProgress } from '../../app/ProgressProvider';
import { IconFlag } from '../../ui/icons';

export function FlagButton({ itemId, kind }: { itemId: string; kind: 'question' | 'card' }) {
  const { flags, toggleFlag } = useProgress();
  const on = flags.has(itemId);
  return (
    <button type="button" className={`icon-btn flag ${on ? 'on' : ''}`} aria-pressed={on}
      aria-label={on ? 'Flagged as wrong or outdated (tap to unflag)' : 'Flag as wrong or outdated'}
      onClick={(e) => { e.stopPropagation(); void toggleFlag(itemId, kind); }}>
      <IconFlag filled={on} />
    </button>
  );
}

import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { IconBookmark } from '../../ui/icons';

/** Saves a question to look up later; unlike the report flag, this is for the learner's own review list. */
export function SaveButton({ questionId }: { questionId: string }) {
  const { saved, toggleSaved } = useProgress();
  const on = saved.includes(questionId);
  return (
    <button type="button" className={`chip save-chip ${on ? 'on' : ''}`} aria-pressed={on}
      aria-label={on ? 'Saved for review (tap to remove)' : 'Save for review'}
      onClick={(e) => { e.stopPropagation(); toggleSaved(questionId).catch(ignore); }}>
      <IconBookmark filled={on} /> {on ? 'Saved' : 'Save for review'}
    </button>
  );
}

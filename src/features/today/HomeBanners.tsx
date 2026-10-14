import { Link } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useProgress } from '../../app/ProgressProvider';
import { firstActivityAt, needsBackupReminder } from '../../app/reminders';

export function HomeBanners() {
  const { settings, attempts, cardStates } = useProgress();
  const { now } = useClock();
  const showBackup = needsBackupReminder({ lastBackupAt: settings.lastBackupAt, firstActivityAt: firstActivityAt(attempts, cardStates), now: now() });
  return (
    <>
      {showBackup && (
        <div className="banner" role="note">
          <span className="grow">💾 It's been a while since your last backup. Your progress lives only on this phone.</span>
          <Link className="btn btn-ghost" to="/settings">Back up</Link>
        </div>
      )}
    </>
  );
}

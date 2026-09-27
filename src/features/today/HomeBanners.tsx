import { Link } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { firstActivityAt, isStandalone, needsBackupReminder } from '../../app/reminders';

export function HomeBanners() {
  const { settings, attempts, cardStates, updateSettings } = useProgress();
  const { now } = useClock();
  const showInstall = !isStandalone() && settings.installHintDismissedAt === undefined;
  const showBackup = needsBackupReminder({ lastBackupAt: settings.lastBackupAt, firstActivityAt: firstActivityAt(attempts, cardStates), now: now() });
  return (
    <>
      {showInstall && (
        <div className="banner" role="note">
          <span className="grow">📲 Add Ajada to your Home Screen so it works offline and iOS keeps your progress: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</span>
          <button type="button" className="btn btn-ghost" onClick={() => updateSettings({ installHintDismissedAt: now().getTime() }).catch(ignore)}>Dismiss</button>
        </div>
      )}
      {showBackup && (
        <div className="banner" role="note">
          <span className="grow">💾 It's been a while since your last backup. Your progress lives only on this phone.</span>
          <Link className="btn btn-ghost" to="/settings">Back up</Link>
        </div>
      )}
    </>
  );
}

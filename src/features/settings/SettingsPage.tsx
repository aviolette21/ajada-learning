import { useRef, useState, type ChangeEvent } from 'react';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { BackupError, backupFileName } from '../../storage/backup';
import { shareOrDownload } from '../../storage/share';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';

export function SettingsPage() {
  const p = useProgress();
  const { questions, cards, lessons, domains, questionById, cardById } = useContent();
  const { now } = useClock();
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const flagged = [...p.flags.values()].sort((a, b) => b.at - a.at);
  const unofficial = domains.some((d) => d.subSkills.some((s) => !s.official));

  const exportNow = async () => {
    setMessage(null);
    try {
      const text = await p.exportBackup();
      if (!(await shareOrDownload(text, backupFileName(now())))) return;
      await p.markBackedUp();
      setMessage('Backup created.');
    } catch {
      setMessage('Could not create a backup.');
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('Replace all progress on this device with this backup?')) return;
    try {
      await p.importBackup(await file.text());
      setMessage('Backup restored.');
    } catch (err) {
      setMessage(err instanceof BackupError ? err.message : 'Could not read that file.');
    }
  };

  const setNewCards = (n: number) => p.updateSettings({ newCardsPerDay: Math.min(50, Math.max(5, n)) }).catch(ignore);

  return (
    <Screen title="Settings" back="/">
      <section className="panel">
        <h3>Flashcards</h3>
        <div className="stepper-row">
          <span>New cards per day</span>
          <div className="stepper">
            <button type="button" className="icon-btn" aria-label="Fewer new cards" onClick={() => setNewCards(p.settings.newCardsPerDay - 5)}>−</button>
            <output aria-label="New cards per day">{p.settings.newCardsPerDay}</output>
            <button type="button" className="icon-btn" aria-label="More new cards" onClick={() => setNewCards(p.settings.newCardsPerDay + 5)}>+</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Backup</h3>
        <p className="muted">
          {p.settings.lastBackupAt ? `Last backup: ${new Date(p.settings.lastBackupAt).toLocaleDateString()}. ` : 'No backup yet. '}
          Your progress lives only on this phone.
        </p>
        <Button block onClick={() => void exportNow()}>Export backup</Button>
        <Button block variant="secondary" onClick={() => fileRef.current?.click()}>Import backup</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden data-testid="import-input" onChange={(e) => void onFile(e)} />
        {message && <p role="status" className="muted">{message}</p>}
      </section>

      <section className="panel">
        <h3>Flagged items ({flagged.length})</h3>
        {flagged.length === 0 ? (
          <p className="muted">Tap 🚩 on any question or card that looks wrong or outdated. It will be listed here so you can report it.</p>
        ) : (
          <ul className="flag-list">
            {flagged.map((f) => (
              <li key={f.itemId}>
                <div className="grow">
                  <code>{f.itemId}</code>
                  <div className="muted">{f.kind === 'question' ? questionById.get(f.itemId)?.stem : cardById.get(f.itemId)?.term}</div>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => p.toggleFlag(f.itemId, f.kind).catch(ignore)}>Unflag</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h3>Content</h3>
        <p className="muted">
          {questions.length} questions · {cards.length} flashcards · {lessons.length} lessons. Every item links to its official source.
          {unofficial && ' The sub-skill breakdown is unofficial until the official exam guide is added.'}
        </p>
      </section>

      <section className="panel">
        <h3>Install on iPhone</h3>
        <p className="muted">Open this site in Safari, tap Share, then Add to Home Screen. Once installed, Ajada works offline and iOS keeps your progress.</p>
      </section>
    </Screen>
  );
}

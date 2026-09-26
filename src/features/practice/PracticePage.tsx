import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { missedQuestionIds } from '../../study/weakSpots';
import { IconChevron, IconClock } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import './practice.css';

export function PracticePage() {
  const navigate = useNavigate();
  const { domains } = useContent();
  const { attempts, mockSessions } = useProgress();
  const [selected, setSelected] = useState<string[]>(() => domains.map((d) => d.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const missed = missedQuestionIds(attempts).length;
  const mocksDone = mockSessions.filter((s) => s.submittedAt).length;

  return (
    <Screen title="Practice">
      <section className="panel">
        <button type="button" className="panel-link" onClick={() => navigate(`/practice/quiz?d=${selected.join(',')}`)}>
          <span className="grow"><h2>Quick quiz</h2><span className="muted">10 questions · instant explanation after each</span></span>
          <span className="chev"><IconChevron /></span>
        </button>
        <div className="chips" style={{ marginTop: 12 }} aria-label="Domains to include">
          {domains.map((d) => (
            <button key={d.id} type="button" className={`chip ${selected.includes(d.id) ? 'on' : ''}`} aria-pressed={selected.includes(d.id)} onClick={() => toggle(d.id)}>
              {d.shortName}
            </button>
          ))}
        </div>
      </section>
      <Link className="panel panel-link" to="/practice/weak">
        <span className="grow"><h2>Weak spots</h2><span className="muted">{missed > 0 ? `${missed} missed question${missed === 1 ? '' : 's'} + your lowest sub-skills` : 'Your lowest-scoring areas'}</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <Link className="panel panel-link" to="/practice/mock">
        <span className="grow"><h2><IconClock /> Mock exam</h2><span className="muted">53 questions · 120 min · weighted like the real exam</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <Link className="panel panel-link" to="/practice/history">
        <span className="grow"><h2>History</h2><span className="muted">{mocksDone === 0 ? 'No mock exams yet' : `${mocksDone} mock exam${mocksDone === 1 ? '' : 's'} taken`}</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
    </Screen>
  );
}

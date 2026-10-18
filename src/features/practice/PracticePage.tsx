import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { QUIZ_SIZE, QUIZ_SIZES } from '../../study/quiz';
import { missedQuestionIds } from '../../study/weakSpots';
import { IconChevron, IconClock } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import { SegmentedControl } from '../../ui/SegmentedControl';
import './practice.css';

export function PracticePage() {
  const navigate = useNavigate();
  const { domains, questions, focus } = useContent();
  const [size, setSize] = useState<string>(String(QUIZ_SIZE));
  const { attempts, mockSessions } = useProgress();
  const [selected, setSelected] = useState<string[]>(() => domains.map((d) => d.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const missed = missedQuestionIds(attempts).length;
  const snippets = questions.filter((q) => q.snippet).length;
  const mocksDone = mockSessions.filter((s) => s.submittedAt).length;

  return (
    <Screen title="Practice">
      <section className="panel">
        <button type="button" className="panel-link" onClick={() => navigate(`/practice/quiz?n=${size}&d=${selected.join(',')}`)}>
          <span className="grow"><h2>Practice quiz</h2><span className="muted">{size} questions · explanation after each · {questions.length} in the bank</span></span>
          <span className="chev"><IconChevron /></span>
        </button>
        <div style={{ marginTop: 12 }}>
          <SegmentedControl label="Questions per quiz" value={size} onChange={setSize}
            options={QUIZ_SIZES.map((n) => ({ value: String(n), label: `${n} questions` }))} />
        </div>
        <div className="chips" style={{ marginTop: 12 }} aria-label="Domains to include">
          {domains.map((d) => (
            <button key={d.id} type="button" className={`chip ${selected.includes(d.id) ? 'on' : ''}`} aria-pressed={selected.includes(d.id)} onClick={() => toggle(d.id)}>
              {d.shortName}
            </button>
          ))}
        </div>
      </section>
      {focus.length > 0 && (
        <Link className="panel panel-link" to="/practice/focus">
          <span className="grow"><h2>Focus areas</h2><span className="muted">{focus.length} topics test takers say the exam leans on · drill one at a time</span></span>
          <span className="chev"><IconChevron /></span>
        </Link>
      )}
      {snippets > 0 && (
        <Link className="panel panel-link" to="/practice/code">
          <span className="grow"><h2>Code & traces</h2><span className="muted">Read a snippet, a session trace or a config and say what's going on · {snippets} questions</span></span>
          <span className="chev"><IconChevron /></span>
        </Link>
      )}
      <Link className="panel panel-link" to="/practice/mistakes">
        <span className="grow"><h2>My mistakes</h2><span className="muted">{missed > 0 ? `${missed} question${missed === 1 ? '' : 's'} to master · right on 2 different days clears one` : 'Nothing to review yet'}</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <Link className="panel panel-link" to="/practice/progress">
        <span className="grow"><h2>Progress by topic</h2><span className="muted">All 25 exam topics · where you're losing the most points</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <Link className="panel panel-link" to="/practice/weak">
        <span className="grow"><h2>Weak spots</h2><span className="muted">Your lowest-scoring areas, plus unseen questions</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <Link className="panel panel-link" to="/practice/mock">
        <span className="grow"><h2><IconClock /> Mock exam</h2><span className="muted">53 questions · untimed · weighted and scored like the real exam</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <Link className="panel panel-link" to="/practice/history">
        <span className="grow"><h2>History</h2><span className="muted">{mocksDone === 0 ? 'No mock exams yet' : `${mocksDone} mock exam${mocksDone === 1 ? '' : 's'} taken`}</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
    </Screen>
  );
}

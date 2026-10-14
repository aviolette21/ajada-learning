import { useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useNow } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { chosenIds, isAnswered, isMultiple, selectCount } from '../../content/answers';
import type { ChoiceId, Question } from '../../content/schema';
import type { MockSession } from '../../study/types';
import { Button } from '../../ui/Button';
import { IconClock, IconClose } from '../../ui/icons';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import '../practice/practice.css';
import { QuestionView } from '../practice/QuestionView';
import './mock.css';

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MockExamPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { questionById } = useContent();
  const { mockSessions, saveMockSession, submitMock } = useProgress();
  const [session, setSession] = useState<MockSession | undefined>(() => mockSessions.find((s) => s.id === sessionId));
  const [navOpen, setNavOpen] = useState(false);
  const submitting = useRef(false);
  const time = useNow(1000);
  const elapsed = session ? Math.max(0, time.getTime() - session.startedAt) : 0;

  const update = (patch: Partial<MockSession>) => {
    if (!session || submitting.current) return;
    const next = { ...session, ...patch };
    setSession(next);
    saveMockSession(next).catch(ignore);
  };

  const submit = useCallback(async () => {
    if (!session || submitting.current) return;
    submitting.current = true;
    try {
      await submitMock(session);
    } catch {
      // Already reported. Submit stays available for a retry.
      submitting.current = false;
      return;
    }
    navigate(`/practice/mock/${session.id}/results`, { replace: true });
  }, [session, submitMock, navigate]);

  if (!session) {
    return <Screen title="Mock exam" back="/practice/mock"><p className="empty">This exam session wasn't found.</p></Screen>;
  }
  if (session.submittedAt) return <Navigate to={`/practice/mock/${session.id}/results`} replace />;

  const qid = session.questionIds[session.currentIndex];
  const question = questionById.get(qid);
  const answeredIds = session.questionIds.filter((id) => {
    const q = questionById.get(id);
    return q ? isAnswered(q, session.answers[id]) : false;
  });
  const answered = answeredIds.length;
  const pick = (q: Question, id: ChoiceId) => {
    if (!isMultiple(q)) {
      update({ answers: { ...session.answers, [q.id]: id } });
      return;
    }
    const picked = chosenIds(session.answers[q.id]);
    if (!picked.includes(id) && picked.length >= selectCount(q)) return;
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id].sort();
    update({ answers: { ...session.answers, [q.id]: next } });
  };
  const total = session.questionIds.length;
  const flagged = session.flagged.includes(qid);
  const guessed = session.guessed?.includes(qid) ?? false;
  const isLast = session.currentIndex === total - 1;

  return (
    <div className="runner">
      <header className="runner-head">
        <button type="button" className="icon-btn" aria-label="Leave exam (progress is saved)" onClick={() => navigate('/practice/mock')}>
          <IconClose />
        </button>
        <span className="runner-count">Question {session.currentIndex + 1} of {total}</span>
        <span className="timer" aria-label="Time elapsed">
          <IconClock />{formatClock(elapsed)}
        </span>
      </header>
      <ProgressBar value={answered / total} label="Questions answered" />
      {question && (
        <QuestionView question={question} chosen={session.answers[qid] ?? null} mode="exam" showReportFlag={false}
          onChoose={(id: ChoiceId) => pick(question, id)} />
      )}
      <div className="mock-tools">
        <button type="button" className={`chip ${flagged ? 'on' : ''}`} aria-pressed={flagged}
          onClick={() => update({ flagged: flagged ? session.flagged.filter((x) => x !== qid) : [...session.flagged, qid] })}>
          {flagged ? '★ Flagged for review' : '☆ Flag for review'}
        </button>
        <button type="button" className={`chip ${guessed ? 'on' : ''}`} aria-pressed={guessed}
          onClick={() => update({ guessed: guessed ? (session.guessed ?? []).filter((x) => x !== qid) : [...(session.guessed ?? []), qid] })}>
          🤔 {guessed ? 'Guessing' : 'Mark as a guess'}
        </button>
        <button type="button" className="chip" onClick={() => setNavOpen(true)}>All questions ({answered}/{total})</button>
      </div>
      <div className="mock-nav">
        <Button variant="secondary" disabled={session.currentIndex === 0} onClick={() => update({ currentIndex: session.currentIndex - 1 })}>Back</Button>
        {isLast
          ? <Button onClick={() => setNavOpen(true)}>Review &amp; submit</Button>
          : <Button onClick={() => update({ currentIndex: session.currentIndex + 1 })}>Next</Button>}
      </div>
      <Sheet open={navOpen} label="Question navigator">
        <div className="navgrid">
          {session.questionIds.map((id, i) => {
            const isDone = answeredIds.includes(id);
            const isFlagged = session.flagged.includes(id);
            return (
              <button key={id} type="button"
                className={['navcell', isDone ? 'answered' : '', isFlagged ? 'flagged' : '', i === session.currentIndex ? 'current' : ''].join(' ')}
                aria-label={`Question ${i + 1}${isDone ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`}
                onClick={() => { update({ currentIndex: i }); setNavOpen(false); }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="muted">{total - answered} unanswered · {session.flagged.length} flagged. Unanswered or incomplete questions count as wrong.</p>
        <Button block onClick={() => void submit()}>Submit exam</Button>
        <Button block variant="ghost" onClick={() => setNavOpen(false)}>Keep going</Button>
      </Sheet>
    </div>
  );
}

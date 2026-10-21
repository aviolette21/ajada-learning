import { useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useNow } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { chosenIds, isAnswered, isCorrect, isMultiple, selectCount } from '../../content/answers';
import type { ChoiceId, Question } from '../../content/schema';
import type { MockSession } from '../../study/types';
import { Button } from '../../ui/Button';
import { IconClock, IconClose } from '../../ui/icons';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import '../practice/practice.css';
import { QuestionView } from '../practice/QuestionView';
import { VerdictSheet } from '../practice/VerdictSheet';
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
  const [verdictOpen, setVerdictOpen] = useState(false);
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
  const feedback = session.feedback ?? false;
  const revealedIds = session.revealed ?? [];
  const revealed = revealedIds.includes(qid);
  const rightSoFar = revealedIds.filter((id) => {
    const q = questionById.get(id);
    return q ? isCorrect(q, session.answers[id]) : false;
  }).length;
  // Checking locks the answer in and shows the verdict and explanation.
  const check = (answers = session.answers) => {
    update({ answers, revealed: [...revealedIds, qid] });
    setVerdictOpen(true);
  };
  const pick = (q: Question, id: ChoiceId) => {
    if (revealed) return;
    if (!isMultiple(q)) {
      const answers = { ...session.answers, [q.id]: id };
      if (feedback) check(answers);
      else update({ answers });
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
  const goTo = (i: number) => {
    setVerdictOpen(false);
    update({ currentIndex: i });
  };
  const afterVerdict = () => {
    setVerdictOpen(false);
    if (isLast) setNavOpen(true);
    else update({ currentIndex: session.currentIndex + 1 });
  };
  const canCheck = question !== undefined && feedback && !revealed && (isMultiple(question) || isAnswered(question, session.answers[qid]));

  return (
    <div className={`runner ${verdictOpen ? 'has-sheet' : ''}`}>
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
      {feedback && revealedIds.length > 0 && (
        <p className="mock-tally muted">✓ {rightSoFar} of {revealedIds.length} checked so far right</p>
      )}
      {question && (
        <QuestionView question={question} chosen={session.answers[qid] ?? null} mode={revealed ? 'answer' : 'exam'} revealed={revealed} showReportFlag={false} showSave={false}
          onChoose={(id: ChoiceId) => pick(question, id)} />
      )}
      {canCheck && question && (
        <div className="check-bar">
          <Button block disabled={!isAnswered(question, session.answers[qid])} onClick={() => check()}>
            {isAnswered(question, session.answers[qid]) ? 'Check answer' : `Pick ${selectCount(question) - chosenIds(session.answers[qid]).length} more`}
          </Button>
        </div>
      )}
      <div className="mock-tools">
        <button type="button" className={`chip ${feedback ? 'on' : ''}`} aria-pressed={feedback}
          onClick={() => update({ feedback: !feedback })}>
          💡 {feedback ? 'Showing answers as I go' : 'Show answers as I go'}
        </button>
        {revealed && <button type="button" className="chip" onClick={() => setVerdictOpen(true)}>See explanation</button>}
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
        <Button variant="secondary" disabled={session.currentIndex === 0} onClick={() => goTo(session.currentIndex - 1)}>Back</Button>
        {isLast
          ? <Button onClick={() => setNavOpen(true)}>Review &amp; submit</Button>
          : <Button onClick={() => goTo(session.currentIndex + 1)}>Next</Button>}
      </div>
      <Sheet open={navOpen} label="Question navigator" onClose={() => setNavOpen(false)}>
        <div className="navgrid">
          {session.questionIds.map((id, i) => {
            const isDone = answeredIds.includes(id);
            const isFlagged = session.flagged.includes(id);
            const q = questionById.get(id);
            const result = q && revealedIds.includes(id) ? (isCorrect(q, session.answers[id]) ? 'right' : 'wrong') : null;
            return (
              <button key={id} type="button"
                className={['navcell', isDone ? 'answered' : '', result ?? '', isFlagged ? 'flagged' : '', i === session.currentIndex ? 'current' : ''].join(' ')}
                aria-label={`Question ${i + 1}${isDone ? ', answered' : ''}${result ? `, ${result}` : ''}${isFlagged ? ', flagged' : ''}`}
                onClick={() => { goTo(i); setNavOpen(false); }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="muted">{total - answered} unanswered · {session.flagged.length} flagged. Unanswered or incomplete questions count as wrong.</p>
        <Button block onClick={() => void submit()}>Submit exam</Button>
        <Button block variant="ghost" onClick={() => setNavOpen(false)}>Keep going</Button>
      </Sheet>
      {question && revealed && (
        <VerdictSheet question={question} chosen={session.answers[qid] ?? null} guessed={guessed} open={verdictOpen}
          onClose={() => setVerdictOpen(false)} onContinue={afterVerdict} continueLabel={isLast ? 'Review & submit' : 'Next question'} />
      )}
    </div>
  );
}

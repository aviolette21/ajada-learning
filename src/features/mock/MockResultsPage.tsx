import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { isCorrect } from '../../content/answers';
import type { Question } from '../../content/schema';
import { mockRetryIds, scoreMock } from '../../study/mockExam';
import { PASS_SCORE } from '../../study/readiness';
import { Meter } from '../../ui/Meter';
import { Screen } from '../../ui/Screen';
import '../practice/practice.css';
import { Explanation } from '../practice/Explanation';
import { formatClock } from './MockExamPage';
import { QuestionView } from '../practice/QuestionView';
import './mock.css';

export function MockResultsPage() {
  const { sessionId = '' } = useParams();
  const { questionById, domains, domainById } = useContent();
  const { mockSessions } = useProgress();
  const [wrongOnly, setWrongOnly] = useState(false);
  const session = mockSessions.find((s) => s.id === sessionId);
  if (!session?.submittedAt) return <Navigate to="/practice/mock" replace />;

  const result = scoreMock(session, questionById, domains);
  const retryIds = mockRetryIds(session, questionById);
  const luckyGuesses = (session.guessed ?? []).filter((id) => {
    const q = questionById.get(id);
    return q !== undefined && isCorrect(q, session.answers[id]);
  }).length;
  const review = session.questionIds
    .map((id) => questionById.get(id))
    .filter((q): q is Question => Boolean(q))
    .filter((q) => !wrongOnly || !isCorrect(q, session.answers[q.id]));

  return (
    <Screen title="Results" back="/practice">
      <section className="panel center">
        <div className={`result-score ${result.passes ? 'result-pass' : 'result-fail'}`}>{result.scaledScore}</div>
        <div>{result.passes ? 'Above' : 'Below'} the {PASS_SCORE} pass mark</div>
        <div className="muted">{result.correct} / {result.total} correct ({result.percent}%) · estimated scaled score</div>
        <div className="muted">Time taken: {formatClock(session.submittedAt - session.startedAt)} (the real exam allows 2:00:00)</div>
        {luckyGuesses > 0 && <div className="muted">{luckyGuesses} of those you marked as a guess</div>}
      </section>
      {retryIds.length > 0 && (
        <Link className="btn btn-primary btn-block" to={`/practice/mistakes?ids=${retryIds.join(',')}`}>
          Retry the {retryIds.length} you missed or guessed
        </Link>
      )}
      <section className="panel">
        <h3>By domain</h3>
        {result.byDomain.map((d) => (
          <div key={d.domainId} className="domain-row">
            <span>{domainById.get(d.domainId)?.shortName}</span>
            <span className="muted">{d.correct}/{d.total}</span>
            <Meter value={d.correct / d.total} label={`${domainById.get(d.domainId)?.name} score`} />
          </div>
        ))}
      </section>
      <div className="review-head">
        <h3>Review</h3>
        <button type="button" className={`chip ${wrongOnly ? 'on' : ''}`} aria-pressed={wrongOnly} onClick={() => setWrongOnly((w) => !w)}>Wrong only</button>
      </div>
      {review.map((q) => (
        <div key={q.id} className="panel">
          <QuestionView question={q} chosen={session.answers[q.id] ?? null} mode="review" />
          <div style={{ marginTop: 10 }}><Explanation question={q} /></div>
          <a className="source" href={q.source.url} target="_blank" rel="noreferrer">📎 Source: {q.source.title}</a>
        </div>
      ))}
    </Screen>
  );
}

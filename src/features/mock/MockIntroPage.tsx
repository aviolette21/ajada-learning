import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { buildMockExam, MOCK_QUESTION_COUNT, remainingMs } from '../../study/mockExam';
import { PASS_SCORE } from '../../study/readiness';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import './mock.css';

export function MockIntroPage() {
  const navigate = useNavigate();
  const { questions, domains } = useContent();
  const { attempts, mockSessions, saveMockSession, submitMock, discardMockSession } = useProgress();
  const { now } = useClock();
  const active = mockSessions.find((s) => !s.submittedAt && remainingMs(s, now().getTime()) > 0);
  const count = Math.min(MOCK_QUESTION_COUNT, questions.length);
  const [timedOutId, setTimedOutId] = useState<string | null>(null);

  // An exam whose clock ran out while the app was closed is submitted here, so it lands in History.
  useEffect(() => {
    const t = now().getTime();
    const expired = mockSessions.filter((s) => !s.submittedAt && remainingMs(s, t) <= 0);
    if (expired.length === 0) return;
    const latest = expired.reduce((a, b) => (b.startedAt > a.startedAt ? b : a));
    void Promise.all(expired.map((s) => submitMock(s))).then(() => setTimedOutId(latest.id));
  }, [mockSessions, submitMock, now]);

  const start = async () => {
    if (active) {
      if (!window.confirm('Discard your exam in progress and start a new one?')) return;
      await discardMockSession(active.id);
    }
    const t = now().getTime();
    const s = buildMockExam({ id: `mock-${t}`, domains, questions, attempts, rng: Math.random, now: t });
    await saveMockSession(s);
    navigate(`/practice/mock/${s.id}`);
  };

  return (
    <Screen title="Mock exam" back="/practice">
      <section className="panel">
        <h2>Exam conditions</h2>
        <ul className="rules">
          <li>{MOCK_QUESTION_COUNT} questions, weighted by domain like the real exam</li>
          <li>120-minute timer; it keeps running if you leave</li>
          <li>No explanations until you submit</li>
          <li>Flag questions to revisit; unanswered questions count as wrong</li>
          <li>Pass mark: {PASS_SCORE} / 1000</li>
        </ul>
      </section>
      {count < MOCK_QUESTION_COUNT && (
        <p className="banner">The question bank has {questions.length} questions so far, so this mock uses {count}. Full 53-question mocks arrive with the content update.</p>
      )}
      {timedOutId && (
        <p className="banner"><Link to={`/practice/mock/${timedOutId}/results`}>Your last exam timed out and was submitted — see results</Link></p>
      )}
      {active && <Button block onClick={() => navigate(`/practice/mock/${active.id}`)}>Resume exam in progress</Button>}
      <Button block variant={active ? 'secondary' : 'primary'} onClick={() => void start()}>Start a new mock exam</Button>
    </Screen>
  );
}

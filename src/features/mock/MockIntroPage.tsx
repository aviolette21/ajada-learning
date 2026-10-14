import { useNavigate } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { buildMockExam, MOCK_QUESTION_COUNT } from '../../study/mockExam';
import { PASS_SCORE } from '../../study/readiness';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import './mock.css';

export function MockIntroPage() {
  const navigate = useNavigate();
  const { questions, domains } = useContent();
  const { attempts, mockSessions, saveMockSession, discardMockSession } = useProgress();
  const { now } = useClock();
  const active = mockSessions.find((s) => !s.submittedAt);
  const count = Math.min(MOCK_QUESTION_COUNT, questions.length);

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
          <li>No time limit: a clock shows how long you've taken (the real exam gives 120 minutes, about 2¼ min per question)</li>
          <li>Some questions say "Select TWO" (or THREE); you score only if every pick is right</li>
          <li>No explanations until you submit, then every question is explained</li>
          <li>Underlined terms still show their definition when tapped</li>
          <li>Flag questions to revisit; unanswered questions count as wrong</li>
          <li>Pass mark: {PASS_SCORE} / 1000</li>
        </ul>
      </section>
      {count < MOCK_QUESTION_COUNT && (
        <p className="banner">The question bank has {questions.length} questions so far, so this mock uses {count}. Full 53-question mocks arrive with the content update.</p>
      )}
      {active && <Button block onClick={() => navigate(`/practice/mock/${active.id}`)}>Resume exam in progress</Button>}
      <Button block variant={active ? 'secondary' : 'primary'} onClick={() => start().catch(ignore)}>Start a new mock exam</Button>
    </Screen>
  );
}

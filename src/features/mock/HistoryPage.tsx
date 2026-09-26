import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { scoreMock } from '../../study/mockExam';
import { IconChevron } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import './mock.css';

export function HistoryPage() {
  const { questionById, domains } = useContent();
  const { mockSessions } = useProgress();
  const done = mockSessions.filter((s) => s.submittedAt).sort((a, b) => b.submittedAt! - a.submittedAt!);
  const scores = done.map((s) => scoreMock(s, questionById, domains).scaledScore);

  return (
    <Screen title="History" back="/practice">
      {done.length === 0 && <p className="empty">No mock exams yet. Your scores will appear here.</p>}
      {done.map((s, i) => {
        const delta = i + 1 < scores.length ? scores[i] - scores[i + 1] : null;
        return (
          <Link key={s.id} className="panel panel-link" to={`/practice/mock/${s.id}/results`}>
            <span className="grow">
              <strong>Mock exam · {new Date(s.submittedAt!).toLocaleDateString()}</strong>
              <span className="muted"> {scores[i]} / 1000{delta !== null ? ` · ${delta >= 0 ? '+' : ''}${delta}` : ''}</span>
            </span>
            <span className="chev"><IconChevron /></span>
          </Link>
        );
      })}
    </Screen>
  );
}

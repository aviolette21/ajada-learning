import { isCorrect } from '../../content/answers';
import type { Chosen, Question } from '../../content/schema';
import { IconChevron } from '../../ui/icons';
import { Explanation } from './Explanation';
import { QuestionView } from './QuestionView';

export interface ReviewEntry { question: Question; chosen?: Chosen | null; saved?: boolean }

/** Collapsed questions that open to the full answer: every choice's reason, the why, the takeaway and the source. */
export function ReviewList({ entries }: { entries: ReviewEntry[] }) {
  return (
    <>
      {entries.map(({ question: q, chosen, saved }) => {
        const answered = chosen != null;
        const right = answered && isCorrect(q, chosen);
        return (
          <details key={q.id} className="panel review-item">
            <summary>
              {answered && <span className={`review-mark ${right ? 'right' : 'wrong'}`} aria-label={right ? 'Right' : 'Wrong'}>{right ? '✓' : '✗'}</span>}
              {saved && <span className="review-mark saved" aria-label="Saved">🔖</span>}
              <span className="grow">{q.topic}<span className="muted"> · {q.stem.length > 110 ? `${q.stem.slice(0, 110)}…` : q.stem}</span></span>
              <span className="chev"><IconChevron /></span>
            </summary>
            <div className="review-body">
              <QuestionView question={q} chosen={chosen ?? null} mode="review" />
              <div style={{ marginTop: 10 }}><Explanation question={q} /></div>
              <a className="source" href={q.source.url} target="_blank" rel="noreferrer">📎 Source: {q.source.title}</a>
            </div>
          </details>
        );
      })}
    </>
  );
}

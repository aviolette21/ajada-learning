import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { accuracyBy } from '../../study/accuracy';
import { PASS_FRACTION, PASS_SCORE, readiness, scoreStatus, STATUS_LABEL } from '../../study/readiness';
import { TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import { IconGear } from '../../ui/icons';
import { Meter } from '../../ui/Meter';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { HomeBanners } from './HomeBanners';

export function TodayPage() {
  const { domains, questionById } = useContent();
  const p = useProgress();
  const r = readiness(domains, p.attempts, questionById);
  const byDomain = accuracyBy(p.attempts, questionById, 'domainId');
  // Biggest likely point loss first: exam weight × (1 − accuracy), with untested domains counting as 0% accuracy.
  const atStake = (id: string, weight: number) => weight * (1 - (byDomain.get(id)?.accuracy ?? 0));
  const ordered = [...domains].sort((a, b) => atStake(b.id, b.weight) - atStake(a.id, a.weight));
  const remaining = r.available ? 0 : r.needed - r.answered;

  return (
    <Screen title="Today" action={<Link to="/settings" className="icon-btn" aria-label="Settings"><IconGear /></Link>}>
      <HomeBanners />
      <section className="panel" aria-label="Exam readiness">
        {r.available ? (
          <>
            <div className="muted">Exam readiness · estimate</div>
            <div className="big-num">{r.percent}%</div>
            <div className="muted">Predicted score ≈ {r.score} / 1000 · pass is {PASS_SCORE}</div>
          </>
        ) : (
          <>
            <div className="muted">Exam readiness</div>
            <p>Answer {remaining} more question{remaining === 1 ? '' : 's'} to unlock your readiness estimate.</p>
            <ProgressBar value={r.answered / r.needed} label="Progress toward a readiness estimate" />
          </>
        )}
      </section>
      <section className="panel">
        <h2>Today's session</h2>
        <p className="muted">{TODAY_QUESTION_COUNT} practice questions, starting with ones you missed and your weakest areas · about 20 min</p>
        <Link className="btn btn-primary btn-block" to="/session">Start today's session</Link>
        <Link className="btn btn-secondary btn-block" to="/practice/mock" style={{ marginTop: 8 }}>Take a mock exam</Link>
      </section>
      <section className="panel">
        <h2>Your readiness by domain</h2>
        <p className="muted readiness-key">
          The bar is your score in that domain. <span className="key good">Green</span> = at or above the pass line
          (~{Math.round(PASS_FRACTION * 100)}%), <span className="key mid">yellow</span> = close, <span className="key low">red</span> = needs work.
          Biggest point losses are listed first; tap one for its topics.
        </p>
        {ordered.map((d) => {
          const acc = byDomain.get(d.id)?.accuracy ?? null;
          return (
            <Link key={d.id} className="domain-row domain-link" to="/practice/progress">
              <span>{d.shortName} <span className="muted">· {Math.round(d.weight)}% of exam</span></span>
              <span className={`status status-${scoreStatus(acc)}`}>{acc === null ? '' : `${Math.round(acc * 100)}% · `}{STATUS_LABEL[scoreStatus(acc)]}</span>
              <Meter score value={acc} label={`${d.name} score`} />
            </Link>
          );
        })}
        <Link className="muted" to="/practice/progress">See all 25 topics →</Link>
      </section>
    </Screen>
  );
}

import { Link } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { accuracyBy } from '../../study/accuracy';
import { PASS_SCORE, readiness } from '../../study/readiness';
import { buildQueue } from '../../study/scheduler';
import { TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import { IconGear } from '../../ui/icons';
import { Meter } from '../../ui/Meter';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { HomeBanners } from './HomeBanners';

export function TodayPage() {
  const { domains, cards, questionById } = useContent();
  const p = useProgress();
  const { now } = useClock();
  const r = readiness(domains, p.attempts, questionById);
  const due = buildQueue({
    cardIds: cards.map((c) => c.id), states: p.cardStates, mode: p.settings.cardDirection, now: now(),
    newPerDay: p.settings.newCardsPerDay, rng: () => 0,
  }).length;
  const byDomain = accuracyBy(p.attempts, questionById, 'domainId');
  const ordered = [...domains].sort((a, b) => b.weight - a.weight);
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
        <p className="muted">{due} card{due === 1 ? '' : 's'} due · {TODAY_QUESTION_COUNT} questions from your weakest areas · about 15 min</p>
        <Link className="btn btn-primary btn-block" to="/session">Start today's session</Link>
      </section>
      <section className="panel">
        <div className="muted">By domain (exam weight)</div>
        {ordered.map((d) => {
          const s = byDomain.get(d.id);
          return (
            <div key={d.id} className="domain-row">
              <span>{d.shortName} <span className="muted">{Math.round(d.weight)}%</span></span>
              <span className="muted">{s?.accuracy == null ? 'not started' : `${Math.round(s.accuracy * 100)}%`}</span>
              <Meter value={s?.accuracy ?? null} label={`${d.name} accuracy`} />
            </div>
          );
        })}
      </section>
    </Screen>
  );
}

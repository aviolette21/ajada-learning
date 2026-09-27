import { Link } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { buildQueue } from '../../study/scheduler';
import { IconChevron } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import './cards.css';
import { DirectionToggle } from './DirectionToggle';

export function CardsPage() {
  const { cards, domains } = useContent();
  const { cardStates, settings, updateSettings } = useProgress();
  const { now } = useClock();
  const due = buildQueue({
    cardIds: cards.map((c) => c.id), states: cardStates, mode: settings.cardDirection, now: now(),
    newPerDay: settings.newCardsPerDay, rng: () => 0,
  }).length;
  const vocab = cards.filter((c) => c.isVocab).length;

  return (
    <Screen title="Flashcards">
      <section className="panel">
        <div className="big-num">{due}</div>
        <p className="muted">{due === 1 ? 'card ready to review' : 'cards ready to review'}</p>
        <div style={{ margin: '12px 0' }}>
          <DirectionToggle value={settings.cardDirection} onChange={(m) => updateSettings({ cardDirection: m }).catch(ignore)} />
        </div>
        <Link className="btn btn-primary btn-block" to="/cards/review">{due > 0 ? 'Start review' : 'Open review'}</Link>
      </section>
      <Link className="panel panel-link" to="/cards/glossary">
        <span className="grow"><h2>Vocabulary glossary</h2><span className="muted">{vocab} term{vocab === 1 ? '' : 's'}, searchable</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <h3 className="section-title">Browse by domain</h3>
      {domains.map((d) => {
        const n = cards.filter((c) => c.domainId === d.id).length;
        return (
          <Link key={d.id} className="panel panel-link" to={`/cards/browse/${d.id}`}>
            <span className="grow"><strong>{d.name}</strong> <span className="muted">· {n} card{n === 1 ? '' : 's'}</span></span>
            <span className="chev"><IconChevron /></span>
          </Link>
        );
      })}
    </Screen>
  );
}

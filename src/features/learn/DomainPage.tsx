import { Link, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { IconChevron } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import './learn.css';

export function DomainPage() {
  const { domainId = '' } = useParams();
  const { domainById, lessons } = useContent();
  const { lessonsDone } = useProgress();
  const domain = domainById.get(domainId);
  if (!domain) return <Screen title="Learn" back="/learn"><p className="empty">Domain not found.</p></Screen>;
  const unofficial = domain.subSkills.some((s) => !s.official);

  return (
    <Screen title={domain.shortName} back="/learn">
      <p className="muted">{domain.name} · {domain.weight}% of the exam</p>
      {unofficial && <p className="banner">This sub-skill breakdown is unofficial until the official exam guide is added.</p>}
      {domain.subSkills.map((s) => {
        const list = lessons.filter((l) => l.subSkillId === s.id && l.domainId === domain.id);
        return (
          <section key={s.id} className="panel">
            <h3>{s.name}{s.weight ? <span className="muted"> · {s.weight}%</span> : null}</h3>
            {list.length === 0 && <p className="muted">Lesson coming in the content update.</p>}
            {list.map((l) => (
              <Link key={l.id} className="sheet-row" to={`/learn/lesson/${l.id}`}>
                <span>{l.title} {lessonsDone.has(l.id) && <span className="badge">Done</span>}</span>
                <span className="chev"><IconChevron /></span>
              </Link>
            ))}
          </section>
        );
      })}
    </Screen>
  );
}

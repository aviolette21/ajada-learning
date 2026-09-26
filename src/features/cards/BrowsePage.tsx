import { useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { Disclosure } from '../../ui/Disclosure';
import { renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import { FlagButton } from '../shared/FlagButton';
import './cards.css';

export function BrowsePage() {
  const { domainId = '' } = useParams();
  const { cards, domainById } = useContent();
  const domain = domainById.get(domainId);
  const list = cards.filter((c) => c.domainId === domainId);
  return (
    <Screen title={domain?.shortName ?? 'Cards'} back="/cards">
      {list.length === 0 ? (
        <p className="empty">No cards in this domain yet. More arrive with the content update.</p>
      ) : (
        <ul className="term-list">
          {list.map((c) => (
            <li key={c.id}>
              <div className="term-row">
                <div className="grow">
                  <div className="term">{c.term}</div>
                  <div className="def">{renderInline(c.definition)}</div>
                </div>
                <FlagButton itemId={c.id} kind="card" />
              </div>
              <Disclosure title="Details">
                <p><strong>Why it matters:</strong> {renderInline(c.whyItMatters)}</p>
                {c.example && <p><strong>Example:</strong> {renderInline(c.example)}</p>}
                <a className="source" href={c.source.url} target="_blank" rel="noreferrer">📎 {c.source.title}</a>
              </Disclosure>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}

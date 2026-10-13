import { useState } from 'react';
import { useContent } from '../../app/ContentContext';
import type { GlossaryTerm } from '../../content/schema';
import { renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import './cards.css';

export function groupGlossary(terms: GlossaryTerm[], query: string): { letter: string; terms: GlossaryTerm[] }[] {
  const q = query.trim().toLowerCase();
  const matches = terms
    .filter((t) => !q || [t.term, ...t.aliases, t.definition].some((s) => s.toLowerCase().includes(q)))
    .sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
  const groups = new Map<string, GlossaryTerm[]>();
  for (const t of matches) {
    const first = t.term.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    groups.set(letter, [...(groups.get(letter) ?? []), t]);
  }
  return [...groups.entries()].map(([letter, list]) => ({ letter, terms: list }));
}

/** Every term that is underlined in questions and lessons, searchable. */
export function GlossaryPage({ back = '/practice' }: { back?: string }) {
  const { glossary } = useContent();
  const [query, setQuery] = useState('');
  const groups = groupGlossary(glossary, query);
  return (
    <Screen title="Glossary" back={back}>
      <input type="search" className="input" placeholder={`Search ${glossary.length} terms`} aria-label="Search terms" value={query} onChange={(e) => setQuery(e.target.value)} />
      {groups.length === 0 && <p className="empty">No terms match “{query}”.</p>}
      {groups.map((g) => (
        <section key={g.letter}>
          <div className="glossary-letter">{g.letter}</div>
          <ul className="term-list">
            {g.terms.map((t) => (
              <li key={t.id}>
                <div className="term-name">{t.term}{t.aliases.length > 0 && <span className="muted"> · {t.aliases.join(', ')}</span>}</div>
                <div className="def">{renderInline(t.definition)}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Screen>
  );
}

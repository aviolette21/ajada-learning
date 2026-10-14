import { useState } from 'react';
import { useContent } from '../../app/ContentContext';
import type { GlossaryTerm } from '../../content/schema';
import { IconChevron } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import './vocab.css';

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

/** Every exam term with its definition; tapping one opens the full entry (the app-wide term sheet, via data-term). */
export function VocabPage() {
  const { glossary } = useContent();
  const [query, setQuery] = useState('');
  const groups = groupGlossary(glossary, query);
  return (
    <Screen title="Vocabulary">
      <input type="search" className="input" placeholder={`Search ${glossary.length} terms`} aria-label="Search terms" value={query} onChange={(e) => setQuery(e.target.value)} />
      {groups.length === 0 && <p className="empty">No terms match “{query}”.</p>}
      {groups.map((g) => (
        <section key={g.letter}>
          <div className="vocab-letter">{g.letter}</div>
          <ul className="vocab-list">
            {g.terms.map((t) => (
              <li key={t.id}>
                <button type="button" className="vocab-item" data-term={t.id} aria-label={`${t.term}: more`}>
                  <span className="vocab-text">
                    <span className="vocab-term">{t.term}{t.aliases.length > 0 && <span className="muted"> · {t.aliases.join(', ')}</span>}</span>
                    <span className="vocab-def">{renderInline(t.definition)}</span>
                  </span>
                  <span className="chev"><IconChevron /></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Screen>
  );
}

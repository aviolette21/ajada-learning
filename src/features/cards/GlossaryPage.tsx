import { useState } from 'react';
import { useContent } from '../../app/ContentContext';
import type { Card } from '../../content/schema';
import { renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import './cards.css';

export function groupGlossary(cards: Card[], query: string): { letter: string; cards: Card[] }[] {
  const q = query.trim().toLowerCase();
  const matches = cards
    .filter((c) => c.isVocab)
    .filter((c) => !q || c.term.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q))
    .sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
  const groups = new Map<string, Card[]>();
  for (const c of matches) {
    const first = c.term.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    groups.set(letter, [...(groups.get(letter) ?? []), c]);
  }
  return [...groups.entries()].map(([letter, list]) => ({ letter, cards: list }));
}

export function GlossaryPage() {
  const { cards } = useContent();
  const [query, setQuery] = useState('');
  const groups = groupGlossary(cards, query);
  return (
    <Screen title="Glossary" back="/cards">
      <input type="search" className="input" placeholder="Search terms" aria-label="Search terms" value={query} onChange={(e) => setQuery(e.target.value)} />
      {groups.length === 0 && <p className="empty">No terms match “{query}”.</p>}
      {groups.map((g) => (
        <section key={g.letter}>
          <div className="glossary-letter">{g.letter}</div>
          <ul className="term-list">
            {g.cards.map((c) => (
              <li key={c.id}>
                <div className="term">{c.term}</div>
                <div className="def">{renderInline(c.definition)}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Screen>
  );
}

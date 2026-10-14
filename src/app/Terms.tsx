import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildTermMatcher, termsIn, type TermMatcher } from '../content/terms';
import { Button } from '../ui/Button';
import { renderInline, type TermLinks } from '../ui/inline';
import { sheetSpring } from '../ui/motion';
import { useContent } from './ContentContext';

const TermsContext = createContext<TermMatcher | null>(null);

/** The glossary matcher, or null when there is no glossary. */
export function useTermMatcher(): TermMatcher | null {
  return useContext(TermsContext);
}

/**
 * Glossary linking for one block of related text. Call it once per question or lesson render and pass the result to
 * every renderInline call in that block, so each term is underlined at its first mention only.
 */
export function useTermLinks(): () => TermLinks | null {
  const matcher = useContext(TermsContext);
  return useCallback(() => (matcher ? { matcher, seen: new Set<string>() } : null), [matcher]);
}

/** Makes glossary terms tappable everywhere: one capture-phase listener opens the definition for any [data-term]. */
export function TermsProvider({ children }: { children: ReactNode }) {
  const { glossary, termById, questions } = useContent();
  const matcher = useMemo(() => (glossary.length > 0 ? buildTermMatcher(glossary) : null), [glossary]);
  // Which questions mention each term, for "Practice questions using this term".
  const questionsByTerm = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!matcher) return map;
    for (const q of questions) {
      for (const id of termsIn([q.stem, ...q.choices.map((c) => c.text)], matcher)) map.set(id, [...(map.get(id) ?? []), q.id]);
    }
    return map;
  }, [matcher, questions]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const termAt = (e: Event) => (e.target instanceof Element ? e.target.closest<HTMLElement>('[data-term]') : null);
    // Capture phase on document runs before React's handlers, so a tap on a term inside a choice doesn't select it.
    const onClick = (e: MouseEvent) => {
      const el = termAt(e);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      setOpenId(el.dataset.term ?? null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
      const el = termAt(e);
      if (!el || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      e.stopPropagation();
      setOpenId(el.dataset.term ?? null);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, []);

  const term = openId ? termById.get(openId) : undefined;
  const practiceIds = term ? (questionsByTerm.get(term.id) ?? []) : [];
  return (
    <TermsContext.Provider value={matcher}>
      {children}
      <AnimatePresence>
        {term && (
          <motion.div key="term-backdrop" className="term-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpenId(null)} />
        )}
        {term && (
          <motion.section key="term-sheet" className="sheet term-sheet" role="dialog" aria-label={`Definition: ${term.term}`}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={sheetSpring}
            // Swipe down to dismiss, like the grip suggests; a short or slow pull springs back.
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) setOpenId(null); }}>
            <div className="sheet-grip" aria-hidden="true" />
            <h3 className="term-title">{term.term}</h3>
            {term.aliases.length > 0 && <div className="muted term-aka">Also: {term.aliases.join(', ')}</div>}
            <p className="term-def">{renderInline(term.definition)}</p>
            {term.whyItMatters && <p className="term-extra"><strong>Why it matters:</strong> {renderInline(term.whyItMatters)}</p>}
            {term.example && <p className="term-extra"><strong>Example:</strong> {renderInline(term.example)}</p>}
            {practiceIds.length > 0 && (
              // The sheet sits outside the router, so this is a plain hash link; HashRouter picks it up.
              <a className="btn btn-secondary btn-block" href={`#/practice/quiz?n=${Math.min(10, practiceIds.length)}&ids=${practiceIds.join(',')}`}
                onClick={() => setOpenId(null)}>
                Practice {Math.min(10, practiceIds.length)} question{practiceIds.length === 1 ? '' : 's'} using this term
              </a>
            )}
            <a className="source" href={term.source.url} target="_blank" rel="noreferrer">📎 Source: {term.source.title}</a>
            <Button block variant="secondary" onClick={() => setOpenId(null)}>Got it</Button>
          </motion.section>
        )}
      </AnimatePresence>
    </TermsContext.Provider>
  );
}

import type { GlossaryTerm } from './schema';

export type Segment = { text: string; termId?: string };

/** Finds glossary terms in study text so they can be underlined and tapped for a definition. */
export interface TermMatcher {
  /** Splits plain text into runs, marking the first mention of each term not already in `seen` (which it updates). */
  split(text: string, seen: Set<string>): Segment[];
  /** The term a whole inline-code span names exactly (`cache_control`), if any. */
  codeTerm(code: string): string | undefined;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** "MCP", "CLAUDE.md" and "PreToolUse" must match exactly; "prompt caching" matches in any case. */
const caseSensitive = (name: string) => (name.match(/[A-Z]/g)?.length ?? 0) >= 2;

function alternation(names: string[], flags: string): RegExp | null {
  if (names.length === 0) return null;
  const alts = [...names].sort((a, b) => b.length - a.length).map(escape).join('|');
  // Whole words only, with an optional plural; never inside a longer identifier like tool_use_id or sub-agent.
  return new RegExp(`(?<![\\w-])(?:${alts})(?:s|es)?(?![\\w-])`, flags);
}

export function buildTermMatcher(glossary: GlossaryTerm[]): TermMatcher {
  const exact = new Map<string, string>();
  const folded = new Map<string, string>();
  for (const t of glossary) {
    for (const name of [t.term, ...t.aliases]) {
      exact.set(name, t.id);
      if (!caseSensitive(name)) folded.set(name.toLowerCase(), t.id);
    }
  }
  const names = [...exact.keys()];
  const sensitive = alternation(names.filter(caseSensitive), 'g');
  const insensitive = alternation(names.filter((n) => !caseSensitive(n)), 'gi');

  const idFor = (found: string): string | undefined => {
    for (const candidate of [found, found.replace(/e?s$/, '')]) {
      const id = exact.get(candidate) ?? folded.get(candidate.toLowerCase());
      if (id) return id;
    }
    return undefined;
  };

  return {
    split(text, seen) {
      const hits: { start: number; end: number; id: string }[] = [];
      for (const re of [sensitive, insensitive]) {
        if (!re) continue;
        re.lastIndex = 0;
        for (const m of text.matchAll(re)) {
          const id = idFor(m[0]);
          if (id) hits.push({ start: m.index, end: m.index + m[0].length, id });
        }
      }
      hits.sort((a, b) => a.start - b.start || b.end - a.end);
      const out: Segment[] = [];
      let at = 0;
      for (const h of hits) {
        if (h.start < at || seen.has(h.id)) continue;
        seen.add(h.id);
        if (h.start > at) out.push({ text: text.slice(at, h.start) });
        out.push({ text: text.slice(h.start, h.end), termId: h.id });
        at = h.end;
      }
      if (at < text.length) out.push({ text: text.slice(at) });
      return out;
    },
    codeTerm: (code) => exact.get(code),
  };
}

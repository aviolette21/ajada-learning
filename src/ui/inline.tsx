import { Fragment, type ReactNode } from 'react';
import type { TermMatcher } from '../content/terms';

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/** Glossary linking for one block of related text (a question, a lesson): each term is linked at its first mention. */
export interface TermLinks { matcher: TermMatcher; seen: Set<string> }

/**
 * A tappable glossary term. It is a span, not a button, because it often sits inside a choice button; the app-wide
 * handler in TermsProvider catches taps and Enter on any [data-term] before the surrounding control sees them.
 */
function Term({ id, children }: { id: string; children: ReactNode }) {
  return <span className="term" data-term={id} role="button" tabIndex={0}>{children}</span>;
}

/** Renders the two inline marks content may use: **bold** (which may contain `code`) and `code`; links glossary terms if given. */
export function renderInline(text: string, links?: TermLinks | null): ReactNode {
  return text.split(TOKEN).filter(Boolean).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{renderInline(part.slice(2, -2), links)}</strong>;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      const id = links?.matcher.codeTerm(code);
      if (links && id && !links.seen.has(id)) {
        links.seen.add(id);
        return <Term key={i} id={id}><code>{code}</code></Term>;
      }
      return <code key={i}>{code}</code>;
    }
    if (!links) return <Fragment key={i}>{part}</Fragment>;
    return (
      <Fragment key={i}>
        {links.matcher.split(part, links.seen).map((seg, j) => (seg.termId ? <Term key={j} id={seg.termId}>{seg.text}</Term> : seg.text))}
      </Fragment>
    );
  });
}

type Run = { list: boolean; lines: string[] };

/** Splits a block into runs of plain lines and runs of consecutive "- " lines. */
function runs(block: string): Run[] {
  const out: Run[] = [];
  for (const line of block.split('\n')) {
    const list = line.startsWith('- ');
    const last = out[out.length - 1];
    if (last && last.list === list) last.lines.push(line);
    else out.push({ list, lines: [line] });
  }
  return out;
}

/** Paragraphs separated by blank lines; within a block, consecutive "- " lines become a list and other lines a paragraph. */
export function Paragraphs({ text, links }: { text: string; links?: TermLinks | null }) {
  return (
    <>
      {text.split(/\n{2,}/).flatMap((block, i) =>
        runs(block).map((run, k) =>
          run.list ? (
            <ul key={`${i}-${k}`}>{run.lines.map((line, j) => <li key={j}>{renderInline(line.replace(/^- /, ''), links)}</li>)}</ul>
          ) : (
            <p key={`${i}-${k}`}>{renderInline(run.lines.join('\n'), links)}</p>
          ),
        ),
      )}
    </>
  );
}

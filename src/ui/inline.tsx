import { Fragment, type ReactNode } from 'react';

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/** Renders the two inline marks content may use: **bold** (which may contain `code`) and `code`. */
export function renderInline(text: string): ReactNode {
  return text.split(TOKEN).filter(Boolean).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{renderInline(part.slice(2, -2))}</strong>;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
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
export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).flatMap((block, i) =>
        runs(block).map((run, k) =>
          run.list ? (
            <ul key={`${i}-${k}`}>{run.lines.map((line, j) => <li key={j}>{renderInline(line.replace(/^- /, ''))}</li>)}</ul>
          ) : (
            <p key={`${i}-${k}`}>{renderInline(run.lines.join('\n'))}</p>
          ),
        ),
      )}
    </>
  );
}

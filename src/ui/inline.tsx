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

/** Paragraphs separated by blank lines; a block whose lines start with "- " becomes a list. */
export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((block, i) =>
        block.startsWith('- ') ? (
          <ul key={i}>{block.split('\n').map((line, j) => <li key={j}>{renderInline(line.replace(/^- /, ''))}</li>)}</ul>
        ) : (
          <p key={i}>{renderInline(block)}</p>
        ),
      )}
    </>
  );
}

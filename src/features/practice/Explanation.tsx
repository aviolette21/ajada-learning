import { useContent } from '../../app/ContentContext';
import { useTermLinks, useTermMatcher } from '../../app/Terms';
import type { GlossaryTerm, Question } from '../../content/schema';
import { termsIn } from '../../content/terms';
import { Disclosure } from '../../ui/Disclosure';
import { renderInline } from '../../ui/inline';

/** The teaching part of an answer: why the answer is right, the one-line takeaway, and the terms the question uses. */
export function Explanation({ question }: { question: Question }) {
  const { termById } = useContent();
  const matcher = useTermMatcher();
  const links = useTermLinks()();
  const terms = matcher
    ? termsIn([question.stem, ...question.choices.flatMap((c) => [c.text, c.reason]), question.explanation ?? '', question.takeaway], matcher)
        .map((id) => termById.get(id))
        .filter((t): t is GlossaryTerm => Boolean(t))
    : [];
  return (
    <>
      {question.explanation && (
        <div className="why"><strong>🔍 Why:</strong> {renderInline(question.explanation, links)}</div>
      )}
      {question.takeaway && <div className="takeaway"><strong>💡 In one line:</strong> {renderInline(question.takeaway, links)}</div>}
      {terms.length > 0 && (
        <Disclosure title={<>📚 Terms: <span className="muted">{terms.map((t) => t.term).join(', ')}</span></>}>
          <dl className="terms-list">
            {terms.map((t) => (
              <div key={t.id}>
                <dt>{t.term}</dt>
                <dd>{renderInline(t.definition)}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      )}
    </>
  );
}

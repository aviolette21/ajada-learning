import { AnimatePresence, motion } from 'motion/react';
import { useContent } from '../../app/ContentContext';
import { useTermLinks } from '../../app/Terms';
import { chosenIds, correctIds, isAnswered, isMultiple, selectInstruction } from '../../content/answers';
import type { ChoiceId, Chosen, Question } from '../../content/schema';
import { IconCheck, IconX } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { FlagButton } from '../shared/FlagButton';
import './practice.css';

/** answer: pick, then annotated once revealed · exam: pick/change freely, no feedback · review: read-only, annotated */
export type QuestionMode = 'answer' | 'exam' | 'review';

export function QuestionView({ question, chosen, onChoose, mode, revealed, showReportFlag = true }: {
  question: Question;
  chosen: Chosen | null;
  /** Called with the tapped choice; the parent decides whether that selects, toggles or is ignored. */
  onChoose?: (id: ChoiceId) => void;
  mode: QuestionMode;
  /** Answer mode: whether the explanation is showing. Defaults to "a complete answer has been picked". */
  revealed?: boolean;
  showReportFlag?: boolean;
}) {
  const { domainById } = useContent();
  const newLinks = useTermLinks();
  const links = newLinks();
  const multiple = isMultiple(question);
  const picked = chosenIds(chosen);
  const answers = correctIds(question);
  const annotated = mode === 'review' || (mode === 'answer' && (revealed ?? isAnswered(question, chosen)));
  const locked = annotated || !onChoose;
  return (
    <article className="qv">
      <div className="qv-top">
        <span className="tag">{domainById.get(question.domainId)?.name}</span>
        {showReportFlag && <FlagButton itemId={question.id} kind="question" />}
      </div>
      <h2 className="qv-stem">{renderInline(question.stem, links)}</h2>
      {multiple && <p className="qv-select">{selectInstruction(question)}</p>}
      <ol className="qv-choices">
        {question.choices.map((c, i) => {
          const isAnswer = answers.includes(c.id);
          const isChosen = picked.includes(c.id);
          const state = !annotated ? (isChosen ? 'selected' : 'idle') : isAnswer ? 'correct' : isChosen ? 'wrong' : 'muted';
          return (
            <li key={c.id}>
              {/* aria-disabled rather than disabled: a disabled button swallows taps on the glossary terms inside it. */}
              <button type="button" className={`choice choice-${state} ${multiple ? 'choice-multi' : ''}`} aria-disabled={locked}
                aria-pressed={isChosen} onClick={() => { if (!locked) onChoose?.(c.id); }}>
                <span className="choice-letter" aria-hidden="true">
                  {c.id.toUpperCase()}
                  {state === 'correct' ? <IconCheck /> : state === 'wrong' ? <IconX /> : null}
                </span>
                <span className="choice-body">
                  <span className="sr-only">{state === 'correct' ? 'Correct answer: ' : state === 'wrong' ? 'Incorrect: ' : ''}</span>
                  <span className="choice-text">
                    {renderInline(c.text, links)}
                    {annotated && isChosen && <em className="choice-yours"> · your answer</em>}
                    {annotated && multiple && isAnswer && !isChosen && <em className="choice-yours"> · you missed this one</em>}
                  </span>
                  <AnimatePresence>
                    {annotated && (
                      <motion.span className="choice-reason" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: 0.05 * i, duration: 0.25 }}>
                        {renderInline(c.reason, links)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

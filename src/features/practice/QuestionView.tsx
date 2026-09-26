import { AnimatePresence, motion } from 'motion/react';
import { useContent } from '../../app/ContentContext';
import type { ChoiceId, Question } from '../../content/schema';
import { IconCheck, IconX } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { FlagButton } from '../shared/FlagButton';
import './practice.css';

/** answer: pick once, then annotated · exam: pick/change freely, no feedback · review: read-only, annotated */
export type QuestionMode = 'answer' | 'exam' | 'review';

export function QuestionView({ question, chosen, onChoose, mode, showReportFlag = true }: {
  question: Question;
  chosen: ChoiceId | null;
  onChoose?: (id: ChoiceId) => void;
  mode: QuestionMode;
  showReportFlag?: boolean;
}) {
  const { domainById } = useContent();
  const annotated = mode === 'review' || (mode === 'answer' && chosen !== null);
  const locked = annotated || !onChoose;
  return (
    <article className="qv">
      <div className="qv-top">
        <span className="tag">{domainById.get(question.domainId)?.name}</span>
        {showReportFlag && <FlagButton itemId={question.id} kind="question" />}
      </div>
      <h2 className="qv-stem">{renderInline(question.stem)}</h2>
      <ol className="qv-choices">
        {question.choices.map((c, i) => {
          const isAnswer = c.id === question.answer;
          const isChosen = c.id === chosen;
          const state = !annotated ? (isChosen ? 'selected' : 'idle') : isAnswer ? 'correct' : isChosen ? 'wrong' : 'muted';
          return (
            <li key={c.id}>
              <button type="button" className={`choice choice-${state}`} disabled={locked} aria-pressed={isChosen}
                onClick={() => onChoose?.(c.id)}>
                <span className="choice-letter" aria-hidden="true">
                  {c.id.toUpperCase()}
                  {state === 'correct' ? <IconCheck /> : state === 'wrong' ? <IconX /> : null}
                </span>
                <span className="choice-body">
                  <span className="sr-only">{state === 'correct' ? 'Correct answer: ' : state === 'wrong' ? 'Incorrect: ' : ''}</span>
                  <span className="choice-text">
                    {renderInline(c.text)}
                    {annotated && isChosen && <em className="choice-yours"> · your answer</em>}
                  </span>
                  <AnimatePresence>
                    {annotated && (
                      <motion.span className="choice-reason" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: 0.05 * i, duration: 0.25 }}>
                        {renderInline(c.reason)}
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

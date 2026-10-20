import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { useTermLinks } from '../../app/Terms';
import type { NeedsTopic } from '../../content/schema';
import { pickRotating, SECTION_QUIZ_SIZE } from '../../study/quiz';
import { scoreStatus, STATUS_LABEL } from '../../study/readiness';
import { Disclosure } from '../../ui/Disclosure';
import { Paragraphs } from '../../ui/inline';
import { Meter } from '../../ui/Meter';
import { Screen } from '../../ui/Screen';
import { FOCUS_DRILL_SIZE, focusQuestions, focusStat } from '../practice/focus';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SnippetBlock } from '../practice/QuestionView';
import { SessionSummary } from '../practice/SessionSummary';
import '../learn/learn.css';
import './needs.css';

/** Every question linked to any topic, once each. */
function allQuestionIds(topics: NeedsTopic[]): string[] {
  return [...new Set(topics.flatMap((t) => t.questionIds))];
}

function TopicBody({ topic }: { topic: NeedsTopic }) {
  const { domainById } = useContent();
  const links = useTermLinks()();
  return (
    <div className="needs-topic">
      <span className="tag">{domainById.get(topic.domainId)?.name}</span>
      {topic.note && (
        <blockquote className="needs-note">
          <strong>From your notes</strong>
          <p>{topic.note}</p>
        </blockquote>
      )}
      <h3>What it is</h3>
      <Paragraphs text={topic.definition} links={links} />
      {topic.snippet && <SnippetBlock snippet={topic.snippet} />}
      <div className="lesson-example">
        <strong>Example</strong>
        <Paragraphs text={topic.example} links={links} />
      </div>
      <div className="needs-exam">
        <strong>On the exam</strong>
        <Paragraphs text={topic.exam} links={links} />
      </div>
      {topic.questionIds.length > 0 && (
        <Link className="btn btn-block" to={`/needs-improvement/drill?topic=${topic.id}`}>
          Drill this topic · {Math.min(FOCUS_DRILL_SIZE, topic.questionIds.length)} questions
        </Link>
      )}
    </div>
  );
}

/** The topics the learner flagged in Notes/HELP.md, grouped, each with a definition, an example and its exam angle. */
export function NeedsImprovementPage() {
  const { needsImprovement } = useContent();
  const { attempts } = useProgress();
  const groups = [...new Set(needsImprovement.map((t) => t.group))];
  const pool = allQuestionIds(needsImprovement).length;
  return (
    <Screen title="Needs improvement" back="/learn">
      <p className="muted">The topics from your notes that needed more explanation. Open one for a definition, an example and how the exam asks about it, then drill it.</p>
      {pool > 0 && (
        <>
          <Link className="btn btn-primary btn-block" to="/needs-improvement/drill">Practice all these topics · {Math.min(SECTION_QUIZ_SIZE, pool)} questions</Link>
          <p className="muted center-text">A fresh mix each time, from {pool} questions across {needsImprovement.length} topics.</p>
        </>
      )}
      {groups.map((group) => (
        <section key={group}>
          <h2 className="needs-group">{group}</h2>
          <div className="panel needs-list">
            {needsImprovement.filter((t) => t.group === group).map((t) => {
              const stat = focusStat(t, attempts);
              const status = scoreStatus(stat.accuracy, stat.seen);
              const score = stat.accuracy === null ? 'not practised yet' : `${Math.round(stat.accuracy * 100)}% · ${STATUS_LABEL[status]}`;
              return (
                <Disclosure
                  key={t.id}
                  title={
                    <span className="needs-row">
                      <span>{t.title}</span>
                      {t.questionIds.length > 0 && (
                        <>
                          <span className="muted">{score}</span>
                          <Meter status={status} value={stat.accuracy} label={`${t.title} accuracy`} />
                        </>
                      )}
                    </span>
                  }
                >
                  <TopicBody topic={t} />
                </Disclosure>
              );
            })}
          </div>
        </section>
      ))}
      {needsImprovement.length === 0 && <p className="empty">No topics yet.</p>}
    </Screen>
  );
}

/** A drill over one topic's questions (?topic=id) or over every topic's, rotating in the least recently seen. */
export function NeedsDrillPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { needsImprovement, questionById } = useContent();
  const { attempts } = useProgress();
  const topic = needsImprovement.find((t) => t.id === params.get('topic'));
  const [picked] = useState(() => {
    const primary = focusQuestions({ questionIds: topic ? topic.questionIds : allQuestionIds(needsImprovement) }, questionById);
    return pickRotating({ primary, attempts, count: topic ? FOCUS_DRILL_SIZE : SECTION_QUIZ_SIZE, rng: Math.random });
  });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate('/needs-improvement');
  if (summary) return <SessionSummary summary={summary} extra="Drill it again for a new set of questions." onDone={back} doneLabel="Back to Needs improvement" />;
  return <QuestionRunner questions={picked} mode="quiz" title={topic?.title ?? 'Needs improvement'} onFinish={setSummary} onExit={back} />;
}

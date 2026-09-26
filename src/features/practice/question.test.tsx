import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { QuestionRunner } from './QuestionRunner';
import { QuestionView } from './QuestionView';
import { VerdictSheet } from './VerdictSheet';

const content = fixtureContent();
const q1 = content.questionById.get('q-alpha-1')!;
const choice = (text: RegExp) => screen.getByRole('button', { name: text });

describe('QuestionView', () => {
  it('shows plain choices until one is chosen', async () => {
    const onChoose = vi.fn();
    await renderWithApp(<QuestionView question={q1} chosen={null} onChoose={onChoose} mode="answer" />);
    await userEvent.click(await screen.findByRole('button', { name: /Wrong one q-alpha-1/ }));
    expect(onChoose).toHaveBeenCalledWith('b');
    expect(screen.queryByText('Why a is right for q-alpha-1')).toBeNull();
  });

  it('after answering, marks right and wrong and shows every reason', async () => {
    await renderWithApp(<QuestionView question={q1} chosen="b" mode="answer" />);
    await screen.findByText('Why a is right for q-alpha-1');
    for (const r of ['Why b is wrong', 'Why c is wrong', 'Why d is wrong']) expect(screen.getByText(`${r} for q-alpha-1`)).toBeInTheDocument();
    expect(choice(/Right answer q-alpha-1/)).toHaveClass('choice-correct');
    expect(choice(/Wrong one q-alpha-1/)).toHaveClass('choice-wrong');
    expect(choice(/Wrong one q-alpha-1/)).toHaveTextContent('your answer');
    expect(choice(/Wrong two q-alpha-1/)).toHaveClass('choice-muted');
    expect(choice(/Right answer q-alpha-1/)).toBeDisabled();
    expect(choice(/Right answer q-alpha-1/)).toHaveTextContent(/^A/);
  });

  it('in exam mode highlights the selection and hides reasons', async () => {
    await renderWithApp(<QuestionView question={q1} chosen="c" onChoose={() => {}} mode="exam" />);
    expect(await screen.findByRole('button', { name: /Wrong two q-alpha-1/ })).toHaveClass('choice-selected');
    expect(choice(/Right answer q-alpha-1/)).not.toBeDisabled();
    expect(screen.queryByText('Why a is right for q-alpha-1')).toBeNull();
  });

  it('in review mode reveals the answer even when unanswered', async () => {
    await renderWithApp(<QuestionView question={q1} chosen={null} mode="review" />);
    expect(await screen.findByText('Why a is right for q-alpha-1')).toBeInTheDocument();
    expect(choice(/Right answer q-alpha-1/)).toHaveClass('choice-correct');
  });
});

describe('VerdictSheet', () => {
  it('explains a wrong answer with takeaway, diagram, memory tip, related cards, lesson and source', async () => {
    const onContinue = vi.fn();
    await renderWithApp(<VerdictSheet question={q1} chosen="b" open onContinue={onContinue} />);
    expect(await screen.findByText(/Not quite\. The answer is A\./)).toBeInTheDocument();
    expect(screen.getByText('Takeaway q-alpha-1')).toBeInTheDocument();
    expect(screen.getByText('Step one')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Remember it/ }));
    expect(screen.getByText('Remember alpha')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /1 related flashcard/ }));
    expect(screen.getByText('Alpha term')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read the lesson/ })).toHaveAttribute('href', '/learn/lesson/l-alpha');
    expect(screen.getByRole('link', { name: /Source: Example doc/ })).toHaveAttribute('href', 'https://example.com/docs');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('celebrates a right answer', async () => {
    await renderWithApp(<VerdictSheet question={q1} chosen="a" open onContinue={() => {}} />);
    expect(await screen.findByText('Correct!')).toBeInTheDocument();
  });
});

describe('QuestionRunner', () => {
  it('runs through questions, records attempts and reports a summary', async () => {
    const onFinish = vi.fn();
    const { db } = await renderWithApp(
      <QuestionRunner questions={[q1, content.questionById.get('q-beta-1')!]} mode="quiz" title="Quiz" onFinish={onFinish} onExit={() => {}} />,
    );
    expect(await screen.findByText('Quiz · 1 / 2')).toBeInTheDocument();
    await userEvent.click(choice(/Right answer q-alpha-1/));
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    await userEvent.click(await screen.findByRole('button', { name: /Wrong one q-beta-1/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(onFinish).toHaveBeenCalledWith({ correct: 1, total: 2 });
    await waitFor(async () => expect(await db.getAttempts()).toHaveLength(2));
  });
});

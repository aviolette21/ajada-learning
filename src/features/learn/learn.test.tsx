import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { SAVE_FAILED } from '../../app/Notifier';
import { DomainPage } from './DomainPage';
import { LearnPage } from './LearnPage';
import { LessonCheckPage } from './LessonCheckPage';
import { LessonPage } from './LessonPage';

describe('LearnPage', () => {
  it('lists domains by weight with lesson progress', async () => {
    await renderWithApp(<LearnPage />, { route: '/learn', path: '/learn' });
    const link = await screen.findByRole('link', { name: /Alpha Domain/ });
    expect(link).toHaveAttribute('href', '/learn/alpha');
    expect(link).toHaveTextContent('60% of exam · 0 of 1 lessons done');
  });
});

describe('DomainPage', () => {
  it('shows sub-skills with their lessons', async () => {
    await renderWithApp(<DomainPage />, { route: '/learn/alpha', path: '/learn/:domainId' });
    expect(await screen.findByText(/Alpha One/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alpha lesson/ })).toHaveAttribute('href', '/learn/lesson/l-alpha');
  });
  it('marks unofficial sub-skill maps and missing lessons', async () => {
    await renderWithApp(<DomainPage />, { route: '/learn/beta', path: '/learn/:domainId' });
    expect(await screen.findByText(/unofficial until the official exam guide/)).toBeInTheDocument();
    expect(screen.getByText('Lesson coming in the content update.')).toBeInTheDocument();
  });
});

describe('LessonPage', () => {
  it('renders summary, key points, sections with inline marks, sources and the check link', async () => {
    await renderWithApp(<LessonPage />, { route: '/learn/lesson/l-alpha', path: '/learn/lesson/:lessonId' });
    expect(await screen.findByRole('heading', { name: 'Alpha lesson' })).toBeInTheDocument();
    expect(screen.getByText('Alpha summary')).toBeInTheDocument();
    expect(screen.getByText('Point two')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'First section' })).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: /Example doc/ })).toHaveAttribute('href', 'https://example.com/docs');
    expect(screen.getByRole('link', { name: /Check yourself/ })).toHaveAttribute('href', '/learn/lesson/l-alpha/check');
  });
});

describe('LessonCheckPage', () => {
  it('runs the three check questions and marks the lesson done', async () => {
    const { db } = await renderWithApp(<LessonCheckPage />, { route: '/learn/lesson/l-alpha/check', path: '/learn/lesson/:lessonId/check' });
    for (const id of ['q-alpha-1', 'q-alpha-2', 'q-alpha-3']) {
      await userEvent.click(await screen.findByRole('button', { name: new RegExp(`Right answer ${id}`) }));
      await userEvent.click(await screen.findByRole('button', { name: id === 'q-alpha-3' ? 'Finish' : 'Continue' }));
    }
    expect(await screen.findByText('3 / 3')).toBeInTheDocument();
    await waitFor(async () => expect(await db.getLessonsDone()).toMatchObject([{ lessonId: 'l-alpha' }]));
  });
  it('still shows the summary, and says so, when the lesson cannot be marked done', async () => {
    const db = await openTestDb();
    vi.spyOn(db, 'markLessonDone').mockRejectedValue(new Error('quota exceeded'));
    await renderWithApp(<LessonCheckPage />, { db, route: '/learn/lesson/l-alpha/check', path: '/learn/lesson/:lessonId/check' });
    for (const id of ['q-alpha-1', 'q-alpha-2', 'q-alpha-3']) {
      await userEvent.click(await screen.findByRole('button', { name: new RegExp(`Right answer ${id}`) }));
      await userEvent.click(await screen.findByRole('button', { name: id === 'q-alpha-3' ? 'Finish' : 'Continue' }));
    }
    expect(await screen.findByText('3 / 3')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(SAVE_FAILED);
  });
});

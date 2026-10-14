import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureRaw } from '../../content/fixtures';
import { validateContent } from '../../content/validate';
import { LearnPage } from '../learn/LearnPage';
import { LessonPage } from '../learn/LessonPage';
import { courseReturn } from './course';
import { CoursePage } from './CoursePage';
import { CourseQuizPage } from './CourseQuizPage';
import { CourseSectionPage } from './CourseSectionPage';

describe('course content', () => {
  it('rejects a module that links an unknown lesson', () => {
    const raw = fixtureRaw();
    raw.course = [{ id: 's', number: 1, title: 'T', summary: 'S', modules: [{ title: 'M', lessonId: 'l-missing' }], takeaways: [{ title: 'a', body: 'b' }] }];
    const result = validateContent(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('course.json: s links unknown lesson "l-missing"');
  });
  it('only honours course paths as a return target', () => {
    expect(courseReturn('/course/section-1')).toBe('/course/section-1');
    expect(courseReturn('https://evil.example')).toBeNull();
    expect(courseReturn(null)).toBeNull();
  });
});

describe('CoursePage', () => {
  it('lists sections with module progress', async () => {
    await renderWithApp(<CoursePage />, { route: '/course', path: '/course' });
    const link = await screen.findByRole('link', { name: /Section 1 · Foundations/ });
    expect(link).toHaveAttribute('href', '/course/section-1');
    expect(link).toHaveTextContent('0 of 1 modules done');
  });
  it('is reachable from the Learn page', async () => {
    await renderWithApp(<LearnPage />, { route: '/learn', path: '/learn' });
    expect(await screen.findByRole('link', { name: /Course sections/ })).toHaveAttribute('href', '/course');
  });
});

describe('CourseSectionPage', () => {
  it('shows modules, the section quiz and the recap', async () => {
    await renderWithApp(<CourseSectionPage />, { route: '/course/section-1', path: '/course/:sectionId' });
    expect(await screen.findByRole('link', { name: /Alpha module/ })).toHaveAttribute('href', '/learn/lesson/l-alpha?from=%2Fcourse%2Fsection-1');
    expect(screen.getByRole('link', { name: 'Section 1 quiz · 3 questions' })).toHaveAttribute('href', '/course/section-1/quiz');
    expect(screen.getByText('Takeaway title')).toBeInTheDocument();
  });
});

describe('LessonPage from the course', () => {
  it('shows examples and definitions, and returns to the course', async () => {
    await renderWithApp(<LessonPage />, { route: '/learn/lesson/l-alpha?from=%2Fcourse%2Fsection-1', path: '/learn/lesson/:lessonId' });
    expect(await screen.findByText('Example')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Definitions/ }));
    expect(within(document.querySelector('.terms-list') as HTMLElement).getByText('gizmo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Check yourself/ })).toHaveAttribute('href', '/learn/lesson/l-alpha/check?from=%2Fcourse%2Fsection-1');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/course/section-1');
  });
});

describe('CourseQuizPage', () => {
  it('runs every question from the section', async () => {
    await renderWithApp(<CourseQuizPage />, { route: '/course/section-1/quiz', path: '/course/:sectionId/quiz' });
    for (let i = 0; i < 3; i++) {
      await userEvent.click(await screen.findByRole('button', { name: /Right answer q-alpha/ }));
      await userEvent.click(await screen.findByRole('button', { name: i === 2 ? 'Finish' : 'Continue' }));
    }
    expect(await screen.findByText('3 / 3')).toBeInTheDocument();
  });
});

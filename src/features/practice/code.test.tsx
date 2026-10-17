import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureRaw } from '../../content/fixtures';
import { validateContent } from '../../content/validate';
import { CodeDrillPage } from './CodeDrillPage';
import { PracticePage } from './PracticePage';

describe('question snippets', () => {
  it('rejects a snippet line too wide for a phone', () => {
    const raw = fixtureRaw();
    const qs = raw.files['alpha/questions.json'] as Record<string, unknown>[];
    qs[0] = { ...qs[0], snippet: { language: 'json', code: `{"x": "${'y'.repeat(60)}"}` } };
    const result = validateContent(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/snippet has a line longer than 52 characters/);
  });
});

describe('CodeDrillPage', () => {
  it('is linked from Practice with the snippet count', async () => {
    await renderWithApp(<PracticePage />, { route: '/practice', path: '/practice' });
    const link = await screen.findByRole('link', { name: /Code & payloads/ });
    expect(link).toHaveAttribute('href', '/practice/code');
    expect(link).toHaveTextContent('1 questions');
  });
  it('runs only questions with a snippet, and shows the code', async () => {
    await renderWithApp(<CodeDrillPage />, { route: '/practice/code', path: '/practice/code' });
    expect(await screen.findByText('Stem for q-alpha-2?')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText(/gizmo = make_gizmo\(\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Right answer q-alpha-2/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
  });
});

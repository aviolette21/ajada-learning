import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { PracticePage } from './PracticePage';
import { QuizPage } from './QuizPage';
import { WeakSpotsPage } from './WeakSpotsPage';

describe('PracticePage', () => {
  it('starts a quick quiz limited to the selected domains', async () => {
    await renderWithApp(<PracticePage />, { route: '/practice', path: '/practice' });
    await userEvent.click(await screen.findByRole('button', { name: 'Beta' }));
    await userEvent.click(screen.getByRole('button', { name: /Quick quiz/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/practice\/quiz\?d=alpha$/);
  });
  it('links to weak spots, mock exam and history', async () => {
    await renderWithApp(<PracticePage />, { route: '/practice', path: '/practice' });
    expect(await screen.findByRole('link', { name: /Weak spots/ })).toHaveAttribute('href', '/practice/weak');
    expect(screen.getByRole('link', { name: /Mock exam/ })).toHaveAttribute('href', '/practice/mock');
    expect(screen.getByRole('link', { name: /History/ })).toHaveAttribute('href', '/practice/history');
  });
});

describe('QuizPage', () => {
  it('runs a quiz for the chosen domain and shows a summary', async () => {
    await renderWithApp(<QuizPage />, { route: '/practice/quiz?d=beta', path: '/practice/quiz' });
    expect(await screen.findByText('Stem for q-beta-1?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Right answer q-beta-1/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/practice$/);
  });
});

describe('WeakSpotsPage', () => {
  it('serves questions even with no history', async () => {
    await renderWithApp(<WeakSpotsPage />, { route: '/practice/weak', path: '/practice/weak' });
    expect(await screen.findByText(/Weak spots · 1 \/ 4/)).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { openTestDb } from '../../tests/renderWithApp';
import { fixtureContent } from '../content/fixtures';
import { App } from './App';

describe('App shell', () => {
  it('opens on Today and switches tabs', async () => {
    window.location.hash = '#/';
    render(<App db={await openTestDb()} content={fixtureContent()} />);
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Cards' }));
    expect(await screen.findByRole('heading', { name: 'Flashcards' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Learn' }));
    expect(await screen.findByRole('heading', { name: 'Learn' })).toBeInTheDocument();
  });

  it('hides the tab bar during the daily session', async () => {
    window.location.hash = '#/session';
    render(<App db={await openTestDb()} content={fixtureContent()} />);
    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
  });

  it('hides the tab bar during a mock exam', async () => {
    window.location.hash = '#/practice/mock/x';
    render(<App db={await openTestDb()} content={fixtureContent()} />);
    expect(await screen.findByText("This exam session wasn't found.")).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
  });

  it('shows the tab bar on Practice', async () => {
    window.location.hash = '#/practice';
    render(<App db={await openTestDb()} content={fixtureContent()} />);
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});

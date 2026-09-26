import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { BrowsePage } from './BrowsePage';
import { CardsPage } from './CardsPage';
import { GlossaryPage, groupGlossary } from './GlossaryPage';

describe('CardsPage', () => {
  it('shows how many cards are ready and links to review, glossary and domains', async () => {
    await renderWithApp(<CardsPage />, { route: '/cards', path: '/cards' });
    expect(await screen.findByText('cards ready to review')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start review/ })).toHaveAttribute('href', '/cards/review');
    expect(screen.getByRole('link', { name: /Vocabulary glossary/ })).toHaveAttribute('href', '/cards/glossary');
    expect(screen.getByRole('link', { name: /Alpha Domain/ })).toHaveAttribute('href', '/cards/browse/alpha');
  });
  it('saves the direction choice', async () => {
    const { db } = await renderWithApp(<CardsPage />, { route: '/cards', path: '/cards' });
    await userEvent.click(await screen.findByRole('radio', { name: 'Mixed' }));
    expect(await db.getKv('settings')).toMatchObject({ cardDirection: 'mixed' });
  });
});

describe('BrowsePage', () => {
  it('lists the domain cards with flag buttons and details', async () => {
    await renderWithApp(<BrowsePage />, { route: '/cards/browse/alpha', path: '/cards/browse/:domainId' });
    expect(await screen.findByText('Alpha term')).toBeInTheDocument();
    expect(screen.getByText('Alpha definition')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flag as wrong or outdated' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Details/ }));
    expect(screen.getByText('Alpha matters')).toBeInTheDocument();
  });
});

describe('GlossaryPage', () => {
  it('groups vocab terms by letter and filters by search', async () => {
    const c = fixtureContent();
    expect(groupGlossary(c.cards, '')).toEqual([{ letter: 'A', cards: [c.cardById.get('c-alpha-one')] }]);
    expect(groupGlossary(c.cards, 'definition')).toHaveLength(1);
    expect(groupGlossary(c.cards, 'zzz')).toEqual([]);

    await renderWithApp(<GlossaryPage />, { route: '/cards/glossary', path: '/cards/glossary' });
    expect(await screen.findByText('Alpha term')).toBeInTheDocument();
    expect(screen.queryByText('Beta term')).toBeNull();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search terms' }), 'zzz');
    expect(screen.getByText('No terms match “zzz”.')).toBeInTheDocument();
  });
});

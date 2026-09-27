import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { CardReviewSession } from './CardReviewSession';
import { ReviewPage } from './ReviewPage';

const front = () => screen.getByRole('button', { name: /Card front/ });
const frontFace = () => document.querySelector('.deck-slot .fc[role="button"] .fc-front') as HTMLElement;
const flip = async () => userEvent.click(await screen.findByRole('button', { name: /Card front/ }));

describe('CardReviewSession', () => {
  it('flips, shows ratings only after the flip, and completes the session', async () => {
    const onDone = vi.fn();
    const { db } = await renderWithApp(<CardReviewSession mode="forward" onDone={onDone} onExit={() => {}} />);
    expect(await screen.findByRole('button', { name: /Card front/ })).toHaveTextContent('Alpha term');
    expect(screen.queryByRole('button', { name: /^Good/ })).toBeNull();
    await flip();
    for (const r of [/^Again/, /^Hard/, /^Good/, /^Easy/]) expect(await screen.findByRole('button', { name: r })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Easy/ }));
    await waitFor(() => expect(front()).toHaveTextContent('Beta term'));
    await flip();
    await userEvent.click(await screen.findByRole('button', { name: /^Easy/ }));
    expect(await screen.findByText('Session complete')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledWith(2);
    expect(await db.getCardStates()).toHaveLength(2);
  });

  it('brings an "Again" card back later in the same session', async () => {
    await renderWithApp(<CardReviewSession mode="forward" onDone={() => {}} onExit={() => {}} />);
    await flip();
    await userEvent.click(await screen.findByRole('button', { name: /^Again/ }));
    await waitFor(() => expect(front()).toHaveTextContent('Beta term'));
    await flip();
    await userEvent.click(await screen.findByRole('button', { name: /^Easy/ }));
    await waitFor(() => expect(front()).toHaveTextContent('Alpha term'));
  });

  it('ignores a second tap on a rating button while the card is leaving', async () => {
    const { db } = await renderWithApp(<CardReviewSession mode="forward" onDone={() => {}} onExit={() => {}} />);
    await flip();
    const easy = await screen.findByRole('button', { name: /^Easy/ });
    fireEvent.click(easy);
    fireEvent.click(easy);
    await waitFor(() => expect(front()).toHaveTextContent('Beta term'));
    await waitFor(async () => expect(await db.getCardStates()).toHaveLength(1));
    const [alpha] = await db.getCardStates();
    expect(alpha.cardId).toBe('c-alpha-one');
    expect(alpha.fsrs.reps).toBe(1);
  });

  it('lets Enter on the source link through without flipping the card', async () => {
    await renderWithApp(<CardReviewSession mode="forward" onDone={() => {}} onExit={() => {}} />);
    await flip();
    const link = document.querySelector('.deck-slot .fc[role="button"] .source') as HTMLElement;
    fireEvent.keyDown(link, { key: 'Enter' });
    expect(screen.getByRole('button', { name: /Card back/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: /Card back/ }), { key: 'Enter' });
    expect(await screen.findByRole('button', { name: /Card front/ })).toBeInTheDocument();
  });

  it('shows the definition on the front in reverse mode', async () => {
    await renderWithApp(<CardReviewSession mode="reverse" onDone={() => {}} onExit={() => {}} />);
    await screen.findByRole('button', { name: /Card front/ });
    expect(frontFace()).toHaveTextContent('Alpha definition');
    expect(frontFace()).not.toHaveTextContent('Alpha term');
  });

  it('says so when nothing is due', async () => {
    await renderWithApp(<CardReviewSession mode="forward" onDone={() => {}} onExit={() => {}} />, {
      content: { ...fixtureContent(), cards: [] },
    });
    expect(await screen.findByText('Nothing due right now')).toBeInTheDocument();
  });
});

describe('Flashcard layout', () => {
  it('shrinks a long front term and wraps the back in its own scroll container with a fade cue', async () => {
    const content = fixtureContent();
    const cards = content.cards.map((c, i) => (i === 0 ? { ...c, term: 'Streaming ("stream": true)' } : c));
    await renderWithApp(<CardReviewSession mode="forward" onDone={() => {}} onExit={() => {}} />, {
      content: { ...content, cards, cardById: new Map(cards.map((c) => [c.id, c])) },
    });
    expect(await screen.findByRole('button', { name: /Card front/ })).toHaveTextContent('Streaming');
    expect(frontFace().querySelector('.fc-main')).toHaveClass('fc-main-long');
    const back = document.querySelector('.deck-slot .fc[role="button"] .fc-back') as HTMLElement;
    expect(back.querySelector('.fc-scroll .fc-scroll-body .fc-def')).not.toBeNull();
    expect(back.querySelector('.fc-fade')).toHaveAttribute('aria-hidden', 'true');
    expect(back).toHaveAttribute('data-more', 'false');
  });

  it('keeps a short front term at full size', async () => {
    await renderWithApp(<CardReviewSession mode="forward" onDone={() => {}} onExit={() => {}} />);
    expect(await screen.findByRole('button', { name: /Card front/ })).toHaveTextContent('Alpha term');
    expect(frontFace().querySelector('.fc-main')).not.toHaveClass('fc-main-long');
  });
});

describe('ReviewPage', () => {
  it('switches direction and remembers the choice', async () => {
    const { db } = await renderWithApp(<ReviewPage />, { route: '/cards/review', path: '/cards/review' });
    await userEvent.click(await screen.findByRole('radio', { name: 'Def → Term' }));
    await waitFor(() => expect(frontFace()).toHaveTextContent('Alpha definition'));
    await waitFor(async () => expect(await db.getKv('settings')).toMatchObject({ cardDirection: 'reverse' }));
  });
});

import { screen, waitFor } from '@testing-library/react';
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

describe('ReviewPage', () => {
  it('switches direction and remembers the choice', async () => {
    const { db } = await renderWithApp(<ReviewPage />, { route: '/cards/review', path: '/cards/review' });
    await userEvent.click(await screen.findByRole('radio', { name: 'Def → Term' }));
    await waitFor(() => expect(frontFace()).toHaveTextContent('Alpha definition'));
    await waitFor(async () => expect(await db.getKv('settings')).toMatchObject({ cardDirection: 'reverse' }));
  });
});

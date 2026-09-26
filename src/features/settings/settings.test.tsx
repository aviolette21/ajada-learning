import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { serializeBackup } from '../../storage/backup';
import { SettingsPage } from './SettingsPage';

vi.mock('../../storage/share', () => ({ shareOrDownload: vi.fn(async () => {}) }));

const NOW = new Date('2026-09-26T10:00:00');
const now = () => NOW;
const open = (db?: Awaited<ReturnType<typeof openTestDb>>) =>
  renderWithApp(<SettingsPage />, { db, now, route: '/settings', path: '/settings' });

describe('SettingsPage', () => {
  it('adjusts new cards per day in steps of 5', async () => {
    const { db } = await open();
    await userEvent.click(await screen.findByRole('button', { name: 'More new cards' }));
    expect(screen.getByLabelText('New cards per day')).toHaveTextContent('20');
    expect(await db.getKv('settings')).toMatchObject({ newCardsPerDay: 20 });
  });

  it('exports a backup and records when', async () => {
    const { shareOrDownload } = await import('../../storage/share');
    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Export backup' }));
    expect(await screen.findByText('Backup created.')).toBeInTheDocument();
    expect(shareOrDownload).toHaveBeenCalledWith(expect.stringContaining('"app":"ajada-learning"'), 'ajada-backup-2026-09-26.json');
    expect(screen.getByText(/Last backup:/)).toBeInTheDocument();
  });

  it('imports a backup after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { db } = await open();
    const text = serializeBackup({
      cardStates: [], mockSessions: [], lessonsDone: [], flags: [], kv: [],
      attempts: [{ id: 1, questionId: 'q-alpha-1', chosen: 'a', correct: true, mode: 'quiz', at: 1 }],
    }, NOW);
    fireEvent.change(await screen.findByTestId('import-input'), { target: { files: [new File([text], 'b.json', { type: 'application/json' })] } });
    expect(await screen.findByText('Backup restored.')).toBeInTheDocument();
    await waitFor(async () => expect(await db.getAttempts()).toHaveLength(1));
  });

  it('lists flagged items and can unflag them', async () => {
    const db = await openTestDb();
    await db.putFlag({ itemId: 'q-alpha-2', kind: 'question', at: 1 });
    await open(db);
    expect(await screen.findByText('Stem for q-alpha-2?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unflag' }));
    expect(await screen.findByText(/Tap 🚩 on any question or card/)).toBeInTheDocument();
  });
});

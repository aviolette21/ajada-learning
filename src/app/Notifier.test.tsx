import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotifierProvider, TOAST_MS, useNotify } from './Notifier';

function Trigger({ message }: { message: string }) {
  const notify = useNotify();
  return <button type="button" onClick={() => notify(message)}>go</button>;
}

const setup = (message = 'Something failed') => render(<NotifierProvider><Trigger message={message} /></NotifierProvider>);

describe('NotifierProvider', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('shows a message as an alert and closes it on dismiss', async () => {
    setup();
    expect(screen.queryByRole('alert')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Something failed');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hides the message after a while, and a repeat restarts the timer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    setup();
    const go = screen.getByRole('button', { name: 'go' });
    act(() => go.click());
    act(() => vi.advanceTimersByTime(TOAST_MS - 1000));
    act(() => go.click());
    act(() => vi.advanceTimersByTime(TOAST_MS - 1000));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    vi.useRealTimers();
    // The exit animation is skipped in tests, but AnimatePresence still removes the node a frame later.
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger message="x" />)).toThrow(/NotifierProvider/);
  });
});

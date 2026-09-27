import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { swStub } from '../../tests/stubs/pwa-register';
import { UpdateBanner } from './UpdateBanner';

describe('UpdateBanner', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete swStub.registration;
  });

  it('checks for an update every hour and ignores a failed check (e.g. offline)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    // A plain function, not vi.fn: a vitest spy attaches its own handler to returned promises, hiding a missing catch.
    let calls = 0;
    const update = () => { calls++; return Promise.reject(new Error('offline')); };
    swStub.registration = { update } as unknown as ServiceWorkerRegistration;
    render(<UpdateBanner />);
    await act(async () => { vi.advanceTimersByTime(60 * 60 * 1000); });
    expect(calls).toBe(1);
    // An uncaught rejection here would fail the run as an unhandled rejection.
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
  });
});

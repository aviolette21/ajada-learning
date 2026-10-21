import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureRaw } from '../../content/fixtures';
import { validateContent } from '../../content/validate';
import { FocusDrillPage, FocusPage } from './FocusPage';
import { PracticePage } from './PracticePage';

describe('focus content', () => {
  it('rejects an area that links an unknown or repeated question', () => {
    const raw = fixtureRaw();
    raw.focus = [{ id: 'x', title: 'X', summary: 'S', questionIds: ['q-missing', 'q-alpha-1', 'q-alpha-1'] }];
    const result = validateContent(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('focus.json: x links unknown question "q-missing"');
      expect(result.errors).toContain('focus.json: x repeats question "q-alpha-1"');
    }
  });
});

describe('FocusPage', () => {
  it('is linked from Practice and lists each area with a drill', async () => {
    await renderWithApp(<PracticePage />, { route: '/practice', path: '/practice' });
    expect(await screen.findByRole('link', { name: /Focus areas/ })).toHaveAttribute('href', '/practice/focus');
  });
  it('shows the area summary, progress and drill link', async () => {
    await renderWithApp(<FocusPage />, { route: '/practice/focus', path: '/practice/focus' });
    expect(await screen.findByText('Gizmo handling')).toBeInTheDocument();
    expect(screen.getByText(/not started · seen 0\/2/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Drill Gizmo handling' })).toHaveAttribute('href', '/practice/focus/gizmos');
  });
});

describe('FocusDrillPage', () => {
  it("runs only the area's questions, across domains", async () => {
    await renderWithApp(<FocusDrillPage />, { route: '/practice/focus/gizmos', path: '/practice/focus/:areaId' });
    const seen: string[] = [];
    for (let i = 0; i < 2; i++) {
      const right = await screen.findByRole('button', { name: /Right answer q-/ });
      seen.push(right.textContent ?? '');
      await userEvent.click(right);
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await userEvent.click(await screen.findByRole('button', { name: i === 1 ? 'Finish' : 'Continue' }));
    }
    expect(seen.join(' ')).toMatch(/q-alpha-1/);
    expect(seen.join(' ')).toMatch(/q-beta-1/);
    expect(await screen.findByText('2 / 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to focus areas' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/focus');
  });
});

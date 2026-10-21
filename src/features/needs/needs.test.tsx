import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureRaw } from '../../content/fixtures';
import { validateContent } from '../../content/validate';
import { LearnPage } from '../learn/LearnPage';
import { NeedsDrillPage, NeedsImprovementPage } from './NeedsImprovementPage';

describe('needs-improvement content', () => {
  it('rejects a topic with an unknown domain or an unknown or repeated question', () => {
    const raw = fixtureRaw();
    raw.needsImprovement = [{ id: 'x', group: 'G', title: 'X', domainId: 'nope', definition: 'D', example: 'E', exam: 'X', questionIds: ['q-missing', 'q-alpha-1', 'q-alpha-1'] }];
    const result = validateContent(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('needs-improvement.json: x has unknown domainId "nope"');
      expect(result.errors).toContain('needs-improvement.json: x links unknown question "q-missing"');
      expect(result.errors).toContain('needs-improvement.json: x repeats question "q-alpha-1"');
    }
  });
});

describe('NeedsImprovementPage', () => {
  it('is linked from the Learn page', async () => {
    await renderWithApp(<LearnPage />, { route: '/learn', path: '/learn' });
    expect(await screen.findByRole('link', { name: /Needs improvement/ })).toHaveAttribute('href', '/needs-improvement');
  });
  it('groups topics and opens one to its definition, example, exam angle and drill', async () => {
    await renderWithApp(<NeedsImprovementPage />, { route: '/needs-improvement', path: '/needs-improvement' });
    expect(await screen.findByRole('heading', { name: 'Gizmo basics' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Practice all these topics · 1 questions/ })).toHaveAttribute('href', '/needs-improvement/drill');
    await userEvent.click(screen.getByRole('button', { name: /Gizmo wiring/ }));
    expect(await screen.findByText('Gizmos are wired at startup')).toBeInTheDocument();
    expect(screen.getByText('Wiring connects the part to its source.')).toBeInTheDocument();
    expect(screen.getByText('{"gizmo": "wired"}')).toBeInTheDocument();
    expect(screen.getByText('Wire it before turning it on.')).toBeInTheDocument();
    expect(screen.getByText('Wiring questions ask which end goes first.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Drill this topic · 1 questions/ })).toHaveAttribute('href', '/needs-improvement/drill?topic=gizmo-wiring');
  });
  it('offers no drill for a topic without questions', async () => {
    await renderWithApp(<NeedsImprovementPage />, { route: '/needs-improvement', path: '/needs-improvement' });
    await userEvent.click(await screen.findByRole('button', { name: /Gizmo reading/ }));
    expect(await screen.findByText('Read it twice.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Drill this topic/ })).not.toBeInTheDocument();
  });
});

describe('NeedsDrillPage', () => {
  it("runs the topic's questions and returns to the page", async () => {
    await renderWithApp(<NeedsDrillPage />, { route: '/needs-improvement/drill?topic=gizmo-wiring', path: '/needs-improvement/drill' });
    const right = await screen.findByRole('button', { name: /Right answer q-alpha-1/ });
    await userEvent.click(right);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to Needs improvement' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/needs-improvement');
  });
});

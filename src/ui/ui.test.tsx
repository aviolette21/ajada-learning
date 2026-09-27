import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DiagramView } from './Diagram';
import { Disclosure } from './Disclosure';
import { Paragraphs, renderInline } from './inline';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

describe('renderInline', () => {
  it('renders **bold** and `code`', () => {
    render(<p>{renderInline('Use **cache** with `cache_control` now')}</p>);
    expect(screen.getByText('cache').tagName).toBe('STRONG');
    expect(screen.getByText('cache_control').tagName).toBe('CODE');
  });
  it('renders `code` nested inside **bold**', () => {
    render(<p>{renderInline('Commit **`x`** to git')}</p>);
    const code = screen.getByText('x');
    expect(code.tagName).toBe('CODE');
    expect(code.parentElement?.tagName).toBe('STRONG');
  });
  it('turns "- " blocks into lists', () => {
    render(<Paragraphs text={'Intro\n\n- one\n- two'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('SegmentedControl', () => {
  function Harness() {
    const [v, setV] = useState<'x' | 'y'>('x');
    return <SegmentedControl label="Pick" value={v} onChange={setV} options={[{ value: 'x', label: 'Ex' }, { value: 'y', label: 'Why' }]} />;
  }
  it('checks the chosen option', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('radio', { name: 'Why' }));
    expect(screen.getByRole('radio', { name: 'Why' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Ex' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Sheet and Disclosure', () => {
  it('shows sheet content only while open', () => {
    const { rerender } = render(<Sheet open={false} label="Info">Hello</Sheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<Sheet open label="Info">Hello</Sheet>);
    expect(screen.getByRole('dialog', { name: 'Info' })).toHaveTextContent('Hello');
  });
  it('expands on tap', async () => {
    render(<Disclosure title="More">Hidden body</Disclosure>);
    expect(screen.queryByText('Hidden body')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /More/ }));
    expect(screen.getByText('Hidden body')).toBeInTheDocument();
  });
});

describe('DiagramView', () => {
  it('renders flow steps and captions', () => {
    render(<DiagramView diagram={{ kind: 'flow', caption: 'Cap', steps: [{ label: 'A' }, { label: 'B', sublabel: 'b' }] }} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Cap')).toBeInTheDocument();
  });
});

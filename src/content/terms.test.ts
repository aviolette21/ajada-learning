import { describe, expect, it } from 'vitest';
import type { GlossaryTerm } from './schema';
import { buildTermMatcher } from './terms';

const src = { url: 'https://example.com', title: 'x', checkedOn: '2026-10-13' };
const term = (id: string, name: string, aliases: string[] = []): GlossaryTerm => ({ id, term: name, aliases, definition: 'd', source: src });
const matcher = buildTermMatcher([
  term('g-mcp', 'MCP', ['Model Context Protocol']),
  term('g-prompt-caching', 'prompt caching'),
  term('g-prompt', 'prompt'),
  term('g-tool-use', 'tool use'),
  term('g-cache-control', 'cache_control'),
]);
const linked = (text: string, seen = new Set<string>()) =>
  matcher.split(text, seen).filter((s) => s.termId).map((s) => `${s.text}=${s.termId}`);

describe('buildTermMatcher', () => {
  it('prefers the longest term and ignores case for lowercase terms', () => {
    expect(linked('Enable Prompt caching on the prompt')).toEqual(['Prompt caching=g-prompt-caching', 'prompt=g-prompt']);
  });

  it('matches acronyms only in their exact case, plurals included', () => {
    expect(linked('Two MCPs, not mcp')).toEqual(['MCPs=g-mcp']);
  });

  it('links each term once per shared seen-set', () => {
    const seen = new Set<string>();
    expect(linked('MCP and the Model Context Protocol', seen)).toEqual(['MCP=g-mcp']);
    expect(linked('More MCP', seen)).toEqual([]);
  });

  it('does not match inside longer identifiers', () => {
    expect(linked('the tool use_id field and sub-prompt')).toEqual([]);
  });

  it('keeps all text in order', () => {
    expect(matcher.split('a tool use b', new Set()).map((s) => s.text).join('')).toBe('a tool use b');
  });

  it('maps an exact code span to its term', () => {
    expect(matcher.codeTerm('cache_control')).toBe('g-cache-control');
    expect(matcher.codeTerm('cache')).toBeUndefined();
  });
});

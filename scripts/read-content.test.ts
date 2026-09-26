import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readContentDir } from './read-content';

describe('readContentDir', () => {
  it('reads domains.json and every domain folder json file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ajada-content-'));
    writeFileSync(join(dir, 'domains.json'), JSON.stringify([{ id: 'alpha' }]));
    mkdirSync(join(dir, 'alpha'));
    writeFileSync(join(dir, 'alpha', 'questions.json'), JSON.stringify([{ id: 'q-x' }]));
    writeFileSync(join(dir, 'README.md'), 'ignored');

    const raw = readContentDir(dir);
    expect(raw.domains).toEqual([{ id: 'alpha' }]);
    expect(Object.keys(raw.files)).toEqual(['alpha/questions.json']);
    expect(raw.files['alpha/questions.json']).toEqual([{ id: 'q-x' }]);
  });
});

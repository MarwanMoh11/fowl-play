// tests/h5.static.test.ts — OWNER: H5. Static checks on H5's renderer files: no placeholder markers left, files within the size rule.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RENDER_DIR = join(process.cwd(), 'src', 'render');
/** Files another agent or the lead owns: excluded from H5's checks. */
const NOT_MINE = /sprites\/(arsenal|armada\d?|bosses[23]|placeholder)\.ts$/;
const MAX_LINES = 400;
const PLACEHOLDER = /Phase-0 placeholder|Phase 0:|placeholderSprite/;

function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listTs(p));
    else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const MINE = listTs(RENDER_DIR).filter((p) => !NOT_MINE.test(p));

describe('h5 static checks', () => {
  it('covers the H5 renderer files', () => {
    expect(MINE.length).toBeGreaterThan(20);
  });

  it('leaves no placeholder markers in H5 files', () => {
    const hits = MINE.filter((p) => PLACEHOLDER.test(readFileSync(p, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('keeps every H5 file within the 400-line limit', () => {
    const long = MINE.map((p) => [p, readFileSync(p, 'utf8').split('\n').length] as const).filter(([, n]) => n > MAX_LINES);
    expect(long).toEqual([]);
  });
});

// tests/a1.static.test.ts — OWNER: A1. Static source rules (§10.2).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Flipped to true by A1 at gate M2. */
const ENFORCE_NO_STUBS = false;

const ROOT = join(__dirname, '..');

function listFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

const SIM_FORBIDDEN: [string, RegExp][] = [
  ['Math.random', /Math\.random/],
  ['Date.now', /Date\.now/],
  ['performance.', /\bperformance\./],
  ['document.', /\bdocument\./],
  ['window.', /\bwindow\./],
  ['localStorage', /localStorage/],
  ['requestAnimationFrame', /requestAnimationFrame/],
  ['import from render/ui/audio/app/input', /from\s+['"](?:\.\.\/)+(?:render|ui|audio|app|input)(?:\/|['"])/],
];

describe('static rules', () => {
  const simFiles = listFiles(join(ROOT, 'src/sim'), ['.ts']);

  it('finds the simulation sources', () => {
    expect(simFiles.length).toBeGreaterThan(10);
  });

  it('src/sim uses no wall clock, randomness, DOM or presentation imports', () => {
    const violations: string[] = [];
    for (const f of simFiles) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const [label, re] of SIM_FORBIDDEN) {
          if (re.test(line)) violations.push(`${relative(ROOT, f)}:${i + 1} ${label}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it.runIf(ENFORCE_NO_STUBS)('src has no STUB, TODO or FIXME markers', () => {
    const violations: string[] = [];
    for (const f of listFiles(join(ROOT, 'src'), ['.ts', '.css'])) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/\b(STUB|TODO|FIXME)\b/.test(line)) violations.push(`${relative(ROOT, f)}:${i + 1}`);
      });
    }
    expect(violations).toEqual([]);
  });
});

// tests/a4.hud.test.ts — OWNER: A4. HUD, banners and tally with a recording canvas (§9.A4).
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type DrawOpts, type SpriteApi, type SpriteKey } from '../src/shared/contracts';
import { createGame } from '../src/sim/game';
import type { ChapterBonus, GameState } from '../src/sim/types';
import { bannerEnvelope, bossTitleColor } from '../src/ui/banners';
import { bossHealth, chapterWaveLabel, drawHud, formatScore } from '../src/ui/hud';
import { HEAT_COLORS, heatColor, overheatFlashOn } from '../src/ui/hud-bar';
import { buildTallyRows, multiplierLabel, tallyDone, tallyProgress } from '../src/ui/tally';
import { recordingContext } from './a4.helpers';

interface SpriteCall { key: SpriteKey; x: number; y: number; opts?: DrawOpts }

function fakeSprites(): { api: SpriteApi; draws: SpriteCall[] } {
  const draws: SpriteCall[] = [];
  const api: SpriteApi = {
    draw: (_ctx, key, x, y, opts) => {
      draws.push({ key, x, y, opts });
    },
    size: () => ({ w: 24, h: 24, frames: 1 }),
    toCanvas: () => ({}) as HTMLCanvasElement,
  };
  return { api, draws };
}

function freshState(): GameState {
  return createGame({ seed: 1, difficulty: 'normal' });
}

const BONUS: ChapterBonus = { accuracyPct: 78, accuracy: 15600, food: 2500, flawless: 25000, firepower: 8000, total: 51100 };

describe('formatScore', () => {
  it('adds thousands separators', () => {
    expect(formatScore(0)).toBe('0');
    expect(formatScore(999)).toBe('999');
    expect(formatScore(1000)).toBe('1,000');
    expect(formatScore(1234567)).toBe('1,234,567');
    expect(formatScore(100000)).toBe('100,000');
  });

  it('floors fractions and guards bad input', () => {
    expect(formatScore(12345.9)).toBe('12,345');
    expect(formatScore(Number.NaN)).toBe('0');
    expect(formatScore(-1500)).toBe('-1,500');
  });
});

describe('hud', () => {
  it('draws the score and chapter label as text', () => {
    const { ctx, calls } = recordingContext();
    const state = freshState();
    state.score = 1234567;
    state.chapter = 2;
    state.wave = 7;
    drawHud(ctx, state, fakeSprites().api, { ...DEFAULT_SETTINGS }, 60);
    const texts = calls.filter((c) => c.name === 'fillText').map((c) => c.args[0]);
    expect(texts).toContain('1,234,567');
    expect(texts).toContain(chapterWaveLabel(2, 7));
    expect(chapterWaveLabel(2, 7)).toBe('CHAPTER 2 · WAVE 7/10');
  });

  it('shows up to 5 life icons, then one icon with a count', () => {
    const state = freshState();
    state.player.lives = 3;
    state.player.missiles = 0;
    let s = fakeSprites();
    drawHud(recordingContext().ctx, state, s.api, DEFAULT_SETTINGS, 60);
    expect(s.draws.filter((d) => d.key === 'icon_life')).toHaveLength(3);
    expect(s.draws.filter((d) => d.key === 'icon_life').map((d) => d.x)).toEqual([31, 61, 91]);

    state.player.lives = 8;
    state.player.missiles = 7;
    s = fakeSprites();
    const rec = recordingContext();
    drawHud(rec.ctx, state, s.api, DEFAULT_SETTINGS, 60);
    expect(s.draws.filter((d) => d.key === 'icon_life')).toHaveLength(1);
    expect(s.draws.filter((d) => d.key === 'icon_missile')).toHaveLength(1);
    const texts = rec.calls.filter((c) => c.name === 'fillText').map((c) => c.args[0]);
    expect(texts).toContain('×8');
    expect(texts).toContain('×7');
  });

  it('uses the weapon icon and shows OVERHEAT only while overheated', () => {
    const state = freshState();
    state.player.weapon = 'laser';
    state.player.overheated = true;
    state.time = 0; // flash is on at t = 0
    const s = fakeSprites();
    const rec = recordingContext();
    drawHud(rec.ctx, state, s.api, DEFAULT_SETTINGS, 60);
    expect(s.draws.some((d) => d.key === 'icon_weapon_laser')).toBe(true);
    expect(rec.calls.some((c) => c.name === 'fillText' && c.args[0] === 'OVERHEAT')).toBe(true);
    const cool = recordingContext();
    state.player.overheated = false;
    drawHud(cool.ctx, state, s.api, DEFAULT_SETTINGS, 60);
    expect(cool.calls.some((c) => c.name === 'fillText' && c.args[0] === 'OVERHEAT')).toBe(false);
  });

  it('draws the FPS counter only when enabled', () => {
    const state = freshState();
    const off = recordingContext();
    drawHud(off.ctx, state, fakeSprites().api, DEFAULT_SETTINGS, 58);
    expect(off.calls.some((c) => c.name === 'fillText' && String(c.args[0]).includes('FPS'))).toBe(false);
    const on = recordingContext();
    drawHud(on.ctx, state, fakeSprites().api, { ...DEFAULT_SETTINGS, showFps: true }, 58);
    expect(on.calls.some((c) => c.name === 'fillText' && c.args[0] === '58 FPS')).toBe(true);
  });

  it('heat colour runs green, yellow, red', () => {
    expect(heatColor(0)).toBe('rgb(57, 255, 136)');
    expect(heatColor(60)).toBe('rgb(255, 214, 10)');
    expect(heatColor(100)).toBe('rgb(255, 59, 59)');
    expect(HEAT_COLORS.hot).toBe('#FF3B3B');
  });

  it('overheat flashes at 6 Hz', () => {
    expect(overheatFlashOn(0)).toBe(true);
    expect(overheatFlashOn(1 / 12 + 0.001)).toBe(false);
    expect(overheatFlashOn(2 / 12 + 0.001)).toBe(true);
  });

  it('boss bar sums alive boss hp', () => {
    const state = freshState();
    expect(bossHealth(state)).toBeNull();
    const boss = (hp: number, max: number, alive = true) =>
      ({ alive, isBoss: true, hp, maxHp: max }) as unknown as GameState['enemies'][number];
    state.enemies = [boss(50, 100), boss(25, 100), boss(0, 100, false)];
    state.bossName = 'TWIN HENS';
    state.bossThresholds = [0.5];
    expect(bossHealth(state)).toBeCloseTo(0.375);
    const rec = recordingContext();
    drawHud(rec.ctx, state, fakeSprites().api, DEFAULT_SETTINGS, 60);
    expect(rec.calls.some((c) => c.name === 'fillText' && c.args[0] === 'TWIN HENS')).toBe(true);
  });
});

describe('banners', () => {
  it('fades in over 0.2 s with a 1.15 -> 1 scale, and out over the last 0.3 s', () => {
    const at = (elapsed: number, total = 2) => bannerEnvelope({ total, ttl: total - elapsed });
    expect(at(0)).toEqual({ alpha: 0, scale: 1.15 });
    expect(at(0.1).alpha).toBeCloseTo(0.5);
    expect(at(0.1).scale).toBeCloseTo(1.075);
    expect(at(0.2).alpha).toBeCloseTo(1);
    expect(at(0.2).scale).toBeCloseTo(1);
    expect(at(1).alpha).toBe(1);
    expect(at(1).scale).toBe(1);
    expect(at(1.85).alpha).toBeCloseTo(0.5);
    expect(at(2).alpha).toBe(0);
  });

  it('boss title flashes red and white at 3 Hz unless flashes are reduced', () => {
    expect(bossTitleColor(0, false)).toBe('#FF3B3B');
    expect(bossTitleColor(1 / 6 + 0.001, false)).toBe('#FFFFFF');
    expect(bossTitleColor(1 / 3 + 0.001, false)).toBe('#FF3B3B');
    expect(bossTitleColor(1 / 6 + 0.001, true)).toBe('#FF3B3B');
  });

  it('draws the banner title and skips game over banners', () => {
    const state = freshState();
    state.banner = { style: 'wave', title: 'WAVE 4', subtitle: 'Scramble', ttl: 1, total: 2 };
    const a = recordingContext();
    drawHud(a.ctx, state, fakeSprites().api, DEFAULT_SETTINGS, 60);
    expect(a.calls.some((c) => c.name === 'fillText' && c.args[0] === 'WAVE 4')).toBe(true);
    state.phase = 'game_over';
    state.banner = { style: 'big', title: 'GAME OVER', subtitle: '', ttl: 999, total: 999 };
    const b = recordingContext();
    drawHud(b.ctx, state, fakeSprites().api, DEFAULT_SETTINGS, 60);
    expect(b.calls.some((c) => c.name === 'fillText' && c.args[0] === 'GAME OVER')).toBe(false);
  });
});

describe('chapter tally', () => {
  it('lists the bonus rows and adds a multiplier line only when it is not 1', () => {
    expect(buildTallyRows(BONUS, 'normal').map((r) => r.label)).toEqual([
      'ACCURACY', 'Accuracy bonus', 'Food bonus', 'Flawless bonus', 'Firepower bonus', 'TOTAL',
    ]);
    const hard = buildTallyRows(BONUS, 'hard');
    expect(hard[hard.length - 1].label).toBe('× 1.5 (HARD)');
    expect(hard[hard.length - 1].value).toBe(Math.round(51100 * 1.5));
    expect(multiplierLabel('easy')).toBe('× 0.75 (EASY)');
    expect(multiplierLabel('normal')).toBeNull();
  });

  it('counts rows up one after another over 2 s', () => {
    expect(tallyProgress(0, 6, 0)).toBe(0);
    expect(tallyProgress(0, 6, 2 / 6)).toBe(1);
    expect(tallyProgress(1, 6, 2 / 6)).toBe(0);
    expect(tallyProgress(5, 6, 2)).toBe(1);
    expect(tallyDone(1.99)).toBe(false);
    expect(tallyDone(2)).toBe(true);
  });

  it('draws the panel only in chapter_complete and prompts after 1.5 s', () => {
    const state = freshState();
    state.lastChapterBonus = BONUS;
    state.phase = 'wave_active';
    const none = recordingContext();
    drawHud(none.ctx, state, fakeSprites().api, DEFAULT_SETTINGS, 60);
    expect(none.calls.some((c) => c.name === 'fillText' && String(c.args[0]).includes('TOTAL'))).toBe(false);

    state.phase = 'chapter_complete';
    state.phaseTimer = 2.2;
    const rec = recordingContext();
    drawHud(rec.ctx, state, fakeSprites().api, DEFAULT_SETTINGS, 60);
    const texts = rec.calls.filter((c) => c.name === 'fillText').map((c) => String(c.args[0]));
    expect(texts).toContain('TOTAL');
    expect(texts).toContain('51,100');
    expect(texts).toContain('78%');
    expect(texts).toContain('Press FIRE to continue');
  });
});

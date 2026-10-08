// tests/a4.ui.test.ts — OWNER: A4. Menu navigation logic and screen data, without a DOM (§9.A4).
import { describe, expect, it } from 'vitest';
import type { AudioSystem, RunSummary, UiSound } from '../src/shared/contracts';
import { createMenu } from '../src/ui/menu';
import { cycleOption, firstEnabled, keyToAction, moveFocus, snapValue, stepValue } from '../src/ui/nav';
import { CONTROL_ROWS, PICKUP_ROWS, TIPS } from '../src/ui/screens/howto';
import { endTitle } from '../src/ui/screens/end';
import { formatDate } from '../src/ui/screens/scores';
import { TOGGLE_ROWS, VOLUME_ROWS } from '../src/ui/screens/settings';
import { CONTROLS_SUMMARY, GAME_VERSION } from '../src/ui/screens/title';
import type { MenuItem } from '../src/ui/widgets';
import * as ui from '../src/ui';

interface FakeEl {
  focused: number;
  classes: Set<string>;
  classList: { toggle(c: string, on: boolean): void };
  focus(): void;
  addEventListener(): void;
  select?: () => void;
}

function fakeItem(over: Partial<MenuItem> = {}): MenuItem & { el: FakeEl } {
  const classes = new Set<string>();
  const el: FakeEl = {
    focused: 0, classes,
    classList: { toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); } },
    focus() { this.focused += 1; },
    addEventListener() {},
  };
  return { el: el as unknown as HTMLElement, ...over } as MenuItem & { el: FakeEl };
}

function fakeAudio(): { audio: AudioSystem; sounds: UiSound[] } {
  const sounds: UiSound[] = [];
  const audio: AudioSystem = {
    unlock() {}, handleEvents() {}, update() {}, setVolumes() {}, ui: (s) => { sounds.push(s); },
  };
  return { audio, sounds };
}

const key = (code: string, repeat = false): KeyboardEvent => ({ code, repeat }) as KeyboardEvent;

describe('navigation helpers', () => {
  it('maps keys to actions', () => {
    expect(keyToAction('ArrowUp')).toBe('up');
    expect(keyToAction('KeyW')).toBe('up');
    expect(keyToAction('KeyS')).toBe('down');
    expect(keyToAction('ArrowLeft')).toBe('left');
    expect(keyToAction('KeyD')).toBe('right');
    expect(keyToAction('Enter')).toBe('activate');
    expect(keyToAction('Space')).toBe('activate');
    expect(keyToAction('Escape')).toBe('back');
    expect(keyToAction('KeyQ')).toBeNull();
  });

  it('leaves letters, Space and caret keys to a text field', () => {
    expect(keyToAction('KeyW', true)).toBeNull();
    expect(keyToAction('Space', true)).toBeNull();
    expect(keyToAction('ArrowLeft', true)).toBeNull();
    expect(keyToAction('ArrowDown', true)).toBe('down');
    expect(keyToAction('Enter', true)).toBe('activate');
  });

  it('moves focus with wrap-around and skips disabled items', () => {
    expect(moveFocus(0, 1, [true, true, true])).toBe(1);
    expect(moveFocus(2, 1, [true, true, true])).toBe(0);
    expect(moveFocus(0, -1, [true, true, true])).toBe(2);
    expect(moveFocus(0, 1, [true, false, true])).toBe(2);
    expect(moveFocus(0, 1, [true, false, false])).toBe(0);
    expect(firstEnabled([false, true])).toBe(1);
  });

  it('steps sliders by 5 without drifting and clamps', () => {
    let v = 0.8;
    for (let i = 0; i < 4; i++) v = stepValue(v, 1);
    expect(v).toBe(1);
    expect(stepValue(1, 1)).toBe(1);
    expect(stepValue(0, -1)).toBe(0);
    expect(stepValue(0.15, 1)).toBe(0.2);
    expect(snapValue(0.52)).toBe(0.5);
    expect(snapValue(2)).toBe(1);
    expect(snapValue(-1)).toBe(0);
  });

  it('cycles options', () => {
    expect(cycleOption(['easy', 'normal', 'hard'], 'hard', 1)).toBe('easy');
    expect(cycleOption(['easy', 'normal', 'hard'], 'easy', -1)).toBe('hard');
  });
});

describe('menu controller', () => {
  it('moves focus with up/down and plays move sounds', () => {
    const { audio, sounds } = fakeAudio();
    const a = fakeItem();
    const b = fakeItem();
    const menu = createMenu([a, b], { audio });
    menu.focusFirst();
    expect(menu.index()).toBe(0);
    expect(a.el.classes.has('is-focused')).toBe(true);
    expect(sounds).toEqual([]);
    expect(menu.handleKey(key('ArrowDown'))).toBe(true);
    expect(menu.index()).toBe(1);
    expect(b.el.classes.has('is-focused')).toBe(true);
    expect(a.el.classes.has('is-focused')).toBe(false);
    menu.handleKey(key('KeyW'));
    expect(menu.index()).toBe(0);
    expect(sounds).toEqual(['move', 'move']);
  });

  it('activates on Enter/Space once (key repeat is ignored) and plays select', () => {
    const { audio, sounds } = fakeAudio();
    let hits = 0;
    const menu = createMenu([fakeItem({ activate: () => { hits += 1; } })], { audio });
    menu.focusFirst();
    menu.handleKey(key('Enter'));
    menu.handleKey(key('Space', true));
    expect(hits).toBe(1);
    expect(sounds).toEqual(['select']);
  });

  it('adjusts values with left/right and skips disabled items', () => {
    const { audio, sounds } = fakeAudio();
    const dirs: number[] = [];
    const slider = fakeItem({ adjust: (d) => { dirs.push(d); }, adjustSound: 'tick' });
    const off = fakeItem({ disabled: true });
    const menu = createMenu([off, slider], { audio });
    menu.focusFirst();
    expect(menu.index()).toBe(1);
    menu.handleKey(key('ArrowRight'));
    menu.handleKey(key('KeyA'));
    expect(dirs).toEqual([1, -1]);
    expect(sounds).toEqual(['tick', 'tick']);
    menu.handleKey(key('ArrowDown'));
    expect(menu.index()).toBe(1);
  });

  it('Esc goes back, extra back keys work, and repeats do not', () => {
    const { audio, sounds } = fakeAudio();
    let backs = 0;
    const menu = createMenu([fakeItem()], { audio, onBack: () => { backs += 1; }, backKeys: ['KeyP'] });
    menu.focusFirst();
    menu.handleKey(key('Escape'));
    menu.handleKey(key('KeyP'));
    menu.handleKey(key('Escape', true));
    expect(backs).toBe(2);
    expect(sounds).toEqual(['back', 'back']);
  });

  it('ignores Esc when the screen has no back action', () => {
    const { audio } = fakeAudio();
    const menu = createMenu([fakeItem()], { audio });
    menu.focusFirst();
    expect(menu.handleKey(key('Escape'))).toBe(true);
  });

  it('the activation guard blocks accidental presses', () => {
    const { audio } = fakeAudio();
    let allowed = false;
    let hits = 0;
    const menu = createMenu([fakeItem({ activate: () => { hits += 1; } })], { audio, canActivate: () => allowed });
    menu.focusFirst();
    menu.handleKey(key('Enter'));
    expect(hits).toBe(0);
    allowed = true;
    menu.handleKey(key('Enter'));
    expect(hits).toBe(1);
  });

  it('lets a focused text field keep letters, Space and caret keys', () => {
    const { audio, sounds } = fakeAudio();
    let saved = 0;
    const field = fakeItem({ text: true, activate: () => { saved += 1; } });
    field.el.select = () => {};
    const menu = createMenu([field, fakeItem()], { audio, onBack: () => {}, backKeys: ['KeyP'] });
    menu.focusFirst();
    expect(menu.handleKey(key('KeyW'))).toBe(false);
    expect(menu.handleKey(key('KeyP'))).toBe(false);
    expect(menu.handleKey(key('Space'))).toBe(false);
    expect(menu.handleKey(key('ArrowLeft'))).toBe(false);
    expect(menu.index()).toBe(0);
    menu.handleKey(key('Enter'));
    expect(saved).toBe(1);
    expect(sounds).toEqual([]);
    menu.handleKey(key('ArrowDown'));
    expect(menu.index()).toBe(1);
  });
});

describe('screen data', () => {
  it('How to Play lists controls, every gift with its weapon info, and the five tips', () => {
    expect(CONTROL_ROWS.map((r) => r[0])).toEqual(['Move', 'Fire (hold)', 'Missile', 'Overdrive (full fury)', 'Pause', 'Confirm / skip']);
    expect(PICKUP_ROWS.map((r) => r.key)).toEqual([
      'pickup_drumstick', 'pickup_roast', 'pickup_power_core',
      'pickup_gift_pulse', 'pickup_gift_neutron', 'pickup_gift_laser', 'pickup_gift_arc',
      'pickup_gift_flak', 'pickup_gift_flame', 'pickup_gift_sickle', 'pickup_gift_homing', 'pickup_gift_rail', 'pickup_gift_prism',
    ]);
    expect(PICKUP_ROWS[3].name).toContain('PULSE BLASTER');
    expect(PICKUP_ROWS[6].desc).toContain('Lightning');
    expect(TIPS).toHaveLength(5);
    expect(TIPS[4]).toBe('Wave 10 of every chapter is a boss');
  });

  it('Settings covers the volumes and toggles from the spec', () => {
    expect(VOLUME_ROWS.map((r) => r.key)).toEqual(['masterVolume', 'musicVolume', 'sfxVolume']);
    expect(TOGGLE_ROWS.map((r) => r.key)).toEqual(['screenShake', 'reduceFlashes', 'showFps', 'autoFire', 'mouseControl']);
  });

  it('end screens, dates and title text', () => {
    const base: Omit<RunSummary, 'victory'> = {
      score: 1, chapter: 1, wave: 1, difficulty: 'normal', accuracyPct: 0, kills: 0, mode: 'campaign', ship: 'falcon',
      mutators: [], perks: [], corn: 0, bossesKilled: 0, maxCombo: 0, goldenKills: 0, seed: 0, dailyDate: 0,
    };
    expect(endTitle({ ...base, victory: true })).toBe('COOP LIBERATED!');
    expect(endTitle({ ...base, victory: false })).toBe('GAME OVER');
    expect(formatDate('2026-03-04T10:00:00.000Z')).toBe('2026-03-04');
    expect(formatDate('')).toBe('-');
    expect(GAME_VERSION).toBe('v2.0');
    expect(CONTROLS_SUMMARY).toContain('Esc');
  });

  it('importing the UI never touches the DOM', () => {
    expect(typeof ui.createUI).toBe('function');
  });
});

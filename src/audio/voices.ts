// src/audio/voices.ts — OWNER: A4. Voice limit and per-sound throttle (§8.8). Pure logic, time is injected.
export const MAX_VOICES = 24;
/** One sound may not take more than this many voices, so a burst of one kind cannot starve the rest. */
export const MAX_VOICES_PER_SOUND = 6;

interface Voice { end: number; key: string | undefined }

/** Caps simultaneous sound effects, globally and per sound; new ones beyond the caps are dropped. */
export class VoiceLimiter {
  private readonly voices: Voice[] = [];

  constructor(
    private readonly max: number = MAX_VOICES,
    private readonly perSound: number = MAX_VOICES_PER_SOUND,
  ) {}

  /**
   * Reserves a voice that lasts `duration` seconds from `now`; false when every voice is busy
   * or the sound identified by `key` already holds its share.
   */
  tryAcquire(now: number, duration: number, key?: string): boolean {
    this.prune(now);
    if (this.voices.length >= this.max) return false;
    if (key !== undefined && this.voices.filter((v) => v.key === key).length >= this.perSound) return false;
    this.voices.push({ end: now + duration, key });
    return true;
  }

  active(now: number): number {
    this.prune(now);
    return this.voices.length;
  }

  private prune(now: number): void {
    let w = 0;
    for (let i = 0; i < this.voices.length; i++) {
      if (this.voices[i].end > now) this.voices[w++] = this.voices[i];
    }
    this.voices.length = w;
  }
}

/** Minimum interval between two plays of the same sound id. */
export class Throttle {
  private readonly last = new Map<string, number>();

  allow(id: string, now: number, minGap: number): boolean {
    if (minGap <= 0) return true;
    const prev = this.last.get(id);
    if (prev !== undefined && now >= prev && now - prev < minGap) return false;
    this.last.set(id, now);
    return true;
  }
}

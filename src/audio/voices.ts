// src/audio/voices.ts — OWNER: A4. Voice limit and per-sound throttle (§8.8). Pure logic, time is injected.
export const MAX_VOICES = 24;

/** Caps simultaneous sound effects; new ones beyond the cap are dropped. */
export class VoiceLimiter {
  private readonly ends: number[] = [];

  constructor(private readonly max: number = MAX_VOICES) {}

  /** Reserves a voice that lasts `duration` seconds from `now`; false when every voice is busy. */
  tryAcquire(now: number, duration: number): boolean {
    this.prune(now);
    if (this.ends.length >= this.max) return false;
    this.ends.push(now + duration);
    return true;
  }

  active(now: number): number {
    this.prune(now);
    return this.ends.length;
  }

  private prune(now: number): void {
    let w = 0;
    for (let i = 0; i < this.ends.length; i++) {
      if (this.ends[i] > now) this.ends[w++] = this.ends[i];
    }
    this.ends.length = w;
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

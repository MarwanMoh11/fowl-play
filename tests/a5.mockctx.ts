// tests/a5.mockctx.ts — OWNER: A5. Canvas-less 2D context (not a test file). Records calls, validates arguments the way a
// real canvas would (negative radii, NaN, colour-stop range, bad colours) and tracks the painted bounding box.
const PAINT_CALLS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'drawImage']);
const RADIUS_ARG: Record<string, number[]> = { arc: [2], ellipse: [2, 3], arcTo: [4], createRadialGradient: [2, 5] };
const COLOR_RE = /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\([0-9., %]+\))$/;
type M = [number, number, number, number, number, number];

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }
export interface MockCtx {
  ctx: CanvasRenderingContext2D;
  paints(): number;
  calls: { name: string; args: unknown[] }[];
  last(name: string): unknown[] | undefined;
  /** Problems a real canvas would throw on or silently ignore. */
  violations: string[];
  /** Union of everything painted, in the coordinates of the initial transform. */
  bounds(): Bounds | null;
}

export function mockCtx(): MockCtx {
  let paints = 0;
  const calls: { name: string; args: unknown[] }[] = [];
  const violations: string[] = [];
  const store: Record<string, unknown> = { lineWidth: 1 };
  let m: M = [1, 0, 0, 1, 0, 0];
  const stack: M[] = [];
  let pathPts: number[] = [];
  let last: [number, number] = [0, 0];
  let subStart: [number, number] = [0, 0];
  let box: Bounds | null = null;

  const apply = (x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const addPt = (x: number, y: number): void => { const [px, py] = apply(x, y); pathPts.push(px, py); };
  const union = (minX: number, minY: number, maxX: number, maxY: number): void => {
    box = box
      ? { minX: Math.min(box.minX, minX), minY: Math.min(box.minY, minY), maxX: Math.max(box.maxX, maxX), maxY: Math.max(box.maxY, maxY) }
      : { minX, minY, maxX, maxY };
  };
  const flushPath = (grow: number): void => {
    if (pathPts.length === 0) return;
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (let i = 0; i < pathPts.length; i += 2) {
      minX = Math.min(minX, pathPts[i]); maxX = Math.max(maxX, pathPts[i]);
      minY = Math.min(minY, pathPts[i + 1]); maxY = Math.max(maxY, pathPts[i + 1]);
    }
    union(minX - grow, minY - grow, maxX + grow, maxY + grow);
  };
  const detScale = (): number => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

  function track(name: string, a: number[]): void {
    switch (name) {
      case 'save': stack.push([...m] as M); break;
      case 'restore': { const p = stack.pop(); if (p) m = p; break; }
      case 'translate': m = [m[0], m[1], m[2], m[3], m[0] * a[0] + m[2] * a[1] + m[4], m[1] * a[0] + m[3] * a[1] + m[5]]; break;
      case 'scale': m = [m[0] * a[0], m[1] * a[0], m[2] * a[1], m[3] * a[1], m[4], m[5]]; break;
      case 'rotate': {
        const c = Math.cos(a[0]); const s = Math.sin(a[0]);
        m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, m[2] * c - m[0] * s, m[3] * c - m[1] * s, m[4], m[5]];
        break;
      }
      case 'setTransform': m = [a[0], a[1], a[2], a[3], a[4], a[5]]; break;
      case 'beginPath': pathPts = []; break;
      case 'moveTo': addPt(a[0], a[1]); last = [a[0], a[1]]; subStart = [a[0], a[1]]; break;
      case 'lineTo': addPt(a[0], a[1]); last = [a[0], a[1]]; break;
      case 'closePath': last = [subStart[0], subStart[1]]; break;
      case 'quadraticCurveTo':
        for (let i = 1; i <= 12; i++) {
          const t = i / 12; const u = 1 - t;
          addPt(u * u * last[0] + 2 * u * t * a[0] + t * t * a[2], u * u * last[1] + 2 * u * t * a[1] + t * t * a[3]);
        }
        last = [a[2], a[3]];
        break;
      case 'bezierCurveTo':
        for (let i = 1; i <= 16; i++) {
          const t = i / 16; const u = 1 - t;
          addPt(u * u * u * last[0] + 3 * u * u * t * a[0] + 3 * u * t * t * a[2] + t * t * t * a[4],
            u * u * u * last[1] + 3 * u * u * t * a[1] + 3 * u * t * t * a[3] + t * t * t * a[5]);
        }
        last = [a[4], a[5]];
        break;
      case 'arcTo': addPt(a[0], a[1]); addPt(a[2], a[3]); last = [a[2], a[3]]; break;
      case 'rect':
        addPt(a[0], a[1]); addPt(a[0] + a[2], a[1]); addPt(a[0] + a[2], a[1] + a[3]); addPt(a[0], a[1] + a[3]);
        last = [a[0], a[1]]; subStart = [a[0], a[1]];
        break;
      case 'arc': case 'ellipse': {
        const isE = name === 'ellipse';
        const rx = a[2]; const ry = isE ? a[3] : a[2]; const rot = isE ? a[4] : 0;
        let s0 = isE ? a[5] : a[3]; let e0 = isE ? a[6] : a[4];
        const ccw = Boolean(isE ? a[7] : a[5]);
        if (ccw) { while (e0 > s0) e0 -= Math.PI * 2; } else { while (e0 < s0) e0 += Math.PI * 2; }
        if (Math.abs(e0 - s0) > Math.PI * 2) e0 = s0 + Math.sign(e0 - s0) * Math.PI * 2;
        const steps = 32;
        for (let i = 0; i <= steps; i++) {
          const t = s0 + ((e0 - s0) * i) / steps;
          const ex = Math.cos(t) * rx; const ey = Math.sin(t) * ry;
          const px = a[0] + ex * Math.cos(rot) - ey * Math.sin(rot);
          const py = a[1] + ex * Math.sin(rot) + ey * Math.cos(rot);
          addPt(px, py);
          last = [px, py];
          if (i === 0) subStart = [px, py];
        }
        s0 = e0;
        break;
      }
      case 'fill': flushPath(0); break;
      case 'stroke': flushPath((Number(store.lineWidth) / 2) * detScale()); break;
      case 'fillRect': case 'strokeRect': {
        const pts = [apply(a[0], a[1]), apply(a[0] + a[2], a[1]), apply(a[0], a[1] + a[3]), apply(a[0] + a[2], a[1] + a[3])];
        union(Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1])));
        break;
      }
      default: break;
    }
  }

  const ctx = new Proxy(store, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return (...args: number[]) => {
          for (const i of RADIUS_ARG[prop] ?? []) if (args[i] < 0) violations.push(`${prop} negative radius ${args[i]}`);
          return { addColorStop: (o: number, c: string) => {
            if (!(o >= 0 && o <= 1)) violations.push(`colour stop offset ${o}`);
            if (!COLOR_RE.test(c)) violations.push(`bad gradient colour ${c}`);
          } };
        };
      }
      return (...args: unknown[]) => {
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) violations.push(`${prop} got non-finite ${a}`);
        for (const i of RADIUS_ARG[prop] ?? []) if (Number(args[i]) < 0) violations.push(`${prop} negative radius ${String(args[i])}`);
        if (PAINT_CALLS.has(prop)) paints++;
        if (calls.length < 200_000) calls.push({ name: prop, args });
        track(prop, args as number[]);
        return undefined;
      };
    },
    set(target, prop: string, value) {
      if ((prop === 'fillStyle' || prop === 'strokeStyle') && typeof value === 'string' && !COLOR_RE.test(value)) violations.push(`bad ${prop} "${value}"`);
      if (typeof value === 'number' && !Number.isFinite(value)) violations.push(`${prop} set to ${value}`);
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return {
    ctx,
    paints: () => paints,
    calls,
    violations,
    bounds: () => box,
    last: (name) => {
      for (let i = calls.length - 1; i >= 0; i--) if (calls[i].name === name) return calls[i].args;
      return undefined;
    },
  };
}

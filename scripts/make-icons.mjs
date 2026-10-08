// scripts/make-icons.mjs — OWNER: D. Renders public/icon-{180,192,512}.png with no dependencies (node:zlib + hand-built PNG chunks).
// Run: node scripts/make-icons.mjs   (geometry mirrors public/icon.svg; keep both in step)
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SIZES = [180, 192, 512];
const SUPERSAMPLE = 3; // per axis, for smooth edges

// Unit-square coordinates (y down).
const SHIP = [[0.5, 0.16], [0.78, 0.74], [0.5, 0.6], [0.22, 0.74]];
const FLAME = [[0.42, 0.74], [0.58, 0.74], [0.5, 0.93]];
const COCKPIT = { x: 0.5, y: 0.42, r: 0.07 };
const STARS = [[0.14, 0.18], [0.86, 0.12], [0.9, 0.56], [0.1, 0.62], [0.7, 0.9], [0.24, 0.9]];
const STAR_R = 0.012;
const C_SHIP = [255, 210, 63];
const C_FLAME = [255, 157, 46];
const C_COCKPIT = [191, 239, 255];
const C_STAR = [255, 255, 255];
const C_BG_TOP = [29, 42, 92];
const C_BG_BOTTOM = [6, 8, 20];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function colorAt(x, y) {
  if (STARS.some(([sx, sy]) => inCircle(x, y, sx, sy, STAR_R))) return C_STAR;
  if (inCircle(x, y, COCKPIT.x, COCKPIT.y, COCKPIT.r)) return C_COCKPIT;
  if (inPoly(x, y, SHIP)) return C_SHIP;
  if (inPoly(x, y, FLAME)) return C_FLAME;
  return C_BG_TOP.map((c, i) => c + (C_BG_BOTTOM[i] - c) * y);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // Each scanline is prefixed with filter byte 0 (none).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const n = SUPERSAMPLE * SUPERSAMPLE;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const c = colorAt((px + (sx + 0.5) / SUPERSAMPLE) / size, (py + (sy + 0.5) / SUPERSAMPLE) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const o = (py * size + px) * 4;
      rgba[o] = Math.round(r / n);
      rgba[o + 1] = Math.round(g / n);
      rgba[o + 2] = Math.round(b / n);
      rgba[o + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

for (const size of SIZES) {
  const file = join(OUT, `icon-${size}.png`);
  writeFileSync(file, render(size));
  console.log(`wrote ${file}`);
}

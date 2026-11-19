// Draws the Qoldan app icon (same shapes as public/icon.svg) into PNG files without any image library:
// a tiny rasteriser with 4x4 supersampling and a minimal PNG encoder (zlib from Node).
// Run: node scripts/make-icons.mjs  → public/apple-touch-icon.png (180), public/icon-192.png, public/icon-512.png
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const GREEN = [13, 107, 69];
const WHITE = [255, 255, 255];
const LIME = [223, 240, 122];

// Coverage of one sample point (in 512-unit space) by each shape, painted in order.
function sampleColor(x, y, rounded) {
  const inRect = rounded ? insideRoundedRect(x, y, 512, 112) : true;
  if (!inRect) return null;
  let color = GREEN;
  const ring = Math.hypot(x - 246, y - 240);
  if (ring >= 124 - 28 && ring <= 124 + 28) color = WHITE;
  if (distanceToSegment(x, y, 338, 333, 402, 398) <= 29) color = WHITE;
  if (Math.hypot(x - 392, y - 128) <= 34) color = LIME;
  return color;
}

function insideRoundedRect(x, y, size, r) {
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return Math.hypot(x - cx, y - cy) <= r && x >= 0 && y >= 0 && x <= size && y <= size;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function render(size, { rounded }) {
  const rgba = Buffer.alloc(size * size * 4);
  const ss = 4;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const x = ((px + (sx + 0.5) / ss) / size) * 512;
          const y = ((py + (sy + 0.5) / ss) / size) * 512;
          const c = sampleColor(x, y, rounded);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
        }
      }
      const n = ss * ss, i = (py * size + px) * 4;
      const covered = a / 255 || 1;
      rgba[i] = Math.round(r / covered); rgba[i + 1] = Math.round(g / covered); rgba[i + 2] = Math.round(b / covered);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, rgba);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};
function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; header[10] = 0; header[11] = 0; header[12] = 0; // 8-bit RGBA
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rows[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// iOS rounds the corners itself, so the Apple icon is a full square; Android icons keep the rounded shape.
writeFileSync('public/apple-touch-icon.png', render(180, { rounded: false }));
writeFileSync('public/icon-192.png', render(192, { rounded: true }));
writeFileSync('public/icon-512.png', render(512, { rounded: true }));
console.log('icons written: public/apple-touch-icon.png, public/icon-192.png, public/icon-512.png');

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const typeAndData = Buffer.concat([typeBuf, data]);
    const crcVal = zlib.crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function drawTacticalIcon(x, y, width, height, isMaskable = false) {
  const cx = width / 2;
  const cy = height / 2;
  const scale = isMaskable ? 0.7 : 0.88;
  const maxR = (width / 2) * scale;

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);

  // Background dark gradient
  const bgGrad = Math.min(1, dist / (width * 0.7));
  let r = Math.round(11 + 10 * bgGrad);
  let g = Math.round(15 + 12 * bgGrad);
  let b = Math.round(25 + 18 * bgGrad);
  let a = 255;

  // Outer tactical hex / circle ring
  const ringDist = Math.abs(dist - maxR * 0.85);
  if (ringDist < width * 0.035) {
    // Amber / cyan neon ring
    const factor = 1 - ringDist / (width * 0.035);
    r = Math.round(r * (1 - factor) + 245 * factor);
    g = Math.round(g * (1 - factor) + 158 * factor);
    b = Math.round(b * (1 - factor) + 11 * factor);
  }

  // Secondary inner reticle ring
  const innerRingDist = Math.abs(dist - maxR * 0.5);
  if (innerRingDist < width * 0.02) {
    const factor = 1 - innerRingDist / (width * 0.02);
    r = Math.round(r * (1 - factor) + 6 * factor);
    g = Math.round(g * (1 - factor) + 182 * factor);
    b = Math.round(b * (1 - factor) + 212 * factor);
  }

  // Crosshair crossbars
  const crossWidth = width * 0.025;
  const isHorizontalBar = Math.abs(dy) <= crossWidth && dist >= maxR * 0.25 && dist <= maxR * 0.95;
  const isVerticalBar = Math.abs(dx) <= crossWidth && dist >= maxR * 0.25 && dist <= maxR * 0.95;

  if (isHorizontalBar || isVerticalBar) {
    r = 255;
    g = 85;
    b = 0; // Tactical orange
  }

  // Center glowing bullseye dot
  if (dist <= maxR * 0.16) {
    const factor = 1 - dist / (maxR * 0.16);
    r = Math.round(r * (1 - factor) + 251 * factor);
    g = Math.round(g * (1 - factor) + 191 * factor);
    b = Math.round(b * (1 - factor) + 36 * factor);
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
const icon192 = createPNG(192, 192, (x, y, w, h) => drawTacticalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = createPNG(512, 512, (x, y, w, h) => drawTacticalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const icon512Maskable = createPNG(512, 512, (x, y, w, h) => drawTacticalIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), icon512Maskable);

const appleTouchIcon = createPNG(180, 180, (x, y, w, h) => drawTacticalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

const favicon = createPNG(64, 64, (x, y, w, h) => drawTacticalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);

// Generate icon.svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#141c2e"/>
      <stop offset="100%" stop-color="#0b0f19"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <!-- Outer Tactical Ring -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#f59e0b" stroke-width="12" opacity="0.8" />
  <circle cx="256" cy="256" r="190" fill="none" stroke="#06b6d4" stroke-width="6" stroke-dasharray="30 15" opacity="0.9" />
  <!-- Inner Ring -->
  <circle cx="256" cy="256" r="110" fill="none" stroke="#06b6d4" stroke-width="8" opacity="0.7"/>
  <!-- Crossbars -->
  <line x1="60" y1="256" x2="200" y2="256" stroke="#ff5500" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
  <line x1="312" y1="256" x2="452" y2="256" stroke="#ff5500" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
  <line x1="256" y1="60" x2="256" y2="200" stroke="#ff5500" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
  <line x1="256" y1="312" x2="256" y2="452" stroke="#ff5500" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
  <!-- Center Bullseye -->
  <circle cx="256" cy="256" r="32" fill="#fbbf24" filter="url(#glow)"/>
  <circle cx="256" cy="256" r="12" fill="#ffffff"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

console.log('Successfully generated all PWA icons in /public');

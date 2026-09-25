import fs from 'fs';
import zlib from 'zlib';

function createFintechPng(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = calcCrc(crcBuf);
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcOut]);
  }

  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function calcCrc(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk('IHDR', ihdrData);

  // Raw image data
  const rowLen = 1 + width * 4;
  const raw = Buffer.alloc(rowLen * height);

  const cornerR = width * 0.22;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Squircle bounding box check
      let inBounds = true;
      if (x < cornerR && y < cornerR) {
        if (Math.hypot(x - cornerR, y - cornerR) > cornerR) inBounds = false;
      } else if (x > width - cornerR && y < cornerR) {
        if (Math.hypot(x - (width - cornerR), y - cornerR) > cornerR) inBounds = false;
      } else if (x < cornerR && y > height - cornerR) {
        if (Math.hypot(x - cornerR, y - (height - cornerR)) > cornerR) inBounds = false;
      } else if (x > width - cornerR && y > height - cornerR) {
        if (Math.hypot(x - (width - cornerR), y - (height - cornerR)) > cornerR) inBounds = false;
      }

      if (!inBounds) {
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0;
        continue;
      }

      // Base: dark obsidian slate
      let r = 11;
      let g = 17;
      let b = 32;

      // Geometric emblem in center: stylized emerald chevron & node
      const distFromCenter = Math.hypot(x - cx, y - cy);
      const nx = (x - cx) / (width * 0.5);
      const ny = (y - cy) / (height * 0.5);

      // Radial dark glow
      if (distFromCenter < width * 0.38) {
        const glowFactor = 1 - distFromCenter / (width * 0.38);
        r = Math.round(r + 5 * glowFactor);
        g = Math.round(g + 45 * glowFactor);
        b = Math.round(b + 30 * glowFactor);
      }

      // Primary emerald folding facet: diamond/chevron shape
      const inEmblem = 
        Math.abs(nx) < 0.42 && 
        Math.abs(ny) < 0.42 && 
        (nx * 0.8 + ny > -0.28) && 
        (nx * 0.8 + ny < 0.48);

      if (inEmblem) {
        // Neon emerald gradient
        const t = (nx + ny + 0.6) / 1.2;
        r = Math.round(16 + (52 - 16) * t);
        g = Math.round(185 + (211 - 185) * t);
        b = Math.round(129 + (153 - 129) * t);
      }

      // Inner diagonal cutout
      const inCutout = 
        (nx > -0.15 && nx < 0.18) && 
        (ny > -0.15 && ny < 0.15) && 
        (nx - ny > -0.05);

      if (inCutout) {
        r = 11;
        g = 17;
        b = 32;
      }

      // Node highlight
      const dotDist = Math.hypot(x - (cx + width * 0.16), y - cy);
      if (dotDist < width * 0.045) {
        r = 255;
        g = 255;
        b = 255;
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = 255;
    }
  }

  const deflated = zlib.deflateSync(raw);
  const idat = chunk('IDAT', deflated);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public');
}

const icon192 = createFintechPng(192, 192);
fs.writeFileSync('./public/pwa-192x192.png', icon192);

const icon512 = createFintechPng(512, 512);
fs.writeFileSync('./public/pwa-512x512.png', icon512);
fs.writeFileSync('./public/pwa-maskable-512x512.png', icon512);

const appleIcon = createFintechPng(180, 180);
fs.writeFileSync('./public/apple-touch-icon.png', appleIcon);

console.log('Modern fintech PNG icons created successfully.');

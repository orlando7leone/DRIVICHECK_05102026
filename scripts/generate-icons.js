import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createSolidPng(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: height rows, each starting with filter byte 0 followed by width * 4 bytes
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Simple gradient/pattern
      const isCorner = (x < width * 0.1 || x > width * 0.9) && (y < height * 0.1 || y > height * 0.9);
      const isCenter = Math.hypot(x - width / 2, y - height / 2) < width * 0.35;
      
      if (isCenter) {
        // Bright blue / cyan center
        rawData[pixelOffset] = 56;
        rawData[pixelOffset + 1] = 189;
        rawData[pixelOffset + 2] = 248;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Dark blue navy background
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = isCorner ? 220 : 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(4 + 4 + length + 4);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crc = crc32(buffer.subarray(4, 8 + length));
  buffer.writeUInt32BE(crc, 8 + length);
  return buffer;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192, 512, maskable, and apple-touch-icon
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createSolidPng(192, 192, 15, 23, 42));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createSolidPng(512, 512, 15, 23, 42));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createSolidPng(512, 512, 15, 23, 42));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSolidPng(180, 180, 15, 23, 42));

console.log('PNG Icons generated successfully in public/');

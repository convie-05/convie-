// Generate a minimal 256x256 ICO file with solid blue color
const fs = require('fs');
const zlib = require('zlib');

const size = 256;

// Create raw RGBA pixel data (solid blue: #3498db)
const pixels = Buffer.alloc(size * size * 4);
for (let i = 0; i < size * size; i++) {
  pixels[i * 4]     = 52;   // R
  pixels[i * 4 + 1] = 152;  // G
  pixels[i * 4 + 2] = 219;  // B
  pixels[i * 4 + 3] = 255;  // A
}

// Create BMP info header (BITMAPINFOHEADER) - 40 bytes
const bmpHeader = Buffer.alloc(40);
bmpHeader.writeUInt32LE(40, 0);           // biSize
bmpHeader.writeInt32LE(size, 4);          // biWidth
bmpHeader.writeInt32LE(size * 2, 8);      // biHeight (doubled for AND mask)
bmpHeader.writeUInt16LE(1, 12);           // biPlanes
bmpHeader.writeUInt16LE(32, 14);          // biBitCount
bmpHeader.writeUInt32LE(0, 16);           // biCompression
bmpHeader.writeUInt32LE(size * size * 4, 20); // biSizeImage
bmpHeader.writeInt32LE(0, 24);            // biXPelsPerMeter
bmpHeader.writeInt32LE(0, 28);            // biYPelsPerMeter
bmpHeader.writeUInt32LE(0, 32);           // biClrUsed
bmpHeader.writeUInt32LE(0, 36);           // biClrImportant

// For ICO, pixels are stored bottom-up, and in BGRA order
const pixelData = Buffer.alloc(size * size * 4);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const srcIdx = ((size - 1 - y) * size + x) * 4;
    const dstIdx = (y * size + x) * 4;
    pixelData[dstIdx]     = pixels[srcIdx + 2]; // B
    pixelData[dstIdx + 1] = pixels[srcIdx + 1]; // G
    pixelData[dstIdx + 2] = pixels[srcIdx];     // R
    pixelData[dstIdx + 3] = pixels[srcIdx + 3]; // A
  }
}

// AND mask (1 bit per pixel, row padded to 4 bytes)
const maskRowSize = Math.ceil(size / 8);
const maskRowPadded = Math.ceil(maskRowSize / 4) * 4;
const andMask = Buffer.alloc(maskRowPadded * size, 0);

const imageData = Buffer.concat([bmpHeader, pixelData, andMask]);
const imageSize = imageData.length;

// ICO header (6 bytes)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);    // Reserved
icoHeader.writeUInt16LE(1, 2);    // Type (1 = ICO)
icoHeader.writeUInt16LE(1, 4);    // Count

// ICO directory entry (16 bytes)
const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(0, 0);        // Width (0 = 256)
dirEntry.writeUInt8(0, 1);        // Height (0 = 256)
dirEntry.writeUInt8(0, 2);        // Color count
dirEntry.writeUInt8(0, 3);        // Reserved
dirEntry.writeUInt16LE(1, 4);     // Planes
dirEntry.writeUInt16LE(32, 6);    // Bit count
dirEntry.writeUInt32LE(imageSize, 8);  // Image size
dirEntry.writeUInt32LE(22, 12);   // Offset (6 + 16 = 22)

const ico = Buffer.concat([icoHeader, dirEntry, imageData]);
fs.writeFileSync(__dirname + '/resources/icon.ico', ico);
console.log('icon.ico generated successfully:', ico.length, 'bytes');

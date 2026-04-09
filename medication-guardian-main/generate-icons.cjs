const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, 'public');

// Simple blue pill icon as SVG
const createPillIconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${size * 0.125}" y="${size * 0.1875}" width="${size * 0.75}" height="${size * 0.625}" rx="${size * 0.3125}" fill="#0f172a"/>
  <rect x="${size * 0.25}" y="${size * 0.34375}" width="${size * 0.5}" height="${size * 0.0625}" rx="${size * 0.015625}" fill="#22c55e"/>
  <rect x="${size * 0.25}" y="${size * 0.4375}" width="${size * 0.5}" height="${size * 0.0625}" rx="${size * 0.015625}" fill="#ffffff" fill-opacity="0.7"/>
  <rect x="${size * 0.25}" y="${size * 0.53125}" width="${size * 0.5}" height="${size * 0.0625}" rx="${size * 0.015625}" fill="#ffffff" fill-opacity="0.7"/>
</svg>`;

async function generateIcons() {
  const sizes = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 }
  ];

  for (const { name, size } of sizes) {
    const svg = Buffer.from(createPillIconSvg(size));
    await sharp(svg)
      .png()
      .toFile(path.join(publicDir, name));
    console.log(`Generated ${name}`);
  }

  console.log('All PWA icons generated successfully!');
}

generateIcons().catch(console.error);

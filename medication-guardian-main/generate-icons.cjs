const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, 'public');

// Simple blue pill icon as SVG
const createPillIconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0f172a"/>
  <rect x="${size * 0.1}" y="${size * 0.25}" width="${size * 0.8}" height="${size * 0.15}" rx="${size * 0.05}" fill="#22c55e"/>
  <rect x="${size * 0.1}" y="${size * 0.45}" width="${size * 0.8}" height="${size * 0.15}" rx="${size * 0.05}" fill="#ffffff" fill-opacity="0.7"/>
  <rect x="${size * 0.1}" y="${size * 0.65}" width="${size * 0.8}" height="${size * 0.15}" rx="${size * 0.05}" fill="#ffffff" fill-opacity="0.7"/>
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

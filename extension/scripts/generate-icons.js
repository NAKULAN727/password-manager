/**
 * Icon generation script for Sphynx extension.
 * Generates PNG icons at 16x16, 32x32, 48x48, and 128x128.
 * 
 * Since we can't generate actual PNGs without canvas/sharp,
 * this creates SVG placeholders that can be converted.
 * 
 * For production, replace these with actual PNG exports from your logo.
 * 
 * To use: Place your logo-web-redesigned.png in the icons/ folder
 * and resize to the required dimensions using any image editor.
 * 
 * Required files:
 *   icons/icon-16.png  (16x16)
 *   icons/icon-32.png  (32x32)
 *   icons/icon-48.png  (48x48)
 *   icons/icon-128.png (128x128)
 */

const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

// Generate simple SVG shield icons as placeholders
function generateSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" rx="4" fill="#0A0806"/>
  <path d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="#E8A020" opacity="0.9"/>
  <path d="M12 4L6 7.2v4.3c0 4.44 2.87 8.59 6 9.5 3.13-.91 6-5.06 6-9.5V7.2L12 4z" fill="#0A0806"/>
  <path d="M12 6L8 8.4v3.1c0 3.33 2.15 6.44 4 7.12 1.85-.68 4-3.79 4-7.12V8.4L12 6z" fill="#D4AF37" opacity="0.8"/>
</svg>`;
}

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = `icon-${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Generated: icons/${filename}`);
});

console.log('\\nNote: Chrome requires PNG icons. Convert these SVGs to PNG using:');
console.log('  - Any image editor (Figma, Photoshop, GIMP)');
console.log('  - Or use: npx svgexport icons/icon-128.svg icons/icon-128.png 128:128');
console.log('\\nFor now, you can also use your existing logo-web-redesigned.png resized to each dimension.');

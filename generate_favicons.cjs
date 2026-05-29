const sharp = require('sharp');
const path = require('path');

(async () => {
  const svgPath = path.resolve(__dirname, 'public', 'app-logo.svg');
  const out48 = path.resolve(__dirname, 'public', 'favicon-48.png');
  const out192 = path.resolve(__dirname, 'public', 'favicon-192.png');

  // Render SVG to PNG with exact dimensions, background transparent
  await sharp(svgPath)
    .resize(48, 48)
    .png({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(out48);

  await sharp(svgPath)
    .resize(192, 192)
    .png({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(out192);

  console.log('Favicons generated');
})();

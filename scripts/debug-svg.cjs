const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'app-logo.svg');
let svg = fs.readFileSync(svgPath, 'utf8');

// Remove filter definitions and filter references
svg = svg.replace(/<filter[\s\S]*?<\/filter>/g, '');
svg = svg.replace(/filter="[^"]*"/g, '');

console.log('=== Cleaned SVG (first 800 chars) ===');
console.log(svg.substring(0, 800));
console.log('=== End ===');

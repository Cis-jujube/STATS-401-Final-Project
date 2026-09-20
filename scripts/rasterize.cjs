// Optional PNG export using an already available Sharp installation.
// No dependency installation is performed. SVGs are the canonical figures.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const directory = process.argv[2] || 'assets/figures';
Promise.all(fs.readdirSync(directory).filter(name => name.endsWith('.svg')).map(name =>
  sharp(path.join(directory, name), {density: 144}).png()
    .toFile(path.join(directory, name.replace(/\.svg$/, '.png')))
)).then(results => console.log(`Rendered ${results.length} PNGs at 2× SVG resolution.`))
  .catch(error => { console.error(error); process.exitCode = 1; });

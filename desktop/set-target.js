// Overwrites build-target.json right before packaging, so preload.js bakes
// the right value into whichever build electron-builder is about to
// produce. Run automatically by the npm run build:* scripts - see
// package.json - not meant to be run by itself.
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
const valid = ['windows', 'gog', 'steam'];
if (!valid.includes(target)) {
  console.error(`Unknown build target "${target}" - expected one of: ${valid.join(', ')}`);
  process.exit(1);
}

const outPath = path.join(__dirname, 'build-target.json');
fs.writeFileSync(outPath, JSON.stringify({ target }, null, 2));
console.log(`Build target set to "${target}"`);

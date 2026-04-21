const fs = require('fs');
const beifen = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');
const corrupt = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');

console.log('beifen length:', beifen.length);
console.log('corrupt length:', corrupt.length);

// Find first difference
let firstDiff = -1;
for (let i = 0; i < Math.min(beifen.length, corrupt.length); i++) {
    if (beifen[i] !== corrupt[i]) {
        firstDiff = i;
        break;
    }
}
console.log('First diff at byte:', firstDiff);
if (firstDiff >= 0) {
    console.log('Context (beifen):', beifen.slice(Math.max(0, firstDiff - 30), firstDiff + 60));
    console.log('Context (corrupt):', corrupt.slice(Math.max(0, firstDiff - 30), firstDiff + 60));
    // Show hex
    console.log('beifen hex:', Buffer.from(beifen.slice(Math.max(0, firstDiff - 5), firstDiff + 5)).toString('hex'));
    console.log('corrupt hex:', Buffer.from(corrupt.slice(Math.max(0, firstDiff - 5), firstDiff + 5)).toString('hex'));
}

// Check if one is longer
if (beifen.length !== corrupt.length) {
    console.log('Lengths differ!');
    if (beifen.length > corrupt.length) {
        console.log('beifen has extra bytes at end:', beifen.slice(corrupt.length));
    } else {
        console.log('corrupt has extra bytes at end:', corrupt.slice(beifen.length));
    }
}

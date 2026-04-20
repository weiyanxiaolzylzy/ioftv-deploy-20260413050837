var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var text = buf.toString('utf8');
console.log('Original UTF-8 length:', text.length);

// Replace problematic Unicode chars
var fixed = text
    .replace(/→/g, '-&gt;')  // Replace → with HTML entity
    .replace(/「/g, '[')     // Replace 「
    .replace(/」/g, ']')     // Replace 」
    .replace(/—/g, '--')    // Replace em dash
    .replace(/'/g, "'")      // Replace curly apostrophe
    .replace(/"/g, '"')      // Replace curly quotes
    .replace(/…/g, '...');   // Replace ellipsis

console.log('Fixed length:', fixed.length);

try {
    new Function(fixed);
    console.log('Fixed version VALID!');
} catch(e) {
    console.log('Fixed version error:', e.message);
}

// Save
var outBuf = Buffer.from(fixed, 'utf8');
console.log('Output buffer length:', outBuf.length);
fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', outBuf);
console.log('Saved!');

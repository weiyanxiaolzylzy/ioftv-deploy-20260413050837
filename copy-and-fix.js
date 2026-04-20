var fs = require('fs');
var acorn = require('./server/node_modules/acorn');

// Read original 1063 file (already converted)
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js');
var text = buf.toString('utf8');

// Add proper ending
text = text + ']);';

console.log('Fixed length:', text.length);

try {
    new Function(text);
    console.log('Fixed version is VALID!');
} catch(e) {
    console.log('Still invalid:', e.message);
}

// Save as 3deb2
fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', text);
console.log('Saved!');

var fs = require('fs');
var Iconv = require('./server/node_modules/iconv-lite');

// Read original
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Original:', buf.length);

// Decode and replace template literals
var text = Iconv.decode(buf, 'gb18030');
console.log('Decoded:', text.length);

// Replace all template literals with string concatenation
var fixed = text
    .replace(/`\$\{([^}]+)\}`/g, function(match, expr) {
        // Simple replacement for ${...}
        return '"+(' + expr + ')+"';
    })
    // Add opening quote for string concatenation
    .replace(/^(\(window\.webpackJsonp=window\.webpackJsonp\|\|\[\]\)\.push\(\[\[)/, '$1"');

console.log('Fixed:', fixed.length);

// Verify
try {
    new Function(fixed);
    console.log('VALID JS!');
} catch(e) {
    console.log('Error:', e.message);
}

var fs = require('fs');
var acorn = require('./server/node_modules/acorn');

var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');

// Find chunk start
var start = text.indexOf('"17aa":function');
var chunk = text.slice(start);

// Find the end of the first module
var pos = 0;
var depth = 0;
for (var i = 0; i < chunk.length; i++) {
    if (chunk[i] === '{') depth++;
    else if (chunk[i] === '}') {
        depth--;
        if (depth === 0) {
            pos = i;
            break;
        }
    }
}

console.log('First module ends at:', pos);
var firstModule = chunk.slice(0, pos + 1);
console.log('First module length:', firstModule.length);

// Test first module
try {
    new Function(firstModule);
    console.log('First module is VALID!');
} catch(e) {
    console.log('First module error:', e.message);
}

// Check if there's a second module
var afterFirst = chunk.slice(pos + 1).trim();
console.log('After first module:', afterFirst.slice(0, 50));

var fs = require('fs');
var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');

// Find the actual syntax issue by removing the webpack wrapper and testing parts
var start = text.indexOf('"17aa":function');
var end = text.lastIndexOf('}]);');

console.log('Chunk start:', start, 'end:', end);

if (start > 0 && end > start) {
    var chunk = text.slice(start, end + 3);
    console.log('Chunk length:', chunk.length);
    
    // Test just the chunk
    try {
        new Function(chunk);
        console.log('Chunk is valid!');
    } catch(e) {
        console.log('Chunk error:', e.message);
    }
}

// Let's also check if the webpack wrapper is correct
var wrapper = text.slice(0, start);
console.log('Wrapper length:', wrapper.length);
console.log('Wrapper:', wrapper);

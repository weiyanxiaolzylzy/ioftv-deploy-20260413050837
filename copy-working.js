var fs = require('fs');

// Read the file
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js');
var text = buf.toString('utf8');

console.log('File length:', text.length);

// Try to validate
try {
    new Function(text);
    console.log('VALID JS!');
} catch(e) {
    console.log('Error:', e.message);
}

// Check if it's a complete webpack chunk
console.log('Starts with webpack:', text.startsWith('(window.webpackJsonp'));
console.log('Ends with ]);:', text.endsWith(']);'));

// Let's try adding the ending if it's missing
if (!text.endsWith(']);')) {
    console.log('Missing ending - adding ]);');
    text = text + ']);';
    
    // Try again
    try {
        new Function(text);
        console.log('VALID after adding ending!');
    } catch(e) {
        console.log('Still invalid:', e.message);
    }
    
    // Save
    fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', text, 'utf8');
    console.log('Saved!');
}

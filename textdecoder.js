var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');

console.log('Buffer length:', buf.length);

// Use TextDecoder with fatal mode
var text;
try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    console.log('TextDecoder with fatal succeeded!');
    console.log('Text length:', text.length);
    
    // Test if this text is valid JS
    try {
        new Function(text);
        console.log('VALID JS!');
    } catch(e) {
        console.log('JS error:', e.message);
    }
    
    // Save
    fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', text);
    console.log('Saved!');
} catch(e) {
    console.log('TextDecoder error:', e.message);
}

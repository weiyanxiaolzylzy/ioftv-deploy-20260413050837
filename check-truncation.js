var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');

console.log('Buffer length:', buf.length);

// Check bytes at position 665-680
console.log('Bytes 665-680:', buf.slice(665, 681).toString('hex'));

// Try to decode with TextDecoder which might handle errors differently
var text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
console.log('TextDecoder length:', text.length);

// Check if they differ
if (text.length !== buf.length) {
    console.log('UTF-8 truncation detected!');
    // Find where the truncation happens
    for (var i = 0; i < Math.min(text.length + 50, buf.length); i++) {
        if (i >= text.length) {
            console.log('First missing byte at:', i);
            console.log('Bytes around:', buf.slice(Math.max(0, i-10), i+20).toString('hex'));
            break;
        }
    }
}

// Try decoding with error handling
try {
    var validUtf8 = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    console.log('Valid UTF-8!');
} catch(e) {
    console.log('Invalid UTF-8:', e.message);
}

var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var content = buf.toString('latin1');

console.log('File length:', content.length);
console.log('');

try {
    acorn.parse(content, { ecmaVersion: 2020, sourceType: 'script' });
} catch(e) {
    var pos = e.pos;
    console.log('Acorn error at pos:', pos);
    console.log('Message:', e.message);

    var start = Math.max(0, pos - 50);
    var end = Math.min(content.length, pos + 50);
    var ctx = content.substring(start, end);

    console.log('');
    console.log('Context around pos ' + pos + ':');
    console.log(JSON.stringify(ctx));

    console.log('');
    console.log('Hex dump around pos ' + pos + ':');
    for (var i = Math.max(0, pos - 10); i < Math.min(content.length, pos + 10); i++) {
        var c = content.charCodeAt(i);
        var display = c >= 32 && c < 127 ? String.fromCharCode(c) : '.';
        console.log('  ' + i + ': 0x' + c.toString(16) + ' = ' + c + ' = ' + display);
    }

    console.log('');
    console.log('Raw bytes from pos ' + pos + ':');
    var bufSlice = buf.slice(pos, pos + 20);
    console.log('Hex:', bufSlice.toString('hex'));

    // Try UTF-8 decode of the surrounding bytes
    var utf8_start = pos - 3;
    var utf8Slice = buf.slice(Math.max(0, utf8_start), pos + 20);
    console.log('Trying UTF-8 from pos ' + utf8_start + ':', JSON.stringify(utf8Slice.toString('utf8')));
}

var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var content = buf.toString('latin1');

console.log('File length:', content.length);

// Check what Acorn says about error position 17605
var pos = 17605;
console.log('\nAt position', pos, ':');
console.log('  Byte:', content[pos].toString(16), '(char:', JSON.stringify(content[pos]), ')');
console.log('  Context:', JSON.stringify(content.substring(pos - 30, pos + 30)));

// Now try parsing a truncated version - everything UP TO the error
// to see if the file is valid up to that point
function tryParse(upTo) {
    try {
        acorn.parse(content.substring(0, upTo), { ecmaVersion: 2020, sourceType: 'script' });
        return true;
    } catch (e) {
        return { ok: false, pos: e.pos, msg: e.message };
    }
}

// Binary search for exact error position
var lo = 0, hi = content.length;
while (hi - lo > 100) {
    var mid = Math.floor((lo + hi) / 2);
    var result = tryParse(mid);
    if (result === true) {
        lo = mid;
    } else {
        hi = mid;
    }
}

// Fine search
for (var i = lo; i < Math.min(lo + 200, content.length); i++) {
    var r = tryParse(i);
    if (r !== true) {
        console.log('\nFirst failure at', i, 'byte', content[i].toString(16), JSON.stringify(content[i]));
        console.log('Acorn says pos:', r.pos, 'msg:', r.msg);
        // Show the exact bytes around the error
        console.log('Context:', JSON.stringify(content.substring(Math.max(0,i-40), i+40)));
        // Show what's special about the byte
        var byte = content.charCodeAt(i);
        console.log('Byte value:', byte, '0x' + byte.toString(16));
        break;
    }
}

// Also check: are there any non-ASCII chars BEFORE the error that could cause issues?
console.log('\nSearching for non-ASCII chars before position 17600:');
for (var i = 0; i < 17600; i++) {
    var c = content.charCodeAt(i);
    if (c > 127) {
        console.log('  Non-ASCII at', i, ':', c, '0x' + c.toString(16), '=', JSON.stringify(content[i]));
        if (i > 100) break; // only show first few
    }
}

// Check what bytes exist around position 17605 in detail
console.log('\nDetailed bytes around position 17605:');
for (var i = 17590; i < 17620; i++) {
    var c = content.charCodeAt(i);
    var hex = c.toString(16).padStart(2, '0');
    var desc = '';
    if (c >= 0x80) {
        // Try to decode as UTF-8
        var b1 = content.charCodeAt(i);
        var b2 = content.charCodeAt(i+1) || 0;
        var b3 = content.charCodeAt(i+2) || 0;
        if ((b1 & 0xE0) === 0xC0 && (b2 & 0xC0) === 0x80) {
            var cp = ((b1 & 0x1F) << 6) | (b2 & 0x3F);
            desc = '-> U+' + cp.toString(16);
            i++; // skip next byte
        } else if ((b1 & 0xF0) === 0xE0 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
            var cp = ((b1 & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F);
            desc = '-> U+' + cp.toString(16);
            i += 2;
        } else {
            desc = '-> RAW 0x' + b1.toString(16);
        }
    }
    console.log('  pos', i, ':', hex, JSON.stringify(content[i]), desc);
}

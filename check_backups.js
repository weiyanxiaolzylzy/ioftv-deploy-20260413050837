var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var base = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/';

console.log('=== Checking backup files ===');

var files = [
    'project-ifc.3deb2a0f040de4b2cc6c.js.bak',
    'project-ifc.3deb2a0f040de4b2cc6c.js.backup'
];

files.forEach(function(f) {
    var path = base + f;
    if (fs.existsSync(path)) {
        var buf = fs.readFileSync(path);
        console.log('\n' + f + ':');
        console.log('  Size:', buf.length, 'bytes');
        console.log('  First 20 bytes:', buf.slice(0, 20).toString('hex'));
        var str = buf.toString('utf8');
        console.log('  String length:', str.length);
        console.log('  Ends:', JSON.stringify(str.slice(-20)));
        console.log('  Has 17aa stub:', str.indexOf('"17aa":function(t,e,s){"use strict";s("8920")}') >= 0);
        console.log('  Backticks:', (str.match(/\x60/g) || []).length);
        
        // Try acorn
        try {
            acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            console.log('  Acorn: SUCCESS');
        } catch(e) {
            console.log('  Acorn: FAILED at pos', e.pos, ':', e.message);
            console.log('  Context:', JSON.stringify(str.slice(Math.max(0, e.pos - 30), e.pos + 30)));
        }
        
        // Check bracket balance
        var b=0, br=0, p=0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 123) b++;
            else if (c === 125) b--;
            else if (c === 91) br++;
            else if (c === 93) br--;
            else if (c === 40) p++;
            else if (c === 41) p--;
        }
        console.log('  Brackets: b=' + b + ' br=' + br + ' p=' + p);
    } else {
        console.log(f + ': NOT FOUND');
    }
});

// Check what a WORKING chunk looks like (LSD.bighome)
console.log('\n=== Checking working chunk (LSD.bighome) ===');
var workingBuf = fs.readFileSync(base + 'LSD.bighome.3deb2a0f040de4b2cc6c.js');
var workingStr = workingBuf.toString('utf8');
console.log('Size:', workingBuf.length, 'bytes,', workingStr.length, 'chars');
console.log('Ends:', JSON.stringify(workingStr.slice(-20)));

try {
    acorn.parse(workingStr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Acorn: SUCCESS');
} catch(e) {
    console.log('Acorn: FAILED at pos', e.pos, ':', e.message);
}

// Check bracket balance
var b=0, br=0, p=0;
for (var i = 0; i < workingStr.length; i++) {
    var c = workingStr.charCodeAt(i);
    if (c === 123) b++;
    else if (c === 125) b--;
    else if (c === 91) br++;
    else if (c === 93) br--;
    else if (c === 40) p++;
    else if (c === 41) p--;
}
console.log('Brackets: b=' + b + ' br=' + br + ' p=' + p);

// Check app.js too
console.log('\n=== Checking app.js ===');
var appBuf = fs.readFileSync(base + 'app.3deb2a0f040de4b2cc6c.js');
var appStr = appBuf.toString('utf8');
console.log('Size:', appBuf.length, 'bytes,', appStr.length, 'chars');
try {
    acorn.parse(appStr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Acorn: SUCCESS');
} catch(e) {
    console.log('Acorn: FAILED at pos', e.pos, ':', e.message);
}

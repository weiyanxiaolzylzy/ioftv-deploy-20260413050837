var fs = require('fs');
var http = require('http');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';

var disk = fs.readFileSync(target);
var diskStr = disk.toString('utf8');

console.log('=== Current Disk File ===');
console.log('Size:', disk.length, 'bytes,', diskStr.length, 'chars');

var p=0,b2=0,br=0;
for (var i = 0; i < diskStr.length; i++) {
    var c = diskStr.charCodeAt(i);
    if (c === 40) p++;
    else if (c === 41) p--;
    else if (c === 123) b2++;
    else if (c === 125) b2--;
    else if (c === 91) br++;
    else if (c === 93) br--;
}
console.log('Brackets: p=' + p + ' b=' + b2 + ' br=' + br);

try {
    acorn.parse(diskStr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Acorn: SUCCESS!');
} catch(e) {
    console.log('Acorn: FAILED at ' + e.pos + ': ' + e.message);
}

console.log('\n=== Server ===');
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        console.log('Server size:', buf.length);
        var str = buf.toString('utf8');
        var p2=0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 40) p2++;
            else if (c === 41) p2--;
        }
        console.log('Server p balance:', p2);
        
        var stack = [];
        var inStr = false;
        var strChar = '';
        for (var i = 0; i < str.length; i++) {
            var c = str[i];
            if (!inStr) {
                if (c === '"' || c === "'" || c === '`') {
                    inStr = true;
                    strChar = c;
                } else if (c === '(') {
                    stack.push(i);
                } else if (c === ')') {
                    if (stack.length > 0) {
                        stack.pop();
                    } else {
                        console.log('Orphaned ) at: ' + i);
                    }
                }
            } else {
                if (c === '\\') { i++; }
                else if (c === strChar && str[i-1] !== '\\') { inStr = false; }
            }
        }
        
        try {
            acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            console.log('Server acorn: SUCCESS!');
        } catch(e2) {
            console.log('Server acorn: FAILED at ' + e2.pos + ': ' + e2.message);
        }
    });
});

console.log('\n=== Other Chunks ===');
var others = ['LSD.bighome.3deb2a0f040de4b2cc6c.js', 'secondview.3deb2a0f040de4b2cc6c.js'];
others.forEach(function(f) {
    var path = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/' + f;
    if (fs.existsSync(path)) {
        var buf = fs.readFileSync(path);
        var str = buf.toString('utf8');
        var p3=0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 40) p3++;
            else if (c === 41) p3--;
        }
        var ok = false;
        try {
            acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            ok = true;
        } catch(e3) {}
        console.log(f + ': size=' + buf.length + ' p=' + p3 + ' acorn=' + (ok ? 'OK' : 'FAIL'));
    }
});

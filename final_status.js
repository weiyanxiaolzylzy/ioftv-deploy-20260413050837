var http = require('http');
var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';

console.log('=== Current Disk File ===');
var disk = fs.readFileSync(target);
var diskStr = disk.toString('utf8');
console.log('Size:', disk.length, 'bytes,', diskStr.length, 'chars');
console.log('First 10 bytes:', disk.slice(0, 10).toString('hex'));
console.log('Last 10 chars:', JSON.stringify(diskStr.slice(-10)));

// Bracket check
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

// Acorn check
try {
    acorn.parse(diskStr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Acorn: SUCCESS!');
} catch(e) {
    console.log('Acorn: FAILED at', e.pos, ':', e.message);
}

console.log('\n=== Server Response ===');
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        var str = buf.toString('utf8');
        console.log('Served size:', buf.length, 'bytes,', str.length, 'chars');
        console.log('First 10 bytes:', buf.slice(0, 10).toString('hex'));
        console.log('Last 10 chars:', JSON.stringify(str.slice(-10)));
        
        var p2=0,b3=0,br2=0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 40) p2++;
            else if (c === 41) p2--;
            else if (c === 123) b3++;
            else if (c === 125) b3--;
            else if (c === 91) br2++;
            else if (c === 93) br2--;
        }
        console.log('Served Brackets: p=' + p2 + ' b=' + b3 + ' br=' + br2);
        
        try {
            acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            console.log('Served Acorn: SUCCESS!');
        } catch(e2) {
            console.log('Served Acorn: FAILED at', e2.pos, ':', e2.message);
        }
        
        console.log('\nDisk matches server?:', disk.equals(buf) ? 'YES' : 'NO');
        
        // Check error position
        if (str.length > 16675) {
            console.log('\nChar at 16675:', JSON.stringify(str.charAt(16675)));
            console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
        }
    });
});

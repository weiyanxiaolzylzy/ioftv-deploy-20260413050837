var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
var http = require('http');

// The git HEAD version of project-ifc chunk is broken (p=-2)
// Let me check: what about the 1063e5d0 version in git?
var cp = require('child_process');
var path = require('path');

console.log('=== Checking git for 1063e5d0 version ===');
try {
    var tmpPath = path.join(process.env.TEMP || 'C:\\Users\\weiyanxiao\\AppData\\Local\\Temp', 'git_1063.bin');
    cp.execSync('git show HEAD:dist/static/js/project-ifc.1063e5d0b18f28247f69.js > "' + tmpPath + '"', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'});
    var buf = fs.readFileSync(tmpPath);
    var str = buf.toString('utf8');
    var p = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c === 40) p++;
        else if (c === 41) p--;
    }
    var ok = false;
    try {
        acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        ok = true;
    } catch(e) {}
    console.log('1063e5d0 git: size=' + buf.length + ' p=' + p + ' acorn=' + (ok ? 'OK' : 'FAIL'));
    if (ok) {
        console.log('FOUND WORKING VERSION! 1063e5d0 in git is clean!');
        
        // Check current disk 1063e5d0
        var diskPath = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js';
        if (fs.existsSync(diskPath)) {
            var diskBuf = fs.readFileSync(diskPath);
            if (diskBuf.equals(buf)) {
                console.log('Disk 1063e5d0 MATCHES git version');
            } else {
                console.log('Disk 1063e5d0 is DIFFERENT from git');
                var diskStr = diskBuf.toString('utf8');
                var dp = 0;
                for (var i = 0; i < diskStr.length; i++) {
                    var c = diskStr.charCodeAt(i);
                    if (c === 40) dp++;
                    else if (c === 41) dp--;
                }
                console.log('Disk p balance:', dp);
            }
        }
        
        // Copy to all locations
        var targets = [
            'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js',
            'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js',
            'd:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js'
        ];
        targets.forEach(function(t) {
            fs.writeFileSync(t, buf);
            console.log('Saved to:', t.split('/').pop());
        });
        
        // Verify
        var v = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
        try {
            acorn.parse(v.toString('utf8'), { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            console.log('VERIFIED!');
        } catch(e2) {
            console.log('Verify failed:', e2.pos);
        }
    }
} catch(e) {
    console.log('Error:', e.message);
}

// Also check the error position in the WORKING 1063e5d0 version
console.log('\n=== Error positions in 1063e5d0 ===');
try {
    var tmpPath = path.join(process.env.TEMP || 'C:\\Users\\weiyanxiao\\AppData\\Local\\Temp', 'git_1063.bin');
    var buf = fs.readFileSync(tmpPath);
    var str = buf.toString('utf8');
    console.log('At position 16274:', JSON.stringify(str.charAt(16274)));
    console.log('Context:', JSON.stringify(str.slice(16260, 16290)));
    console.log('At position 16675:', JSON.stringify(str.charAt(16675)));
    console.log('Context:', JSON.stringify(str.slice(16660, 16690)));
} catch(e) {}

// Check server
console.log('\n=== Server status ===');
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        console.log('Server sends size:', buf.length);
        var str = buf.toString('utf8');
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 40) p++;
            else if (c === 41) p--;
        }
        console.log('Server p balance:', p);
        try {
            acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            console.log('Server acorn: SUCCESS!');
        } catch(e2) {
            console.log('Server acorn: FAILED at', e2.pos);
        }
    });
});

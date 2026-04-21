var fs = require('fs');
var path = require('path');

// Check what acorn modules exist
var acornDir = 'd:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn';
console.log('Acorn contents:', fs.readdirSync(acornDir).slice(0, 20));

// Try to load the correct entry
var acorn;
try {
    acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
    console.log('Loaded acorn version:', acorn.version);
} catch(e) {
    console.log('Load error:', e.message);
}

// Read the file
var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');
console.log('\nFile size:', buf.length, 'bytes,', str.length, 'chars');

if (acorn) {
    // Try script mode
    console.log('\n=== Script Parse ===');
    try {
        var result = acorn.parse(str, {
            ecmaVersion: 2020,
            sourceType: 'script',
            allowReturnOutsideFunction: true
        });
        console.log('SUCCESS! Body:', result.body.length);
    } catch(e) {
        console.log('FAILED at pos', e.pos, ':', e.message);
        if (e.pos !== undefined && e.pos >= 0) {
            console.log('Context:', JSON.stringify(str.slice(Math.max(0, e.pos - 50), e.pos + 50)));
        }
    }

    // Try module mode
    console.log('\n=== Module Parse ===');
    try {
        var result2 = acorn.parse(str, {
            ecmaVersion: 2020,
            sourceType: 'module'
        });
        console.log('SUCCESS!');
    } catch(e2) {
        console.log('FAILED at pos', e2.pos, ':', e2.message);
        if (e2.pos !== undefined && e2.pos >= 0) {
            console.log('Context:', JSON.stringify(str.slice(Math.max(0, e2.pos - 50), e2.pos + 50)));
        }
    }
}

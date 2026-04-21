var cp = require('child_process');
var fs = require('fs');
var path = require('path');

// Check if acorn is installed anywhere
var dirs = [
    'd:/Roaming/ioftv-deploy-20260413050837/node_modules/acorn',
    'd:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn',
    'd:/Roaming/ioftv-deploy-20260413050837/ifc/node_modules/acorn'
];

var acornPath = null;
for (var i = 0; i < dirs.length; i++) {
    if (fs.existsSync(dirs[i] + '/package.json')) {
        console.log('Found acorn at:', dirs[i]);
        acornPath = dirs[i];
    }
}

if (!acornPath) {
    console.log('Acorn not found, installing temporarily...');
    // Install acorn to temp dir
    var tmpDir = path.join(process.env.TEMP || 'C:\\Users\\weiyanxiao\\AppData\\Local\\Temp', 'acorn_test');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    cp.execSync('npm init -y > nul 2>&1 && npm install acorn > nul 2>&1', {cwd: tmpDir});
    acornPath = tmpDir;
}

var acorn = require(acornPath + '/acorn');

// Read the file
var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

console.log('\nFile size:', buf.length, 'bytes,', str.length, 'chars');

// Try parsing as script (not module, since webpack chunks use "script" mode)
console.log('\n=== Acorn Script Parse ===');
try {
    var result = acorn.parse(str, {
        ecmaVersion: 2020,
        sourceType: 'script',
        allowReturnOutsideFunction: true,
        allowUndeclaredExports: true,
        checkDestructuring: false,
        preserveAllComments: true
    });
    console.log('SUCCESS! AST body length:', result.body ? result.body.length : 'N/A');
} catch(e) {
    console.log('FAILED at pos', e.pos, ':', e.message);
    console.log('Line:', e.loc ? e.loc.line : 'N/A', 'Col:', e.loc ? e.loc.column : 'N/A');
    if (e.pos !== undefined && e.pos >= 0) {
        console.log('Context:', JSON.stringify(str.slice(Math.max(0, e.pos - 40), e.pos + 40)));
    }
}

// Also try as module (webpack 4 sometimes uses module format)
console.log('\n=== Acorn Module Parse ===');
try {
    var result2 = acorn.parse(str, {
        ecmaVersion: 2020,
        sourceType: 'module'
    });
    console.log('SUCCESS!');
} catch(e2) {
    console.log('FAILED at pos', e2.pos, ':', e2.message);
    console.log('Line:', e2.loc ? e2.loc.line : 'N/A', 'Col:', e2.loc ? e2.loc.column : 'N/A');
    if (e2.pos !== undefined && e2.pos >= 0) {
        console.log('Context:', JSON.stringify(str.slice(Math.max(0, e2.pos - 40), e2.pos + 40)));
    }
}

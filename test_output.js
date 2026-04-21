const vm = require('vm');
const fs = require('fs');

const content = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');

// Extract the module "2b00" function body - find it
const match = content.match(/"2b00":function\(t,e,s\)"use strict";s\.r\(e\);(.+?)\n\}\}\},n=/s;
if (!match) {
    console.log('Could not find module 2b00');
    process.exit(1);
}

const moduleBody = match[1];
console.log('Module body length:', moduleBody.length);

// Try to parse the module body in isolation
try {
    new vm.Script('function testFn(module, exports, require) {' + moduleBody + '\n}');
    console.log('Module body: VALID via vm.Script');
} catch(e) {
    console.log('Module body vm.Script error:', e.message);
}

// Now check the entire file
try {
    new vm.Script(content);
    console.log('Full file: VALID via vm.Script');
} catch(e) {
    console.log('Full file vm.Script error:', e.message);
    // Find the error position
    const pos = e.message.match(/at position (\d+)/);
    if (pos) {
        const p = parseInt(pos[1]);
        console.log('Error near position', p, ':', content.substring(Math.max(0, p-30), p+30));
    }
}

// Check specific expressions for syntax issues
const suspicious = [
    'return t.getFullYear()+"-"+e+"-"+s',
    'return(window.location.origin)+(t.startsWith("/")?t:"/"+t)',
    '"已更新 "+(this.listSelectedRows.length)+" 个构件"',
    '"/api/projects/"+(t.id)+"/components/batch-assign"',
];

for (const expr of suspicious) {
    try {
        new vm.Script(expr);
        console.log('OK:', expr);
    } catch(e) {
        console.log('FAIL:', expr, '->', e.message);
    }
}

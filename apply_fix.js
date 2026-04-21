var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Problem 1: Extra ) at position 16272
// Problem 2: Two orphaned ) at 32548 and 32572

// After removing 16272:
// - Position 32548 becomes 32547
// - Position 32572 becomes 32571

// Strategy: build the fixed string by combining slices
// Original: [0..16272) + [16273..32548) + [32549..32572) + [32573..end)

var fixed = str.slice(0, 16272) + str.slice(16273, 32548) + str.slice(32549, 32572) + str.slice(32573);

console.log('Original size:', str.length);
console.log('Fixed size:', fixed.length);
console.log('Expected size:', str.length - 3);

// Check brackets
var p=0,b2=0,br=0;
for (var i = 0; i < fixed.length; i++) {
    var c = fixed.charCodeAt(i);
    if (c === 40) p++;
    else if (c === 41) p--;
    else if (c === 123) b2++;
    else if (c === 125) b2--;
    else if (c === 91) br++;
    else if (c === 93) br--;
}
console.log('Brackets: p=' + p + ' b=' + b2 + ' br=' + br);

// Acorn parse
try {
    acorn.parse(fixed, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Acorn: SUCCESS!');
    
    // Save!
    var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
    fs.writeFileSync(target, fixed);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', fixed);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', fixed);
    console.log('SAVED!');
    
    // Verify
    var v = fs.readFileSync(target);
    var vstr = v.toString('utf8');
    try {
        acorn.parse(vstr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('VERIFIED!');
    } catch(e2) {
        console.log('Verify FAILED at', e2.pos);
    }
    
    console.log('New ending:', JSON.stringify(fixed.slice(-15)));
    console.log('Context at original 16272:', JSON.stringify(fixed.slice(16260, 16290)));
    
} catch(e) {
    console.log('Acorn: FAILED at', e.pos, ':', e.message);
}

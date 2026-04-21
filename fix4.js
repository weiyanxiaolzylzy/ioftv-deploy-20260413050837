var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// The analysis shows: at position 16272, there's an extra )
// The pattern is: ])}),!1 at 16267-16274
// By removing the ) at 16272, the structure becomes ]}),!1
// which means: ] closes array, } closes component, ) closes e(), ,!1 is last prop

// Let me verify the context
console.log('Chars 16267-16275:');
for (var i = 16267; i <= 16275; i++) {
    console.log('  pos', i, ':', JSON.stringify(str[i]), 'code:', str.charCodeAt(i));
}

// Now let's try different fix options
console.log('\n=== Trying fixes ===');

// Fix 1: Remove the extra ) at position 16272
var fix1 = str.slice(0, 16272) + str.slice(16273);
var p1 = 0;
for (var i = 0; i < fix1.length; i++) {
    var c = fix1.charCodeAt(i);
    if (c === 40) p1++;
    else if (c === 41) p1--;
}
console.log('Fix 1 (remove char at 16272): balance =', p1);
try {
    acorn.parse(fix1, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 1: SUCCESS!');
} catch(e1) {
    console.log('Fix 1: FAILED at', e1.pos, ':', e1.message);
}

// Fix 2: Also fix the orphaned ) at the end
var fix2 = fix1.slice(0, fix1.length - 1) + ')'; // add ) at end to balance
var p2 = 0;
for (var i = 0; i < fix2.length; i++) {
    var c = fix2.charCodeAt(i);
    if (c === 40) p2++;
    else if (c === 41) p2--;
}
console.log('\nFix 2 (remove 16272 + add ) at end): balance =', p2);
try {
    acorn.parse(fix2, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 2: SUCCESS!');
} catch(e2) {
    console.log('Fix 2: FAILED at', e2.pos, ':', e2.message);
}

// Fix 3: Remove char at 16272 AND remove the orphaned ) at end
var fix3 = fix1.slice(0, fix1.length - 1); // remove the trailing )
var p3 = 0;
for (var i = 0; i < fix3.length; i++) {
    var c = fix3.charCodeAt(i);
    if (c === 40) p3++;
    else if (c === 41) p3--;
}
console.log('\nFix 3 (remove 16272 + remove trailing )): balance =', p3);
try {
    acorn.parse(fix3, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 3: SUCCESS!');
} catch(e3) {
    console.log('Fix 3: FAILED at', e3.pos, ':', e3.message);
}

// Fix 4: Just remove the orphaned ) at end (no position 16272 fix)
var fix4 = str.slice(0, str.length - 1) + ')';
var p4 = 0;
for (var i = 0; i < fix4.length; i++) {
    var c = fix4.charCodeAt(i);
    if (c === 40) p4++;
    else if (c === 41) p4--;
}
console.log('\nFix 4 (add ) at end only): balance =', p4);
try {
    acorn.parse(fix4, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 4: SUCCESS!');
} catch(e4) {
    console.log('Fix 4: FAILED at', e4.pos, ':', e4.message);
}

// Fix 5: Remove ) at 16272 AND replace orphaned ) at end with nothing
var fix5 = str.slice(0, 16272) + str.slice(16273, str.length - 1);
var p5 = 0;
for (var i = 0; i < fix5.length; i++) {
    var c = fix5.charCodeAt(i);
    if (c === 40) p5++;
    else if (c === 41) p5--;
}
console.log('\nFix 5 (remove 16272, remove trailing char): balance =', p5);
try {
    acorn.parse(fix5, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 5: SUCCESS!');
} catch(e5) {
    console.log('Fix 5: FAILED at', e5.pos, ':', e5.message);
}

// Fix 6: Remove ) at 16272 AND replace orphaned ) at end with }
var fix6 = str.slice(0, 16272) + str.slice(16273, str.length - 1) + '}';
var p6 = 0;
for (var i = 0; i < fix6.length; i++) {
    var c = fix6.charCodeAt(i);
    if (c === 40) p6++;
    else if (c === 41) p6--;
}
console.log('\nFix 6 (remove 16272, replace trailing with }): balance =', p6);
try {
    acorn.parse(fix6, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 6: SUCCESS!');
} catch(e6) {
    console.log('Fix 6: FAILED at', e6.pos, ':', e6.message);
}

// Fix 7: Replace the orphaned ) at end with nothing, but keep position 16272
var fix7 = str.slice(0, str.length - 1);
var p7 = 0;
for (var i = 0; i < fix7.length; i++) {
    var c = fix7.charCodeAt(i);
    if (c === 40) p7++;
    else if (c === 41) p7--;
}
console.log('\nFix 7 (just remove trailing )): balance =', p7);
try {
    acorn.parse(fix7, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 7: SUCCESS!');
} catch(e7) {
    console.log('Fix 7: FAILED at', e7.pos, ':', e7.message);
}

// Find the working fix
var workingFix = null;
var workingFixName = null;
var tests = [
    { name: 'Fix 1', data: fix1, p: p1 },
    { name: 'Fix 2', data: fix2, p: p2 },
    { name: 'Fix 3', data: fix3, p: p3 },
    { name: 'Fix 4', data: fix4, p: p4 },
    { name: 'Fix 5', data: fix5, p: p5 },
    { name: 'Fix 6', data: fix6, p: p6 },
    { name: 'Fix 7', data: fix7, p: p7 }
];

for (var t = 0; t < tests.length; t++) {
    var test = tests[t];
    try {
        acorn.parse(test.data, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        workingFix = test.data;
        workingFixName = test.name;
        console.log('\n*** WORKING FIX:', test.name, '***');
        break;
    } catch(e) {}
}

if (workingFix) {
    console.log('Saving fix:', workingFixName);
    var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
    fs.writeFileSync(target, workingFix);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', workingFix);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', workingFix);
    
    // Verify
    var v = fs.readFileSync(target);
    console.log('File size:', v.length);
    var vstr = v.toString('utf8');
    var vb=0;
    for (var i = 0; i < vstr.length; i++) {
        var c = vstr.charCodeAt(i);
        if (c === 40) vb++;
        else if (c === 41) vb--;
    }
    console.log('Final balance:', vb);
    try {
        acorn.parse(vstr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('Verify: SUCCESS!');
    } catch(e9) {
        console.log('Verify FAILED:', e9.pos, e9.message);
    }
}

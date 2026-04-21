var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

console.log('Original size:', str.length, 'chars');
console.log('Ends:', JSON.stringify(str.slice(-30)));

// Strategy: remove orphaned ) at 32548 and 32572
// Fix 1: remove ) at 32548 only
var fix1 = str.slice(0, 32548) + str.slice(32549);
var p1 = 0;
for (var i = 0; i < fix1.length; i++) {
    var c = fix1.charCodeAt(i);
    if (c === 40) p1++;
    else if (c === 41) p1--;
}
console.log('\nFix 1 (remove 32548): balance =', p1);
try { acorn.parse(fix1, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Fix 2: remove ) at 32572 only
var fix2 = str.slice(0, 32572) + str.slice(32573);
var p2 = 0;
for (var i = 0; i < fix2.length; i++) {
    var c = fix2.charCodeAt(i);
    if (c === 40) p2++;
    else if (c === 41) p2--;
}
console.log('\nFix 2 (remove 32572): balance =', p2);
try { acorn.parse(fix2, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Fix 3: remove both orphaned )
var fix3 = str.slice(0, 32548) + str.slice(32549, 32572) + str.slice(32573);
var p3 = 0;
for (var i = 0; i < fix3.length; i++) {
    var c = fix3.charCodeAt(i);
    if (c === 40) p3++;
    else if (c === 41) p3--;
}
console.log('\nFix 3 (remove both): balance =', p3);
try { acorn.parse(fix3, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Fix 4: remove both AND also remove the semicolon at 32548 (was 32549 in original)
var fix4 = str.slice(0, 32548) + str.slice(32550, 32572) + str.slice(32573);
var p4 = 0;
for (var i = 0; i < fix4.length; i++) {
    var c = fix4.charCodeAt(i);
    if (c === 40) p4++;
    else if (c === 41) p4--;
}
console.log('\nFix 4 (remove 32548 and ;): balance =', p4);
try { acorn.parse(fix4, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Fix 5: remove both AND replace the semicolon with nothing (no ; between null and e.default)
var fix5 = str.slice(0, 32548) + str.slice(32550, 32572) + str.slice(32573);
var p5 = 0;
for (var i = 0; i < fix5.length; i++) {
    var c = fix5.charCodeAt(i);
    if (c === 40) p5++;
    else if (c === 41) p5--;
}
console.log('\nFix 5 (remove both, remove ;): balance =', p5);
try { acorn.parse(fix5, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Fix 6: just remove the orphaned ) at 32572
// The ) at 32572 closes .push(), and there's also a } at 32569
// Maybe the file should end with }]);
var fix6 = str.slice(0, 32572) + str.slice(32573);
console.log('\nFix 6 (remove 32572): new end:', JSON.stringify(fix6.slice(-10)));
var p6 = 0;
for (var i = 0; i < fix6.length; i++) {
    var c = fix6.charCodeAt(i);
    if (c === 40) p6++;
    else if (c === 41) p6--;
}
console.log('Fix 6 balance:', p6);
try { acorn.parse(fix6, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Fix 7: replace ) at 32572 with nothing, AND add a } at the end
var fix7 = str.slice(0, 32572) + str.slice(32573) + '}';
var p7 = 0;
for (var i = 0; i < fix7.length; i++) {
    var c = fix7.charCodeAt(i);
    if (c === 40) p7++;
    else if (c === 41) p7--;
}
console.log('\nFix 7 (remove 32572, add } at end): balance =', p7);
try { acorn.parse(fix7, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Fix 8: just replace ) at 32548 with nothing (no fix at 32572)
var fix8 = str.slice(0, 32548) + str.slice(32549);
var p8 = 0;
for (var i = 0; i < fix8.length; i++) {
    var c = fix8.charCodeAt(i);
    if (c === 40) p8++;
    else if (c === 41) p8--;
}
console.log('\nFix 8 (remove 32548 only): balance =', p8);
try { acorn.parse(fix8, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Let me try the MOST aggressive approach: remove BOTH orphaned ) and the ;
var fix9 = str.slice(0, 32548) + str.slice(32550, 32572) + str.slice(32573);
console.log('\nFix 9: remove 32548 and ;, balance before check');
try { acorn.parse(fix9, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// Try: remove only the orphaned ) at 32572
var fix10 = str.slice(0, 32572) + str.slice(32573);
console.log('\nFix 10: remove 32572 only');
try { acorn.parse(fix10, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos, ':', e.message); }

// OK let me just test all my fixes
var allFixes = [
    {name: 'Fix 1 (32548)', data: fix1, p: p1},
    {name: 'Fix 2 (32572)', data: fix2, p: p2},
    {name: 'Fix 3 (both)', data: fix3, p: p3},
    {name: 'Fix 4 (32548+;)', data: fix4, p: p4},
    {name: 'Fix 5 (32548+;+32572)', data: fix5, p: p5},
    {name: 'Fix 6 (32572)', data: fix6, p: p6},
    {name: 'Fix 7 (32572+}')', data: fix7, p: p7},
    {name: 'Fix 8 (32548)', data: fix8, p: p8},
    {name: 'Fix 9 (32548+;)', data: fix9, p: p9},
    {name: 'Fix 10 (32572)', data: fix10, p: p10},
];

for (var t = 0; t < allFixes.length; t++) {
    try {
        acorn.parse(allFixes[t].data, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('\n*** WORKING:', allFixes[t].name, '***');
        
        // Save
        var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
        fs.writeFileSync(target, allFixes[t].data);
        fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', allFixes[t].data);
        fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', allFixes[t].data);
        console.log('SAVED! Size:', allFixes[t].data.length);
        
        // Verify
        var v = fs.readFileSync(target);
        var vstr = v.toString('utf8');
        try {
            acorn.parse(vstr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            console.log('VERIFIED!');
        } catch(e3) {
            console.log('Verify FAILED:', e3.pos);
        }
        break;
    } catch(e2) {}
}

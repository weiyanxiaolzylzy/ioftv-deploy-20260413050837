var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

console.log('Original size:', str.length, 'chars');
console.log('Ends:', JSON.stringify(str.slice(-30)));

// Orphaned ) at 32548 and 32572

// Fix 1: remove ) at 32548 only
var fix1 = str.slice(0, 32548) + str.slice(32549);
try { acorn.parse(fix1, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix 1 (32548): SUCCESS!'); }
catch(e) { console.log('Fix 1 (32548): FAILED at', e.pos); }

// Fix 2: remove ) at 32572 only
var fix2 = str.slice(0, 32572) + str.slice(32573);
try { acorn.parse(fix2, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix 2 (32572): SUCCESS!'); }
catch(e) { console.log('Fix 2 (32572): FAILED at', e.pos); }

// Fix 3: remove both orphaned )
var fix3 = str.slice(0, 32548) + str.slice(32549, 32572) + str.slice(32573);
try { acorn.parse(fix3, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix 3 (both): SUCCESS!'); }
catch(e) { console.log('Fix 3 (both): FAILED at', e.pos); }

// Fix 4: remove ) at 32548 and also remove the ; that was at 32549
var fix4 = str.slice(0, 32548) + str.slice(32550, 32572) + str.slice(32573);
try { acorn.parse(fix4, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix 4 (32548+;): SUCCESS!'); }
catch(e) { console.log('Fix 4 (32548+;): FAILED at', e.pos); }

// Fix 5: remove ) at 32548, keep ;, remove ) at 32572
var fix5 = str.slice(0, 32548) + str.slice(32549, 32572) + str.slice(32573);
try { acorn.parse(fix5, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix 5 (32548+32572): SUCCESS!'); }
catch(e) { console.log('Fix 5 (32548+32572): FAILED at', e.pos); }

// Fix 6: remove ) at 32548, remove ;, remove ) at 32572
var fix6 = str.slice(0, 32548) + str.slice(32550, 32572) + str.slice(32573);
try { acorn.parse(fix6, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix 6 (all 3): SUCCESS!'); }
catch(e) { console.log('Fix 6 (all 3): FAILED at', e.pos); }

// Try all with automatic save
var allFixes = [
    {name: 'Fix 1 (32548)', data: fix1},
    {name: 'Fix 2 (32572)', data: fix2},
    {name: 'Fix 3 (both)', data: fix3},
    {name: 'Fix 4 (32548+;)', data: fix4},
    {name: 'Fix 5 (32548+32572)', data: fix5},
    {name: 'Fix 6 (all)', data: fix6},
];

for (var t = 0; t < allFixes.length; t++) {
    try {
        acorn.parse(allFixes[t].data, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('\n*** WORKING:', allFixes[t].name, '***');
        
        var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
        fs.writeFileSync(target, allFixes[t].data);
        fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', allFixes[t].data);
        fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', allFixes[t].data);
        console.log('SAVED! Size:', allFixes[t].data.length);
        
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

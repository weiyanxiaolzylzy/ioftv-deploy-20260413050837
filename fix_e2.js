var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// The 2b00 function body opens at 16342 and NEVER closes properly
// The function body should close before the webpack module export
// Current end: ...e.default=o.exports}}]);
// The 2b00 function ends with: e.default=o.exports
// Then the modules object closes with: }
// But the function body itself is MISSING its }

// Let me find where to insert the function body's closing }
// The 2b00 function contains the Vue component
// Its last statement should be: e.default=o.exports
// Then a closing } for the function body
// Then the modules object closes

// The webpack modules object format is:
// { "2b00": function(t,e,s){...} }
// After the function body, there should be:
// - } to close the function body  <-- MISSING
// - } to close the modules object
// - ] to close the array
// - ) to close push()
// - ; end

// Current ending: ...e.default=o.exports}}]);
// Should be:     ...e.default=o.exports}}}]);

// So we need to INSERT } before the modules object's closing }
// The modules object's } is at position 32569
// But that position also serves as the 2b00 function body's closing }

// Let me check: what if there's an EXTRA } in the file?
// And the function body DOES close, but at the WRONG position?

// Looking at the ending more carefully:
// ...null);e.default=o.exports}}]);
// =o.exports}  -- e.default=o.exports and }
// }   -- another }
// ]   -- array
// )   -- push
// ;   -- end

// What if: the first } is for the function body, and the second } is for the modules object?
// That would be CORRECT if the function body properly closed

// But the depth trace shows the function body depth goes to 0 at 32569
// And then there's a NEGATIVE depth at 32570
// This means there's an EXTRA closing }

// So: remove the } at 32570 (the modules object close) and add it back AFTER the function closes

// Actually, let me try: remove the orphaned ) at 32572, remove the extra } at 32570
// And the file should end with: ...e.default=o.exports}]);
var fixA = str.slice(0, 32570) + str.slice(32571); // remove } at 32570
fixA = fixA.slice(0, fixA.length - 1); // remove orphaned ) at end
var pA = 0;
for (var i = 0; i < fixA.length; i++) {
    var c = fixA.charCodeAt(i);
    if (c === 40) pA++;
    else if (c === 41) pA--;
}
console.log('Fix A (remove 32570, remove end )): p=' + pA);
try { acorn.parse(fixA, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix A: SUCCESS!'); }
catch(e) { console.log('Fix A: FAILED at', e.pos); }

// Fix B: remove 32570, keep end )
var fixB = str.slice(0, 32570) + str.slice(32571);
var pB = 0;
for (var i = 0; i < fixB.length; i++) {
    var c = fixB.charCodeAt(i);
    if (c === 40) pB++;
    else if (c === 41) pB--;
}
console.log('\nFix B (remove 32570, keep end )): p=' + pB);
try { acorn.parse(fixB, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix B: SUCCESS!'); }
catch(e) { console.log('Fix B: FAILED at', e.pos); }

// Fix C: remove orphaned ) at 32572, remove extra } at 32570, keep rest
var fixC = str.slice(0, 32570) + str.slice(32571);
var pC = 0;
for (var i = 0; i < fixC.length; i++) {
    var c = fixC.charCodeAt(i);
    if (c === 40) pC++;
    else if (c === 41) pC--;
}
console.log('\nFix C (remove 32570, keep end )): p=' + pC);
try { acorn.parse(fixC, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix C: SUCCESS!'); }
catch(e) { console.log('Fix C: FAILED at', e.pos); }

// Fix D: remove 32572 (orphaned ), keep 32570 (extra })
var fixD = str.slice(0, 32572) + str.slice(32573);
var pD = 0;
for (var i = 0; i < fixD.length; i++) {
    var c = fixD.charCodeAt(i);
    if (c === 40) pD++;
    else if (c === 41) pD--;
}
console.log('\nFix D (remove 32572 only): p=' + pD);
try { acorn.parse(fixD, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix D: SUCCESS!'); }
catch(e) { console.log('Fix D: FAILED at', e.pos); }

// Let me check: what if the EXTRA } is at position 32570?
// And we need to REMOVE it?
// And also remove the orphaned ) at 32572?
var fixE = str.slice(0, 32570) + str.slice(32571, 32572) + str.slice(32573);
var pE = 0;
for (var i = 0; i < fixE.length; i++) {
    var c = fixE.charCodeAt(i);
    if (c === 40) pE++;
    else if (c === 41) pE--;
}
console.log('\nFix E (remove 32570, keep 32572): p=' + pE);
try { acorn.parse(fixE, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Fix E: SUCCESS!'); }
catch(e) { console.log('Fix E: FAILED at', e.pos); }

// Try ALL possible combinations
var tests = [
    {name: 'A', data: fixA},
    {name: 'B', data: fixB},
    {name: 'C', data: fixC},
    {name: 'D', data: fixD},
    {name: 'E', data: fixE},
];

for (var t = 0; t < tests.length; t++) {
    try {
        acorn.parse(tests[t].data, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('\n*** WORKING:', tests[t].name, '***');
        console.log('Size:', tests[t].data.length);
        console.log('Ends:', JSON.stringify(tests[t].data.slice(-20)));
        
        // Save
        var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
        fs.writeFileSync(target, tests[t].data);
        fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', tests[t].data);
        fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', tests[t].data);
        console.log('SAVED!');
        
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

var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

console.log('Original size:', str.length);

// Strategy: The depth trace shows 2b00 function body NEVER closes (depth=-1 at end)
// And there are 2 orphaned ) at positions 32548 and 32572
// This means: the function body is missing its closing }
// And there are 2 extra ) in the file

// Current ending structure:
// ...null);e.default=o.exports}}]);
// The null); is wrong - it should just be null followed by the function closing
// And e.default=o.exports} is the export statement

// Let me try: remove the orphaned ) at 32548
// The position 32548 is inside: null),"4efd1a67",null)
// The null) is trying to call something as a function
// Maybe it's part of a webpack hot module replacement or something

// Actually, let me look at what SHOULD be at the end
// Working chunks end with: ...exports}}]);
// This is: } closes function, } closes modules, ] closes array, ) closes push

// Current ends with: ...=o.exports}}]);
// =o.exports}  -- the export
// }  -- closes what? function or modules?
// }  -- closes what?
// ] -- closes array
// ) -- closes push

// What if the function body ends with: exports}
// And then there's ANOTHER } for the modules object
// So: exports}} is correct (1 for function, 1 for modules)
// And then: ]) closes array and push

// But we have p=-2, meaning 2 extra )
// Let me check: what's at position 32548?
// null) -- the null is being called as a function
// But null); means null) followed by ;

// What if the null) is part of the ORIGINAL webpack chunk format?
// In webpack 4 with HMR, modules might use: exports.default
// And the chunk might have: null); to reset something

// Actually, let me try: what if the orphaned ) at 32572 is for the .push()?
// And we need to ADD one more ) at the end?
// But that would make p=-1

// Let me try: what if we add a } at the end to close the function body?
var withClose = str + '}';
console.log('\n=== Add } at end ===');
try { acorn.parse(withClose, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('Add }: SUCCESS!'); }
catch(e) { console.log('Add }: FAILED at', e.pos); }

// And also try: add } at end AND remove orphaned ) at 32548
var withCloseAndFix = str.slice(0, 32548) + str.slice(32549) + '}';
console.log('\n=== Remove 32548, add } at end ===');
try { acorn.parse(withCloseAndFix, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos); }

// Let me also try: add } at end AND remove orphaned ) at 32572
var withCloseAndFix2 = str.slice(0, 32572) + str.slice(32573) + '}';
console.log('\n=== Remove 32572, add } at end ===');
try { acorn.parse(withCloseAndFix2, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos); }

// Let me try: add } at end AND remove BOTH orphaned )
var withCloseAndFixBoth = str.slice(0, 32548) + str.slice(32549, 32572) + str.slice(32573) + '}';
console.log('\n=== Remove both, add } at end ===');
try { acorn.parse(withCloseAndFixBoth, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos); }

// Let me try: what if the 2 orphaned ) are BOTH at the END?
// And we just need to remove them AND add }?
var removeBothOrphaned = str.slice(0, 32548) + str.slice(32549, 32572) + str.slice(32573);
console.log('\n=== Remove both orphaned ) ===');
console.log('Size:', removeBothOrphaned.length, 'vs original:', str.length);
try { acorn.parse(removeBothOrphaned, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos); }

// Let me try: the function body ends with depth=-1
// So we need to ADD a } somewhere to close it
// And we need to handle the 2 orphaned )

// What if the fix is: the function body should have been:
// ...return e.default=o.exports}
// But it's missing the RETURN statement
// And the null) before that is the issue

// Let me try: replace null) with just null (remove the ))
var noNullCall = str.replace('null);e.default=o.exports', 'null;e.default=o.exports');
console.log('\n=== Remove null) ===');
try { acorn.parse(noNullCall, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos); }

// Let me try: replace null) with something else entirely
// What if null) should have been just the null value with a comma?
// null, -- then the next statement starts
var nullComma = str.replace('null);e.default=o.exports', 'null,e.default=o.exports');
console.log('\n=== null) -> null, ===');
try { acorn.parse(nullComma, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos); }

// Let me try: what if the whole ending is supposed to be:
// return e.default=o.exports
// }
var withReturn2 = str.replace('e.default=o.exports', 'return e.default=o.exports');
console.log('\n=== Add return ===');
try { acorn.parse(withReturn2, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true }); console.log('SUCCESS!'); }
catch(e) { console.log('FAILED at', e.pos); }

// Let me try ALL combinations
console.log('\n=== Testing all ===');
var allTests = [
    {name: 'add } at end', data: withClose},
    {name: 'remove 32548 + add }', data: withCloseAndFix},
    {name: 'remove 32572 + add }', data: withCloseAndFix2},
    {name: 'remove both + add }', data: withCloseAndFixBoth},
    {name: 'remove both orphaned', data: removeBothOrphaned},
    {name: 'null) -> null', data: noNullCall},
    {name: 'null) -> null,', data: nullComma},
    {name: 'add return', data: withReturn2},
];

for (var i = 0; i < allTests.length; i++) {
    var test = allTests[i];
    try {
        acorn.parse(test.data, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('*** WORKING:', test.name, '***');
        
        // Save
        var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
        fs.writeFileSync(target, test.data);
        fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', test.data);
        fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', test.data);
        console.log('SAVED! Size:', test.data.length);
        
        // Verify
        var v = fs.readFileSync(target);
        try {
            acorn.parse(v.toString('utf8'), { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            console.log('VERIFIED!');
        } catch(e3) {
            console.log('Verify FAILED:', e3.pos);
        }
        break;
    } catch(e2) {
        console.log(test.name + ': FAILED at', e2.pos);
    }
}

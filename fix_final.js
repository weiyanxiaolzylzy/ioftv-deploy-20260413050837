var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

// Compare working chunk endings with broken one
var secondview = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/secondview.3deb2a0f040de4b2cc6c.js').toString('utf8');
var pifc = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js').toString('utf8');

console.log('=== Ending comparison ===');
console.log('Secondview ends:', JSON.stringify(secondview.slice(-25)));
console.log('Project-ifc ends:', JSON.stringify(pifc.slice(-25)));

// The project-ifc chunk ends with:
// ...=o.exports}}]);
// Compare with working chunks:
// ...ion(t,e,s){}}]);

// Find the LAST meaningful difference between the two
// Both have } at the end (closes modules object)
// But project-ifc has: ...=o.exports}}]);
// And secondview has: ...on(t,e,s){}}]);

// The project-ifc ends with:
// null);e.default=o.exports}}]);
// So the content before }}]); is:
// null);e.default=o.exports

// Working chunks end with: ...on(){}}});
// Which is: function(){}  (the last module's function body + modules object close)

// The issue: project-ifc has TWO orphaned )
// Let me find exactly where they are

console.log('\n=== Finding orphaned parens ===');
// Find all ) that have no matching ( before them
var stack = [];
var inString = false;
var strChar = '';
var orphaned = [];

for (var i = 0; i < pifc.length; i++) {
    var c = pifc[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true; strChar = c;
        } else if (c === '(') {
            stack.push(i);
        } else if (c === ')') {
            if (stack.length > 0) {
                stack.pop();
            } else {
                orphaned.push(i);
            }
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === strChar && pifc[i-1] !== '\\') { inString = false; }
    }
}

console.log('Orphaned ) positions:', orphaned);
orphaned.forEach(function(pos) {
    console.log('  Pos', pos, ':', JSON.stringify(pifc.slice(Math.max(0, pos - 30), pos + 30)));
});

// Now: what if the orphaned ) are actually legitimate, but TWO ( were removed?
// Or what if the TWO orphaned ) are at the START of the webpack chunk format?

// Let me check: maybe the webpack chunk is MISSING the outer (function(){})() wrapper
// Standard webpack chunk format:
// (function(modules){...})([...]);
// OR sometimes just: (window.webpackJsonp=...||[]).push([...])

// The project-ifc uses the SECOND format
// (window.webpackJsonp=...||[]).push([["project-ifc"],{...}])
// At the end: }]);  which closes }] and )

// But we have 2 extra )
// What if the webpack chunk was originally:
// (window.webpackJsonp=...||[]).push([["project-ifc"],{...}]);
//                                                                 ^^ -- extra

// Or what if it was:
// (function(){window.webpackJsonp=...||[];})();
// (window.webpackJsonp.push)([["project-ifc"],{...}]);
//                                                                 ^^ -- extra

// Let me check: what if I wrap the chunk in a module?
console.log('\n=== Try module wrapper ===');
var wrapped = '!function(exports){' + pifc + '}({});';
try {
    acorn.parse(wrapped, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Module wrapper: SUCCESS!');
} catch(e) {
    console.log('Module wrapper: FAILED at', e.pos - pifc.length - 22, ':', e.message);
}

// Try: what if we need to REMOVE the outer () grouping?
// The chunk starts with: (window.webpackJsonp=...||[]).push(...)
// What if the ( at position 0 is a grouping operator that shouldn't be there?
// And the ) at position 40 is the closing?
// Then .push starts at 45

// Let me check: what if we remove the outer ( and )?
// Original: (window.webpackJsonp=...||[]).push(...)
// No: this IS the correct format for the global webpackJsonp approach

// Actually, wait. Let me look at this from a different angle.
// The webpack chunk has 2 modules: "17aa" and "2b00"
// The ENDING of the webpack chunk should be:
// 1. Last module function closes with }
// 2. Modules object closes with }
// 3. Array closes with ]
// 4. push() closes with )
// 5. ; ends the statement

// For a webpack chunk with N modules:
// ...moduleN:e.exports}}]);
//                    ^^] ) ;
//                    |  |  |  |
//                    |  |  |  +-- ; end
//                    |  |  +-- ) close push
//                    |  +-- ] close array
//                    +-- } close modules object

// But we have: ...=o.exports}}]);
// Which ends with: } ] ) ;  -- that's only 1 }
// We need: } ] ) ;  where the } closes the function and } closes the modules

// So: the last MODULE function should end with:
// ...=o.exports}
// And then the modules object closes with another }

// But we have: ...=o.exports}}]);
// That's TWO }} which could be:
// - } closes function
// - } closes modules object
// - ] closes array
// - ) closes push

// And then there's ALSO the orphaned ) that causes p=-2
// This orphaned ) must come from BEFORE the end

// Let me find: what's the LAST character before the final ; that makes sense?
console.log('\n=== Final characters ===');
for (var i = pifc.length - 15; i < pifc.length; i++) {
    console.log('Pos', i, ':', JSON.stringify(pifc[i]), 'code:', pifc.charCodeAt(i));
}

// So the file ends with:
// ...exports}}]);
// Which is: o.exports}}]);
// 32568: }  (closes 2b00 function)
// 32569: }  (closes modules object)
// 32570: ]  (closes array)
// 32571: )  (closes push)
// 32572: ;  (end)

// And BEFORE that (at 32547-32548): null)
// null);  -- this returns null and closes the function

// So: null); is the return value of the 2b00 function
// And the webpack module sets e.default=o.exports

// The null); at 32547-32549:
// null) closes... something
// ; ends the statement
// Then e.default=o.exports} closes the webpack module export

// But null) has an EXTRA )
// null) -- if you call null as a function, it's null()
// But null)); -- that's null()(  -- which is trying to call the result of null()

// The fix might be: the null) should be just null)
// But wait, I already tried removing ) at 32548 and it didn't work

// Let me try: what if the ENTIRE chunk structure is wrong?
// What if the chunk is MISSING a closing } somewhere?

// Let me try to FIND where the chunk structure breaks by looking at the WHOLE end

// The working chunks end with: ...unction(t,e,s){}}]);
// The broken chunk ends with: ...=o.exports}}]);

// The difference is: working has the LAST MODULE function close properly
// broken has: e.default=o.exports}  (missing the function close?)

// Wait! Let me check: is the 2b00 function MISSING its closing }?
// The 2b00 function should end with:
// ...=o.exports}
// But we have:
// ...=o.exports}}]);
// So there's an extra }

// And the 2b00 function itself might be MISSING its opening {
// Let me check: what is the DEPTH of the 2b00 function?

console.log('\n=== 2b00 function depth ===');
var mod2b00 = pifc.indexOf('"2b00":function');
var funcStart = mod2b00 + 17;
var depth = 0;
var inStr = false;
var strChar = '';
var funcEnd = -1;
for (var i = funcStart; i < pifc.length; i++) {
    var c = pifc[i];
    if (!inStr) {
        if (c === '"' || c === "'" || c === '`') {
            inStr = true; strChar = c;
        } else if (c === '{') depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0) {
                funcEnd = i;
                break;
            }
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === strChar && pifc[i-1] !== '\\') { inStr = false; }
    }
}
console.log('2b00 function ends at:', funcEnd);
if (funcEnd >= 0) {
    console.log('Context:', JSON.stringify(pifc.slice(Math.max(0, funcEnd - 10), funcEnd + 20)));
}

// Now: if the 2b00 function ends at 32569 (which is }):
// And the modules object closes at 32569 too? No, modules object closes at 32569
// And the array closes at 32570
// And push closes at 32571

// But the 2b00 function should ALSO close at 32569
// This means: the 2b00 function's closing } and the modules object's closing }
// are the SAME }

// So: 32569: } closes both 2b00 function AND modules object?

// Let me check: what's BEFORE 32569?
console.log('\n=== Context around 32569 ===');
for (var i = 32560; i < 32574; i++) {
    console.log('Pos', i, ':', JSON.stringify(pifc[i]), 'code:', pifc.charCodeAt(i));
}

// 32568: s (of exports)
// 32569: }  (closes... what?)
// 32570: }  (closes... what?)
// 32571: ]
// 32572: )

// So: ...exports}}]);
// Which means:
// exports}  -- the last statement in the 2b00 function is e.default=o.exports}
// Then }  -- this closes the 2b00 function body AND the modules object
// Then ]  -- closes the chunk array
// Then )  -- closes push()
// Then ;  -- end

// But we're MISSING one ) to close push()
// The push() call needs: (window...||[]).push([["project-ifc"],{...}])
//                                      ^                ^
//                                      |                +-- needs )
//                                      +-- ( at position 0

// The ( at position 0 is the grouping operator, not the push()
// The push() opens at position 45
// And needs to close somewhere

// So the ) at 32572 should close push()
// But we have TWO extra ), not one

// Let me re-check: what's the ACTUAL structure?
// (window.webpackJsonp=...||[]).push([["project-ifc"],{...}])
//  Position 0: (
//  Position 40: )
//  Position 45: .push(
//  Position ...: push args
//  At end:      ...)

// The ) at position 40 closes the grouping operator
// The ) at the end closes push()

// But we have p=-2, meaning 2 more ) than (
// And the file ends with ];);

// Let me count: how many ( are in the file?
var totalOpen = 0, totalClose = 0;
for (var i = 0; i < pifc.length; i++) {
    var c = pifc.charCodeAt(i);
    if (c === 40) totalOpen++;
    else if (c === 41) totalClose++;
}
console.log('\nTotal parens: ( =', totalOpen, ') =', totalClose, 'balance =', totalClose - totalOpen);

// If we add 2 opening (, the balance would be 0
// What if the fix is to ADD TWO ( somewhere?

// But WHERE?
// What if the webpack chunk format was supposed to be:
// (function(window){window.webpackJsonp=...||[]}).push([["project-ifc"],{...}])
// Or:
// (function(){return(window.webpackJsonp=...||[])}).push([["project-ifc"],{...}])

// Actually, let me try a completely different approach:
// What if the webpack chunk needs to be WRAPPED?
// What if it was supposed to be:
// (function(modules){...})([...]);
// instead of:
// (window.webpackJsonp=...||[]).push([...])

// Let me check if the chunk uses a DIFFERENT webpack format
// by looking at how the modules are exported

// In webpack 4, modules can be exported as:
// 1. module.exports = {...}
// 2. exports.default = {...}
// 3. e.default = o.exports (the webpack hot reloading format)

// The chunk uses: e.default=o.exports
// This is the webpack module.exports format

// Let me try: what if the fix is to CHANGE the chunk format?
// From: (window.webpackJsonp=...||[]).push(...)
// To:   webpackJsonp.push(...)  (no outer ())

// But the chunk DOES have the outer () at position 0
// And it closes at position 40

// What if the issue is that the webpack chunk format for CODE-SPLIT chunks
// is different from RUNTIME chunks?

// Actually, I think the issue might be:
// The project-ifc chunk is a CODE-SPLIT chunk, not a runtime chunk
// Code-split chunks use: (window.webpackJsonp=window.webpackJsonp||[]).push(...)
// But they DON'T have the outer () at position 0

// Let me check: does the project-ifc chunk ACTUALLY start with ( ?
console.log('\n=== Chunk start ===');
console.log('First 10:', JSON.stringify(pifc.slice(0, 10)));
console.log('Position 0:', JSON.stringify(pifc[0]), 'code:', pifc.charCodeAt(0));
console.log('Position 40:', JSON.stringify(pifc[40]), 'code:', pifc.charCodeAt(40));
console.log('Position 45:', JSON.stringify(pifc.slice(42, 48)));

// The chunk starts with: (window.webpackJsonp=...||[])
// Position 0 is (
// Position 40 is )
// This is the grouping operator

// And then: .push([["project-ifc"],{...}])
// The .push( opens at position 45
// And should close somewhere

// What if the .push() WASN'T supposed to have the outer ()?
// What if it was:
// window.webpackJsonp=window.webpackJsonp||[];
// window.webpackJsonp.push([["project-ifc"],{...}]);

// In that case, position 0 wouldn't be a ( that opens a grouping
// And we'd need to count parens differently

// Let me check: what if the ( at position 0 is actually WRONG?
// What if it should be:
// window.webpackJsonp=window.webpackJsonp||[];
// window.webpackJsonp.push([["project-ifc"],{...}]);

// In that case:
// - No ( at position 0
// - .push( opens at 45
// - .push) closes somewhere
// - Total parens: 869 ( and 870 ) = -1

// Still not right

// What if the chunk is supposed to be:
// (function(window){window.webpackJsonp=...||[];return window.webpackJsonp})().push([["project-ifc"],{...}])
// No, that doesn't match either

// Let me try: what if I just REMOVE the outer ()?
// Change: (window.webpackJsonp=...||[]).push(...)
// To:     window.webpackJsonp=...||[];window.webpackJsonp.push(...)
console.log('\n=== Try: remove outer () ===');
// The outer () starts at 0 and ends at 40
// Remove position 0 and 40
var noOuter = pifc.slice(1, 40) + pifc.slice(41);
try {
    acorn.parse(noOuter, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('No outer parens: SUCCESS!');
} catch(e) {
    console.log('No outer parens: FAILED at', e.pos, ':', e.message);
}

// Try: remove outer () AND add it back differently
// What if the format is: webpackJsonp.push(...) without the assignment?
console.log('\n=== Try: webpackJsonp.push() ===');
// Find where .push( starts
var pushStart = pifc.indexOf('.push(');
console.log('push( starts at:', pushStart);
if (pushStart >= 0) {
    // Get the chunk without the assignment wrapper
    // (window.webpackJsonp=...||[]).push(...) 
    // becomes: webpackJsonp.push(...)
    var idxEquals = pifc.indexOf('=');
    var idxPush = pifc.indexOf('.push(');
    var withoutAssign = pifc.slice(0, idxEquals) + pifc.slice(idxEquals + 1, idxPush + 5) + pifc.slice(idxPush + 6);
    console.log('Without assignment, starts:', withoutAssign.slice(0, 60));
    try {
        acorn.parse(withoutAssign, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('Without assignment: SUCCESS!');
    } catch(e2) {
        console.log('Without assignment: FAILED at', e2.pos);
    }
}

// Try: what if the chunk is supposed to be an IIFE?
// !function(){...}();
console.log('\n=== Try: IIFE wrapper ===');
var iife = '!function(){' + pifc + '}()';
try {
    acorn.parse(iife, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('IIFE: SUCCESS!');
} catch(e3) {
    console.log('IIFE: FAILED at', e3.pos - pifc.length - 16, ':', e3.message);
}

// Let me try one more thing: check if the issue is the webpack CHUNK FORMAT
// Specifically, code-split chunks sometimes use a different format
// Let me check: is the project-ifc chunk using the "webpackJsonp" global or something else?

// Actually, let me try the MOST radical fix:
// Replace the broken ending with the CORRECT ending from a working chunk
console.log('\n=== Final attempt: rebuild chunk ===');
// Get the first part (up to the 2b00 module), then append a correct ending
// Find where 2b00 module starts
var idx2b00 = pifc.indexOf('"2b00":function');
console.log('2b00 module starts at:', idx2b00);

// The 2b00 module ends at 32569 (before the orphaned stuff)
// Let me find what a working chunk's ending looks like
// secondview ends with: ...ion(t,e,s){}}]);
// That's: ...exports}}]);

// Let me check: what does a working chunk's MODULE ending look like?
console.log('\n=== Working chunk module endings ===');
// Find the last module in secondview
var secondviewBuf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/secondview.3deb2a0f040de4b2cc6c.js');
var sv = secondviewBuf.toString('utf8');
console.log('secondview ends:', JSON.stringify(sv.slice(-30)));

// The working chunks end with: }]);  (1 } 1 ] 1 ))
// And the MODULE ends with: ...=o.exports}
// And then: } closes the modules object
// And ] closes the array
// And ) closes push()
// And ; ends

// Let me check: what if the project-ifc chunk is MISSING the close of the 2b00 function?
// And the orphaned ) at 32548 is supposed to close the 2b00 function?

// Let me find: what if I REMOVE the orphaned ) at 32548?
// And change the ending from }}]); to })]);
var pifcFixed = pifc.slice(0, 32548) + pifc.slice(32549, pifc.length - 1) + ')})';
console.log('\n=== Fix: remove 32548, change end to }) ===');
console.log('New ending:', JSON.stringify(pifcFixed.slice(-15)));
try {
    acorn.parse(pifcFixed, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e4) {
    console.log('FAILED at', e4.pos, ':', e4.message);
}

// And let me also try: what if the ending should be }]);
// And the orphaned ) at 32548 is the close of the 2b00 function body?
// But then we'd need TWO } at the end (one for function, one for modules)
// And we have: }}]);

// Actually, let me try: what if the 2b00 function is supposed to end with JUST }
// And the modules object closes with another }
// And then ]) closes array and push?

// Let me try: remove the orphaned ) at 32548 AND remove one } from the end
var pifcFixed2 = pifc.slice(0, 32548) + pifc.slice(32549, 32569) + pifc.slice(32570);
console.log('\n=== Fix: remove 32548, remove one } ===');
console.log('New ending:', JSON.stringify(pifcFixed2.slice(-15)));
try {
    acorn.parse(pifcFixed2, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e5) {
    console.log('FAILED at', e5.pos, ':', e5.message);
}

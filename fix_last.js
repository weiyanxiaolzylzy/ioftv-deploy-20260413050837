var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Find 2b00 function and trace its brace depth
var idx2b00 = str.indexOf('"2b00":function');
var funcStart = idx2b00 + 17; // after "2b00":function(

console.log('2b00 function starts at:', funcStart);
console.log('Starts:', JSON.stringify(str.slice(funcStart, funcStart + 50)));

// Trace brace depth within the 2b00 function
var depth = 0;
var inString = false;
var strChar = '';
var changes = [];
var maxDepth = 0;
var maxDepthPos = 0;

for (var i = funcStart; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true; strChar = c;
        } else if (c === '{') {
            depth++;
            if (depth > maxDepth) { maxDepth = depth; maxDepthPos = i; }
            if (depth === 1 || depth === maxDepth) {
                changes.push({pos: i, type: 'open', depth: depth, ctx: JSON.stringify(str.slice(Math.max(0, i-10), i+5))});
            }
        } else if (c === '}') {
            depth--;
            if (depth >= 0) {
                changes.push({pos: i, type: 'close', depth: depth, ctx: JSON.stringify(str.slice(i-5, i+15))});
            }
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === strChar && str[i-1] !== '\\') { inString = false; }
    }
}

console.log('Max brace depth in 2b00:', maxDepth, 'at pos', maxDepthPos);
console.log('Final brace depth:', depth, '(should be 0)');

console.log('\n=== Brace changes ===');
changes.forEach(function(c2) {
    console.log('Pos', c2.pos, c2.type, 'depth=' + c2.depth + ':', c2.ctx);
});

// Now check: what if the function body opens with a { that NEVER closes?
// The 2b00 function signature is: "2b00":function(t,e,s){"use strict";...
// So after (t,e,s), there's a "use strict" string, then the body opens with {

// Find where the function body opens
console.log('\n=== Function body opening ===');
for (var i = funcStart; i < funcStart + 30; i++) {
    console.log('Pos', i, ':', JSON.stringify(str[i]));
}

// The function body opens at funcStart + something
// Let me find it
var bodyOpen = -1;
inString = false;
strChar = '';
for (var i = funcStart; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true; strChar = c;
        } else if (c === '{') {
            bodyOpen = i;
            break;
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === strChar && str[i-1] !== '\\') { inString = false; }
    }
}

console.log('\nFunction body opens at:', bodyOpen);
if (bodyOpen >= 0) {
    console.log('Context:', JSON.stringify(str.slice(bodyOpen - 5, bodyOpen + 20)));
}

// Now trace depth from bodyOpen
var bodyDepth = 0;
var bodyInString = false;
var bodyStrChar = '';
for (var i = bodyOpen; i < str.length; i++) {
    var c = str[i];
    if (!bodyInString) {
        if (c === '"' || c === "'" || c === '`') {
            bodyInString = true; bodyStrChar = c;
        } else if (c === '{') {
            bodyDepth++;
        } else if (c === '}') {
            bodyDepth--;
            if (bodyDepth === 0) {
                console.log('Function body closes at:', i);
                console.log('Context:', JSON.stringify(str.slice(Math.max(0, i-10), i+20)));
                break;
            }
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === bodyStrChar && str[i-1] !== '\\') { bodyInString = false; }
    }
}

if (bodyDepth > 0) {
    console.log('Function body NEVER closes! Final depth:', bodyDepth);
}

// The key: if body NEVER closes, then we need to find where to ADD the closing }
// Let me find the END of the file and determine what should come after
console.log('\n=== What SHOULD be at the end ===');
// The end of the 2b00 function should be:
// 1. Last statement
// 2. }
// Then: } closes the webpack modules object
// Then: ] closes the chunk array  
// Then: ) closes .push()
// Then: ; end

// Current end: ...=o.exports}}]);
// =o.exports}  -- this is the export statement
// }  -- this SHOULD close the function, but maybe it's for the modules object?
// }  -- this closes the modules object?
// ]  -- closes chunk array
// )  -- closes .push()
// ;  -- end

// But we have TWO }, which means one is extra
// And we have p=-2, which means TWO extra )

// What if the function body ends with: e.default=o.exports}
// But we DON'T have another } after that?
// And the } at the end is for the modules object?

// Let me try: what if I add } before the end to close the function?
var withExtraClose = str.slice(0, str.length - 1) + '}'; // add } at end
console.log('\n=== Try: add } at end ===');
try {
    acorn.parse(withExtraClose, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e) {
    console.log('FAILED at', e.pos);
}

// Let me also check: what if the ending should be different?
// Maybe the webpack modules object closes, then there's more?
// What about: }]); // close modules, close array, close push
// But we also need: } to close the function

// So: ...=o.exports}}}]);  -- extra }
// Or: ...=o.exports}];  -- missing one }

// Let me try: ...=o.exports}];  (remove one })
var removeOneClose = str.slice(0, str.length - 2) + ']';
console.log('\n=== Try: ...=o.exports}] ===');
try {
    acorn.parse(removeOneClose, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e2) {
    console.log('FAILED at', e2.pos);
}

// Try: ...=o.exports}];  -- but we need the ) for push
// So: ...=o.exports}]);  
// Wait, that's what we have

// Let me try: ...=o.exports}]);
// And remove one orphaned )
var removeOrphaned = str.slice(0, str.length - 1);
console.log('\n=== Try: remove trailing ; ===');
try {
    acorn.parse(removeOrphaned, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e3) {
    console.log('FAILED at', e3.pos);
}

// The REAL fix might be: the function body is MISSING its closing }
// And the orphaned ) at 32548 and 32572 are from before
// Let me try: add } at end, remove one )
var fixedEnding = str.slice(0, str.length - 2) + ')';
console.log('\n=== Try: change ending ===');
console.log('New ending:', JSON.stringify(fixedEnding.slice(-15)));
try {
    acorn.parse(fixedEnding, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e4) {
    console.log('FAILED at', e4.pos);
}

// Let me try: add } at end, remove both orphaned )
var fixAll = str.slice(0, str.length - 1);
fixAll = fixAll.slice(0, fixAll.length - 1) + '}';
console.log('\n=== Try: add }, remove trailing ; ===');
try {
    acorn.parse(fixAll, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e5) {
    console.log('FAILED at', e5.pos);
}

// Let me try: the REAL issue might be that the 2b00 function body never closes
// And the } at 32569 is for the modules object, NOT the function
// Let me check: what if the function body SHOULD close before 32569?
// Find where the Vue component object ends
console.log('\n=== Finding Vue component object ending ===');
// In the 2b00 function, there's a Vue component with a render function
// The render function returns e("div",{...})
// After the render function, there should be a closing } for the component object
// And then a closing } for the function body

// Let me find: where does the 2b00 function's render function end?
var renderStart = str.indexOf('render:function', funcStart);
console.log('Render function starts at:', renderStart);

// Find the return statement in render
var returnStart = str.indexOf('return', renderStart);
console.log('Return starts at:', returnStart);

// Find the end of the render function's return
// The render returns: e("div",{...})
// After that, the component object should close
// Then the function body closes

// Let me check: what is at the position AFTER the 2b00 function should end?
// The 2b00 module should be followed by... nothing in the modules object
// And the modules object should close with }

console.log('\n=== Checking: what is at 32569 ===');
console.log('Char:', JSON.stringify(str[32569]), 'code:', str.charCodeAt(32569));
console.log('Context:', JSON.stringify(str.slice(32560, 32574)));

// 32569 is }, which should close the webpack modules object
// But where does the 2b00 function body close?

// If the function body closes at 32568 (the s before }):
// ...exports}
// Then } at 32569 closes the modules object
// But that means the function body is MISSING its }

// Let me check: is 32568 part of the function or the modules object?
// The modules object is: { "2b00": function(...) { ... } }
// The 2b00 function body ends with a }
// And then the modules object closes with another }

// So: ...exports}}  means:
// ...exports}  -- end of 2b00 function
// }  -- end of modules object

// But we have: ...exports}}]);
// =o.exports}}]);

// So the 2b00 function ends with: =o.exports}
// And the modules object ends with: }
// And ] closes the chunk array
// And ) closes .push()

// This IS correct! So where are the 2 extra ) coming from?

// Let me re-check: what if the 2b00 function body is SUPPOSED to end
// with something like: return e.default=o.exports}
// But instead it has: e.default=o.exports}
// And then the function body closes with }

// Let me look at the actual LAST statement in the 2b00 function
// by finding what comes BEFORE the closing }

// At 32568: s (from exports)
// 32569: } -- closes function
// 32570: } -- closes modules object
// 32571: ] -- closes array
// 32572: ) -- closes push
// 32573: ; -- end

// But the 2b00 function body should close with }
// And the 2b00 function is inside the modules object {}

// So: the 2b00 function should have:
// ... exports value
// }
// And then the modules object closes with:
// }

// So we DO need TWO } at the end:
// One for the function, one for the modules object

// And we have: exports}}
// Which is: exports} (for function) and } (for modules)

// And then: ]) closes array and push

// So the ending should be: exports}}]);
// And the orphaned parens must be from somewhere ELSE

// Let me re-check: where do the orphaned parens come from?
// We have p=-2
// The file has 2 more ) than (

// Let me count from position 32570 backwards
console.log('\n=== Count parens from end ===');
var count = 0;
for (var i = str.length - 1; i >= 0; i--) {
    if (str[i] === ')') count++;
    if (str[i] === '(') count--;
    if (count === 0 && i < str.length - 10) {
        console.log('Balance reaches 0 at position', i);
        console.log('Context:', JSON.stringify(str.slice(Math.max(0, i-10), i+5)));
        break;
    }
}

// I think the fix might be simpler than I thought
// Let me just try: what if I replace the WHOLE ending?
// The chunk should end with: ...exports}]);
// But we have: ...exports}}]);

// Wait, we DO need two } for: function body + modules object
// So exports}} is correct

// But the orphaned parens are from the MIDDLE of the file
// NOT from the ending

// Let me find: where do the 2 extra ) appear in the middle?
// The depth trace showed negative depth starting at 16263
// At 16263, we have: ])]
// This is the end of a Vue render function

// Let me look at what comes BEFORE 16263
console.log('\n=== Context before 16263 ===');
for (var i = 16230; i < 16273; i++) {
    var c = str.charCodeAt(i);
    if (c === 40 || c === 41 || c === 91 || c === 93 || c === 123 || c === 125 || c === 44) {
        console.log('Pos', i, ':', JSON.stringify(str[i]), '(code:', c + ')');
    }
}

// OK, I think the fundamental issue is that TWO ( were removed from the file
// The file has 870 ) and 868 (
// And the orphaned ) at 32548 and 32572 confirm this

// The ONLY way to fix this is to add TWO opening (
// Where should they go?

// Let me think about webpack chunk format again:
// (window.webpackJsonp=window.webpackJsonp||[]).push([["project-ifc"],{...}])
//
// If we add TWO ( at the beginning:
// ((window.webpackJsonp=window.webpackJsonp||[]).push([["project-ifc"],{...}])
// Then we'd need TWO ) at the end to balance
//
// But we already have one ) at the end (for push)
// And we need one more

// What if we add ( at the START of the modules object?
// Or at the START of the 2b00 function?

// Actually, let me try: what if the chunk is supposed to use
// a DIFFERENT webpack format where the modules are wrapped?

// Let me try: add ( before the modules object
var idxModules = str.indexOf('.push([["project-ifc"],{');
console.log('\nModules start at:', idxModules);

// Try: add ( before the modules
// From: (window...||[]).push([["project-ifc"],[
var addParen = '(' + str;
console.log('\n=== Try: add ( at start ===');
try {
    acorn.parse(addParen, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e6) {
    console.log('FAILED at', e6.pos);
}

// Try: add () at start
var addParen2 = '()' + str;
console.log('\n=== Try: add () at start ===');
try {
    acorn.parse(addParen2, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e7) {
    console.log('FAILED at', e7.pos);
}

// Let me try a completely different fix: what if the webpack format is wrong?
// What if it's supposed to be webpackJsonp.push(...) without the ()?
// And the outer () at position 0 is supposed to be a DIFFERENT structure?

// Let me check: what if the chunk uses a different webpack API?
// The webpackJsonp API has two forms:
// 1. Global: webpackJsonp.push(...) -- no return value needed
// 2. With callback: webpackJsonp([...], callback) -- callback receives modules

// Let me try: what if the chunk was supposed to use form 2?
// window.webpackJsonp([["project-ifc"],{...}])
// (window.webpackJsonp||[]).push([["project-ifc"],{...}])
// These are similar but different

// Actually, I think the issue might be that the webpack chunk was BUILT for a DIFFERENT
// webpack configuration. The 2b00 module might be using a different export format.

// Let me try: what if the 2b00 function should have a RETURN statement?
// Instead of: e.default=o.exports
// It should be: return e.default=o.exports
var withReturn = str.replace('e.default=o.exports}', 'return e.default=o.exports}');
console.log('\n=== Try: add return ===');
try {
    acorn.parse(withReturn, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e8) {
    console.log('FAILED at', e8.pos);
}

// Let me try: add return AND add closing }
var withReturnAndClose = str.replace('e.default=o.exports}', 'return e.default=o.exports}}');
console.log('\n=== Try: add return + extra } ===');
try {
    acorn.parse(withReturnAndClose, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e9) {
    console.log('FAILED at', e9.pos);
}

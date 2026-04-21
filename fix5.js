var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Let me find the REAL issue by looking at the depth changes more carefully
// The depth trace shows that the depth goes negative starting at 16125
// Let me look at what happens at that position

console.log('=== Looking at position 16125 ===');
for (var i = 16100; i < 16140; i++) {
    console.log('pos', i, ':', JSON.stringify(str[i]), 'code:', str.charCodeAt(i));
}

// This is inside the Chinese string "请返回大屏，在「管理项目」中为该项目上传或指定 IFC 后，再从该项目的「项目构件管理」进入。"
// Let me check: what is the DEPTH of this string in the Vue render function?

// The structure is:
// e("p",{staticClass:"hint"},[t._v("请返回大屏，在「管理项目」中为该项目上传或指定 IFC 后，再从该项目的「项目构件管理」进入。")])]
// So the t._v() call is inside [ ... ]

// But wait: what if the TERNARY OPERATOR causes depth tracking issues?
// The Vue component has: condition ? true : false
// Inside the true branch, there's the "请返回大屏" text
// Inside the false branch, there's the "未指定项目" and "请在大屏" text

// Let me check the structure around position 16125
console.log('\n=== Context around 16125 ===');
for (var i = 16090; i < 16130; i++) {
    var c = str.charCodeAt(i);
    var marker = '';
    if (c === 40 || c === 41 || c === 91 || c === 93 || c === 123 || c === 125) {
        marker = ' <-- ' + (c === 40 ? '(' : c === 41 ? ')' : c === 91 ? '[' : c === 93 ? ']' : c === 123 ? '{' : '}');
    }
    console.log('pos', i, ':', JSON.stringify(str[i]), 'code:', c + marker);
}

// Now let me try a completely different approach:
// Let me check: is the PROBLEM actually a MISSING opening paren somewhere?
// Because if there's a missing (, then every ) after would be orphaned

// Let me find ALL paren opens and closes, and look for patterns
console.log('\n=== Finding paren pattern ===');
var parenStack = [];
var inString = false;
var strChar = '';

for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true; strChar = c;
        } else if (c === '(') {
            parenStack.push({pos: i, type: 'open'});
        } else if (c === ')') {
            if (parenStack.length > 0 && parenStack[parenStack.length-1].type === 'open') {
                parenStack.pop();
            } else {
                parenStack.push({pos: i, type: 'orphan-close'});
            }
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === strChar && str[i-1] !== '\\') { inString = false; }
    }
}

console.log('Total unmatched opens:', parenStack.length);
console.log('First 10 unmatched:');
for (var i = 0; i < Math.min(10, parenStack.length); i++) {
    var item = parenStack[i];
    console.log('  pos', item.pos, ':', item.type, '-', JSON.stringify(str.slice(Math.max(0, item.pos - 20), item.pos + 20)));
}

// Now find: what are the LAST unmatched parens?
console.log('\nLast 10 unmatched:');
for (var i = Math.max(0, parenStack.length - 10); i < parenStack.length; i++) {
    var item = parenStack[i];
    console.log('  pos', item.pos, ':', item.type, '-', JSON.stringify(str.slice(Math.max(0, item.pos - 20), item.pos + 20)));
}

// Now I know: where are the orphaned closes?
// Let me find what opens the LAST orphaned close
// If the orphaned close is at 32548, what's the matching open?

// Actually, the problem is: the orphaned close at 32548 SHOULD have a matching open
// But the matching open is MISSING
// So I need to ADD an opening ( somewhere

// Let me find where the orphaned ) at 32548 should connect to
// by finding the deepest unmatched open BEFORE 32548
var opensBefore = parenStack.filter(function(item) {
    return item.type === 'open' && item.pos < 32548;
});
console.log('\nDeepest unmatched opens before 32548:');
// Find the ones with the highest position (most recent)
opensBefore.sort(function(a, b) { return b.pos - a.pos; });
for (var i = 0; i < Math.min(5, opensBefore.length); i++) {
    var item = opensBefore[i];
    console.log('  pos', item.pos, '-', JSON.stringify(str.slice(Math.max(0, item.pos - 30), item.pos + 30)));
}

// Actually, I realize I need to find: where does the orphaned close at 32548 belong?
// The orphaned close means there was an open that was never closed
// Let me find ALL opens that are still unmatched (they never got a close)
var allUnmatched = parenStack.filter(function(item) { return item.type === 'open'; });
console.log('\nAll unmatched opens:');
console.log('Count:', allUnmatched.length);
if (allUnmatched.length > 0) {
    console.log('First 5:');
    for (var i = 0; i < Math.min(5, allUnmatched.length); i++) {
        console.log('  pos', allUnmatched[i].pos, '-', JSON.stringify(str.slice(Math.max(0, allUnmatched[i].pos - 30), allUnmatched[i].pos + 30)));
    }
    console.log('Last 5:');
    for (var i = Math.max(0, allUnmatched.length - 5); i < allUnmatched.length; i++) {
        console.log('  pos', allUnmatched[i].pos, '-', JSON.stringify(str.slice(Math.max(0, allUnmatched[i].pos - 30), allUnmatched[i].pos + 30)));
    }
}

// So the fix is: add 2 opening ( at the appropriate places
// Or: find where the 2 missing ( should go

// But wait - the orphan stack doesn't have any unmatched opens!
// That means ALL parens are matched except for the orphaned closes
// So there are 3 orphaned ) but only 2 paren imbalance (870-868)
// Wait, let me re-count

// Actually, my parenStack approach above doesn't work for webpack chunks
// because the parenStack ignores string literals
// But the orphaned ) at 32548 might be INSIDE a string literal!

// Let me check: is position 32548 inside a string?
var inString2 = false;
var strChar2 = '';
for (var i = 0; i < 32548; i++) {
    var c = str[i];
    if (!inString2) {
        if (c === '"' || c === "'" || c === '`') {
            inString2 = true; strChar2 = c;
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === strChar2 && str[i-1] !== '\\') { inString2 = false; }
    }
}
console.log('\nAt position 32548, inside string?:', inString2);

// So the orphaned ) at 32548 is NOT inside a string
// And all parens before 32548 are matched (according to my algorithm)
// But the file still has 2 extra ) at the end

// Let me re-count parens properly
var totalP = 0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) totalP++;
    else if (c === 41) totalP--;
}
console.log('Total paren balance:', totalP);

// Now let me check: what if the issue is that the webpack chunk has a DIFFERENT structure
// than I think? Let me check the ACTUAL format by looking at how the chunk STARTS

// The webpack 4 chunk format when loaded by webpack is:
// (function(modules) { ... })({...})
// OR it could be: (window.webpackJsonp=...||[]).push(...)
// OR it could be: webpackJsonp(...)

// Let me check what format the working chunk uses
console.log('\n=== Chunk format analysis ===');
console.log('Working chunk first 100:', workingStr.slice(0, 100));
console.log('Working chunk ends:', JSON.stringify(workingStr.slice(-20)));

// Check how many { and } the working chunk has
var wB=0, wB2=0;
for (var i = 0; i < workingStr.length; i++) {
    var c = workingStr.charCodeAt(i);
    if (c === 123) wB++;
    else if (c === 125) wB2++;
}
console.log('Working chunk {}:', wB, wB2, 'balance:', wB - wB2);

var pB=0, pB2=0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) pB++;
    else if (c === 41) pB2++;
}
console.log('Project-ifc chunk {}:', pB, pB2, 'balance:', pB - pB2);

// Let me now try to find: what is the webpack chunk MISSING?
// by comparing the structure with the working chunk
console.log('\n=== Comparing endings ===');
console.log('Working ends:', JSON.stringify(workingStr.slice(-30)));
console.log('Project-ifc ends:', JSON.stringify(str.slice(-30)));

// The working chunk ends with: ...function(t,e,s){}}]);
// This is: } closes function body, } closes modules object, ] closes array, ) closes push, ; end

// The project-ifc chunk ends with: ...ult=o.exports}}]);
// This is: } closes something, } closes something, ] closes array, ) closes push, ; end

// Wait, the project-ifc ends with:
// ...=o.exports}}]);
// 32568: }  (closes 2b00 function)
// 32569: }  (closes modules object)
// 32570: ]  (closes array)
// 32571: )  (closes push)
// 32572: ;  (end)

// But there's ALSO: 
// null); at 32545-32548
// This null) closes... what?

// And: 32524-32527: "4efd1a67",null)
// And: 32514-32522: ])})

console.log('\n=== Deep ending structure ===');
for (var i = 32500; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40 || c === 41 || c === 91 || c === 93 || c === 123 || c === 125 || c === 44) {
        var type = c === 40 ? '(' : c === 41 ? ')' : c === 91 ? '[' : c === 93 ? ']' : c === 123 ? '{' : c === 125 ? '}' : ',';
        console.log('pos', i, ':', type, JSON.stringify(str.slice(i, i+1)));
    }
}

// Now let me try: what if I add 2 opening ( at the START of the file?
// That would balance the 2 extra )
// But this would change the semantics...

// Actually, let me try: what if I check if the original git file was CORRUPTED
// during the copy operation? Let me re-fetch from git

// Wait, let me try yet another approach: find the ACTUAL depth at position 16274
// using a DIFFERENT method

// Let me use acorn's tokenizer to understand what acorn sees
console.log('\n=== Using acorn tokenizer ===');
try {
    var Parser = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js').Parser;
    if (Parser && Parser.parse) {
        console.log('Parser available');
    }
} catch(e) {
    console.log('Parser not available:', e.message);
}

// Let me try: what if I manually add the missing context to make it parse?
// For example, wrap it in a function and see what happens

// Let me check: what if the error is that the webpack chunk is MISSING
// the `function(module, exports, require)` wrapper?

// Let me try: what if I add ( at position 0 and ) at position 32573?
// That would add 1 paren each way, but wouldn't help the -2 imbalance

// Let me try: add ( at the end too
// That would add 2 paren close and 2 paren open, still -2

// I think the REAL fix is: somewhere in the file, 2 opening ( are MISSING
// Let me find where they should be

// The error at position 16274 is: ,!1,null
// And the context is: ])}),!1,null
// Where does the ) in ])}), come from?

// Let me look at the 17aa module's END more carefully
// The 17aa module ends with: e.default=o.exports}
// And then the webpack modules object closes
// But what if the 17aa module is MISSING its closing?

// Let me check: what is the DEPTH of the 17aa function at its supposed end?
var func17aaStart = 86;
var depthAt16318 = countBracketsUpTo(str, 16318);
console.log('\n17aa function at position 16318:');
console.log('Depth:', JSON.stringify(depthAt16318));

// At 16318: p=0, b=2, br=1
// b=2 means there are 2 more { than }
// br=1 means there is 1 more [ than ]
// p=0 means parens are balanced

// This means at position 16318, the 17aa function is NOT closed!
// There are 2 unmatched { and 1 unmatched [
// These should be: the Vue component object {components:...}
// And the array [...]

// Wait, the 17aa function body starts at 91 (after the { of "use strict")
// And at 16318, b=2 means 2 more { than }
// So the function body is still open!

// But my earlier analysis found that the function body closes at 16318
// This is a CONTRADICTION

// Let me re-check: my earlier analysis used string-aware depth counting
// but the current countBracketsUpTo also uses string awareness
// Let me check: at 16318, what's the depth?

// The 17aa module is: "17aa":function(t,e,s){"use strict";...}
// The function body starts at position 91 (the { of "use strict")
// And the function should close at the matching }

// But at 16318, b=2 means the function body is NOT closed
// This is the REAL issue!

// Let me verify: find where the function body closes
var fDepth = 0;
var fInStr = false;
var fStrChar = '';
for (var i = func17aaStart; i < str.length; i++) {
    var c = str[i];
    if (!fInStr) {
        if (c === '"' || c === "'" || c === '`') {
            fInStr = true; fStrChar = c;
        } else if (c === '{') {
            fDepth++;
        } else if (c === '}') {
            fDepth--;
            if (fDepth === 0) {
                console.log('\n17aa function body closes at position', i);
                console.log('Context:', JSON.stringify(str.slice(Math.max(0, i - 30), i + 30)));
                break;
            }
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === fStrChar && str[i-1] !== '\\') { fInStr = false; }
    }
}

// And check: what is at position 16318?
console.log('\nPosition 16318:', JSON.stringify(str[16318]), 'code:', str.charCodeAt(16318));
console.log('Context:', JSON.stringify(str.slice(16310, 16330)));

// The closing } at 16318 is NOT the function body closing
// It's the closing of something INSIDE the function
// The function body is still open!

// Let me find where the function body ACTUALLY closes
fDepth = 0;
fInStr = false;
fStrChar = '';
var funcBodyClose = -1;
for (var i = func17aaStart; i < str.length; i++) {
    var c = str[i];
    if (!fInStr) {
        if (c === '"' || c === "'" || c === '`') {
            fInStr = true; fStrChar = c;
        } else if (c === '{') {
            fDepth++;
        } else if (c === '}') {
            fDepth--;
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === fStrChar && str[i-1] !== '\\') { fInStr = false; }
    }
    
    // Track: what's the depth at each position?
    if (i < func17aaStart + 100 || i > str.length - 100) {
        if (c === '{' || c === '}') {
            // console.log('  pos', i, ':', c, 'depth:', fDepth);
        }
    }
}
console.log('\nFinal depth:', fDepth);

// Let me find the ACTUAL closing brace
fDepth = 0;
fInStr = false;
fStrChar = '';
for (var i = func17aaStart; i < str.length; i++) {
    var c = str[i];
    if (!fInStr) {
        if (c === '"' || c === "'" || c === '`') {
            fInStr = true; fStrChar = c;
        } else if (c === '{') {
            fDepth++;
        } else if (c === '}') {
            fDepth--;
            if (fDepth === 0) {
                console.log('17aa function body ACTUALLY closes at:', i);
                console.log('Context:', JSON.stringify(str.slice(Math.max(0, i - 30), i + 30)));
                funcBodyClose = i;
                break;
            }
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === fStrChar && str[i-1] !== '\\') { fInStr = false; }
    }
}

if (funcBodyClose < 0) {
    console.log('17aa function body NEVER closes!');
} else {
    console.log('At', funcBodyClose, ':', JSON.stringify(str.slice(funcBodyClose, funcBodyClose + 30)));
    // Check if there's a comma after
    console.log('After:', JSON.stringify(str.slice(funcBodyClose + 1, funcBodyClose + 10)));
}

function countBracketsUpTo(s, upTo) {
    var depth = {p: 0, b: 0, br: 0};
    var inStr = false;
    var strChar = '';
    for (var i = 0; i < upTo; i++) {
        var c = s[i];
        if (!inStr) {
            if (c === '"' || c === "'" || c === '`') {
                inStr = true; strChar = c;
            } else if (c === '(') depth.p++;
            else if (c === ')') depth.p--;
            else if (c === '{') depth.b++;
            else if (c === '}') depth.b--;
            else if (c === '[') depth.br++;
            else if (c === ']') depth.br--;
        } else {
            if (c === '\\') { i++; }
            else if (c === strChar && s[i-1] !== '\\') { inStr = false; }
        }
    }
    return depth;
}

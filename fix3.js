var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Strategy: try different fixes and test with acorn
// The error is at position 16274, so fix attempts should focus on the area around it

// First, let's understand the context at position 16274 more carefully
console.log('Context around error (16200-16300):');
for (var i = 16200; i < 16300; i++) {
    var c = str.charCodeAt(i);
    var marker = (i === 16274) ? ' <-- ERROR' : '';
    if (c === 40 || c === 41 || c === 123 || c === 125 || c === 91 || c === 93 || i === 16274) {
        console.log('pos' + i + ': ' + (c === 40 ? '(' : c === 41 ? ')' : c === 123 ? '{' : c === 125 ? '}' : c === 91 ? '[' : c === 93 ? ']' : '!') + ' ' + JSON.stringify(str[i]) + marker);
    }
}

// Count brackets up to position 16274, tracking strings
function countBracketsUpTo(s, upTo) {
    var depth = {p: 0, b: 0, br: 0};
    var inString = false;
    var strChar = '';
    for (var i = 0; i < upTo; i++) {
        var c = s[i];
        var cc = s.charCodeAt(i);
        if (!inString) {
            if (c === '"' || c === "'" || c === '`') {
                inString = true; strChar = c;
            } else if (c === '(') depth.p++;
            else if (c === ')') depth.p--;
            else if (c === '{') depth.b++;
            else if (c === '}') depth.b--;
            else if (c === '[') depth.br++;
            else if (c === ']') depth.br--;
        } else {
            if (c === '\\') { i++; }
            else if (c === strChar && s[i-1] !== '\\') { inString = false; }
        }
    }
    return depth;
}

var d = countBracketsUpTo(str, 16274);
console.log('\nBracket depth at position 16274:', d);

// The error says ! is unexpected
// In acorn, "Unexpected token !" can mean:
// 1. The parser is in a state where ! is not expected
// 2. The parser has an error from a previous point

// Let me check: what if the issue is that a string is NOT properly closed?
// Look for the string that contains the Chinese text
// The Chinese text is: 请在大屏点击「管理项目」，展开某一项目后，再点该行内的「项目构件管理」
// This string is in a t._v() call

// Find ALL t._v calls
console.log('\n=== All t._v calls near position 16274 ===');
var tvCount = 0;
for (var i = str.indexOf('t._v('); i >= 0 && i < 17000; i = str.indexOf('t._v(', i + 1)) {
    tvCount++;
    var close = -1;
    var depth = 0;
    var inStr = false;
    for (var j = i + 5; j < str.length; j++) {
        if (!inStr) {
            if (str[j] === '"' || str[j] === "'" || str[j] === '`') {
                inStr = true; strChar = str[j];
            } else if (str[j] === '(') depth++;
            else if (str[j] === ')') {
                depth--;
                if (depth === -1) { close = j; break; }
            }
        } else {
            if (str[j] === strChar && str[j-1] !== '\\') inStr = false;
        }
    }
    console.log('t._v at', i, 'closes at', close, 'length:', close - i);
}

// Let me try: what if I look for TERNARY operators near position 16274?
// The pattern "?",":" or ":e(" or "condition?e("
console.log('\n=== Looking for ternary / conditional patterns ===');
for (var i = 16000; i < 16300; i++) {
    if (str[i] === '?') {
        console.log('? at', i, ':', JSON.stringify(str.slice(Math.max(0, i - 30), i + 30)));
    }
    if (str[i] === ':' && str[i+1] === 'e' && str[i+2] === '(') {
        console.log(':e( at', i, ':', JSON.stringify(str.slice(Math.max(0, i - 30), i + 30)));
    }
}

// Now let me try a radical approach:
// Find the LOCATION where the depth tracking goes wrong
// by checking depth at EVERY character position and finding anomalies

console.log('\n=== Finding depth anomaly ===');
var depths = [];
var curDepth = {p: 0, b: 0, br: 0};
var inStr = false;
var strChar = '';
for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (!inStr) {
        if (c === '"' || c === "'" || c === '`') {
            inStr = true; strChar = c;
        } else {
            if (c === '(') curDepth.p++;
            else if (c === ')') curDepth.p--;
            else if (c === '{') curDepth.b++;
            else if (c === '}') curDepth.b--;
            else if (c === '[') curDepth.br++;
            else if (c === ']') curDepth.br--;
        }
    } else {
        if (c === '\\') { i++; }
        else if (c === strChar && str[i-1] !== '\\') { inStr = false; }
    }
    
    // Record when something interesting happens
    if (i < 200 || (i >= 16000 && i <= 16500) || i === str.length - 1) {
        depths.push({pos: i, d: {p: curDepth.p, b: curDepth.b, br: curDepth.br}, ctx: JSON.stringify(str.slice(Math.max(0,i-5), i+1))});
    }
}

// Check around position 16274
console.log('Depths around 16274:');
for (var i = 0; i < depths.length; i++) {
    if (depths[i].pos >= 16260 && depths[i].pos <= 16300) {
        console.log('pos', depths[i].pos, ':', JSON.stringify(depths[i].ctx), '-> p:' + depths[i].d.p + ' b:' + depths[i].d.b + ' br:' + depths[i].d.br);
    }
}

// Let me try another approach: check the "17aa" module carefully
// The "17aa" module ends at position 16318
// Maybe the closing of "17aa" is wrong

console.log('\n=== Checking 17aa module closing ===');
// 17aa starts at 69, ends at 16318
var mod17aaStart = str.indexOf('"17aa":function');
var mod17aaEnd = 16318;
console.log('17aa at', mod17aaStart, 'ends at', mod17aaEnd);
console.log('Before "2b00":', JSON.stringify(str.slice(Math.max(0, mod17aaEnd - 20), mod17aaEnd + 20)));

// And 2b00 starts at 16320
var mod2b00Start = str.indexOf('"2b00":function');
console.log('2b00 at', mod2b00Start);

// The gap is 16318 to 16320 = 2 chars
// Those 2 chars should be ,} or }, or something like that
console.log('Gap chars:', JSON.stringify(str.slice(mod17aaEnd, mod2b00Start)));

// Let me check: is the "17aa" module missing its closing?
// In a webpack chunk, the format is:
// "moduleId":function(t,e,s){"use strict";...},"nextModuleId":
// The comma separates modules
// So after "17aa" function body, there should be , or }

// At position 16318, what's there?
console.log('Char at 16318:', JSON.stringify(str[16318]), 'code:', str.charCodeAt(16318));
console.log('Char at 16319:', JSON.stringify(str[16319]), 'code:', str.charCodeAt(16319));
console.log('Context:', JSON.stringify(str.slice(16310, 16330)));

// OK so the 17aa function body ends at 16318 with ,
// Then 2b00 starts at 16320

// Let me check: is the 17aa function body COMPLETE?
// The 17aa function body starts at 85 (after "17aa":function(t,e,s))
// It should end with: e.default=o.exports}
// Or something similar
// And then comes the comma for the next module

// Let me check what the 17aa function body ends with
var func17aaStart = mod17aaStart + 17; // after "17aa":function(
console.log('17aa function body starts at:', func17aaStart);
console.log('17aa function body ends at:', mod17aaEnd);
console.log('Function body length:', mod17aaEnd - func17aaStart);

// Find the closing } of the function
var fDepth = 0;
var fInStr = false;
var fStrChar = '';
var func17aaEnd = -1;
for (var i = func17aaStart; i < str.length; i++) {
    var c = str[i];
    if (!fInStr) {
        if (c === '"' || c === "'" || c === '`') {
            fInStr = true; fStrChar = c;
        } else if (c === '{') fDepth++;
        else if (c === '}') { fDepth--; if (fDepth === 0) { func17aaEnd = i; break; } }
    } else {
        if (c === fStrChar && str[i-1] !== '\\') fInStr = false;
    }
}
console.log('17aa function body closes at:', func17aaEnd);
console.log('Context:', JSON.stringify(str.slice(Math.max(0, func17aaEnd - 20), func17aaEnd + 30)));

// Now let me check: what if the 17aa function is MISSING its closing brace?
// If the function body is open, then all the "17aa" content would be inside the function
// And the ",!1" at position 16274 would be at the top level of the function body
// But the function expects a } to close, and instead sees ,!1

// Actually, I think the issue might be different:
// What if the 17aa function body CLOSES at the WRONG position?
// Let me check: what if the closing } at 16318 is for the MODULES OBJECT, not the function?

// Structure should be:
// "17aa":function(t,e,s){  <-- opens function
//   ... code ...
// }  <-- closes function (at 16318)
// ,"2b00":function...  <-- next module

// But what if 16318 closes something ELSE?
// Let me check: what's the depth at position 16318?
var depthAt16318 = countBracketsUpTo(str, 16318);
console.log('\nDepth at position 16318:', depthAt16318);

// If depth at 16318 is p>0 or b>0 or br>0, then something is still open
// And the function hasn't closed yet

// Actually, I realize I should check the DEPTH of the FUNCTION BODY
// The 17aa function body starts at 85, and the first { is at 91
// So the function body depth starts at 1 after the { at 91

// Let me trace the depth specifically for the 17aa function body
console.log('\n=== Tracing 17aa function body depth ===');
var fbd = 0;
var fbInStr = false;
var fbStrChar = '';
var fbFirstClose = -1;
for (var i = func17aaStart; i < str.length; i++) {
    var c = str[i];
    if (!fbInStr) {
        if (c === '"' || c === "'" || c === '`') {
            fbInStr = true; fbStrChar = c;
        } else if (c === '{') {
            fbd++;
            if (fbd === 1 && fbFirstClose < 0) {
                // We're inside the function body
            }
        } else if (c === '}') {
            fbd--;
            if (fbd === 0 && fbFirstClose < 0) {
                fbFirstClose = i;
                console.log('First depth-0 } at', i, ':', JSON.stringify(str.slice(Math.max(0, i - 20), i + 10)));
                break;
            }
        }
    } else {
        if (c === fbStrChar && str[i-1] !== '\\') fbInStr = false;
    }
}

// Now let me try the actual fix that makes sense:
// Maybe the issue is that the 17aa function body is MISSING its closing }
// Let me check what character is at position fbFirstClose
console.log('\nPosition fbFirstClose:', fbFirstClose);
if (fbFirstClose >= 0) {
    console.log('Char at fbFirstClose:', JSON.stringify(str[fbFirstClose]), 'code:', str.charCodeAt(fbFirstClose));
    console.log('Context:', JSON.stringify(str.slice(Math.max(0, fbFirstClose - 30), fbFirstClose + 30)));
}

// Actually, let me try a completely different approach:
// Let me find what VALID webpack chunks look like
// by comparing with the LSD.bighome chunk
console.log('\n=== Comparing with working chunk ===');
var workingBuf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/LSD.bighome.3deb2a0f040de4b2cc6c.js');
var workingStr = workingBuf.toString('utf8');
console.log('Working chunk starts:', workingStr.slice(0, 50));
console.log('Working chunk ends:', JSON.stringify(workingStr.slice(-30)));
console.log('Working chunk paren balance:', (workingStr.match(/\(/g)||[]).length - (workingStr.match(/\)/g)||[]).length);

// The key difference might be in the webpack chunk STRUCTURE
// Let me check if the project-ifc chunk uses a different format

// Let me try to understand: what if the webpack chunk is MISSING the outer ()?
// The webpack 4 chunk format for the global webpackJsonp is:
// (window.webpackJsonp=window.webpackJsonp||[]).push([["name"],{...}])
// 
// But what if the original format was different?
// Some chunks use: webpackJsonp.push([["name"],{...}])
// without the outer ()

// Let me check: does the project-ifc chunk have outer ()?
console.log('\nProject-ifc chunk structure:');
console.log('First 10 chars:', JSON.stringify(str.slice(0, 10)));
console.log('Position 0-40:', JSON.stringify(str.slice(0, 45)));
console.log('At position 0:', str[0] === '(' ? 'HAS ( at 0' : 'NO ( at 0');
console.log('At position 40:', JSON.stringify(str[40]), str[40] === ')' ? 'HAS ) at 40' : '');

// So the chunk has ( at 0 and ) at 40
// Then .push starts at 45
// And the file ends with ]); -- which closes the array, the push call, and the ;

// Hmm, let me check: what if the 2 extra ) at the end
// come from a different source?

// Let me try the most targeted fix possible:
// Replace the problematic pattern at 16263-16274 with a corrected version

console.log('\n=== Trying targeted fix ===');
// Current: "])}),!1"  at 16263-16272
// This is: ] ) ] ) } ) , ! 1
// We need to find what this SHOULD be
// The context: 17aa module ends here, then 2b00 starts
// The 17aa module's last value is ,!1
// But maybe it should end with } or }),

// Let me check: what is the 17aa module's last statement?
// Looking at the 17aa module ending at 16318
// The content from 16263 to 16318 should be the closing of the 17aa module

// Let me get the full context of the 17aa module's ending
console.log('17aa module ending (16200-16320):');
console.log(JSON.stringify(str.slice(16200, 16320)));

// Now, the 17aa module should return an OBJECT (Vue component)
// The last property should end with: }, or }},
// But we have: ])}),!1
// Which means: ] closes render array, ) closes e(), } closes component, ) is EXTRA, , separator, !1 value

// I think the issue is: the 17aa module's LAST render call is MISSING a )
// It should be: e("p",{...},[...])])  -- two ) to close
// But we have: e("p",{...},[...])])  -- which is correct for ONE level

// Actually wait. Let me count: 
// ])}),!1
// ] = close array
// ) = close e("p",...)  
// ] = close array
// ) = close e("div",...)  <-- maybe this ) is WRONG?
// } = close component
// , = separator

// What if the ) after } is WRONG?
// The component definition should end with: }, or },}
// But we have: }), which means: } closes the component, ) is extra

// Let me try: replace ])}), with ])}
console.log('\n=== Fix attempt 1: remove ), at 16268-16270 ===');
var fixedA = str.slice(0, 16268) + str.slice(16270);
try {
    acorn.parse(fixedA, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 1: SUCCESS!');
} catch(e1) {
    console.log('Fix 1: FAILED at', e1.pos, ':', e1.message);
}

// Try: replace ])}),! with ])}]! or ])})!]
console.log('\n=== Fix attempt 2: replace ])}),! with ])}],! ===');
var fixedB = str.slice(0, 16268) + '],!' + str.slice(16271);
try {
    acorn.parse(fixedB, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 2: SUCCESS!');
} catch(e2) {
    console.log('Fix 2: FAILED at', e2.pos, ':', e2.message);
}

// Try: just remove the , between }) and !1
console.log('\n=== Fix attempt 3: remove , at 16272 ===');
var fixedC = str.slice(0, 16272) + str.slice(16273);
try {
    acorn.parse(fixedC, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Fix 3: SUCCESS!');
} catch(e3) {
    console.log('Fix 3: FAILED at', e3.pos, ':', e3.message);
}

// Try: replace the whole ending of 17aa with something sensible
// The 17aa module should end with e.default=o.exports},"2b00":
// But we have the render function content ending with ,!1

// Let me find what the NORMAL ending of 17aa should look like
// by checking what the 2b00 module starts with
console.log('\n=== Understanding module structure ===');
console.log('17aa module starts at:', mod17aaStart);
console.log('17aa function body starts at:', func17aaStart);
console.log('2b00 module starts at:', mod2b00Start);
console.log('2b00 function body starts at:', mod2b00Start + 17);
console.log('Gap between 17aa and 2b00:', JSON.stringify(str.slice(mod17aaEnd, mod2b00Start)));

// 17aa ends at 16318, 2b00 starts at 16320
// Gap is 2 chars: ,"  (comma and opening quote of "2b00")

// Now let me check: what if the 17aa function body ENDS at the WRONG position?
// The 17aa function body should end BEFORE the , of the webpack modules object
// Let me check: is the function body open at position 16318?
console.log('\n17aa module structure:');
console.log('Starts with:', JSON.stringify(str.slice(mod17aaStart, mod17aaStart + 60)));
console.log('Ends with:', JSON.stringify(str.slice(mod17aaEnd - 10, mod2b00Start + 10)));

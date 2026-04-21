var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Strategy: Count from END backwards. We know p=-2 at the end.
// Find the LAST 2 unclosed ( and their matching )
// Or find where 2 extra ) appear without matching (

console.log('=== Reverse bracket count from end ===');
// Count from the end: every ) adds 1, every ( subtracts 1
// We want to find where the imbalance starts

// First, count all parens in the file
var totalP = 0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) totalP++;
    else if (c === 41) totalP--;
}

// From the start analysis, we know:
// - 2 unmatched ) at the end
// - These are extra ), not missing (
// So: count of ) - count of ( = -2
// This means: count( ) = count( () + 2

console.log('Total paren balance:', totalP, '(negative = more ) than ()');

// Count from end
var fromEnd = 0;
for (var i = str.length - 1; i >= 0; i--) {
    var c = str.charCodeAt(i);
    if (c === 41) fromEnd++;
    else if (c === 40) fromEnd--;
    if (fromEnd === 0) {
        console.log('Balance reaches 0 at position', i, 'from end:', str.length - 1 - i);
        console.log('Context:', JSON.stringify(str.slice(Math.max(0, i - 10), i + 10)));
        break;
    }
}

if (fromEnd !== 0) {
    console.log('Never reaches balance 0. Final from-end balance:', fromEnd);
}

// Now let's find where the EXCESSIVE ) appear
// The file ends with `]);` - those match. So the extra ) are BEFORE the end.
// Let's count from position 32550 to end
console.log('\n=== Counting from near-end ===');
var nearEnd = 0;
var pCount = 0;
var mCount = 0;
for (var i = 32500; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) { pCount++; nearEnd++; }
    else if (c === 41) { mCount++; nearEnd--; }
    if (nearEnd !== 0) {
        console.log('Pos', i, ':', JSON.stringify(str[i]), 'depth:', nearEnd, 'p:', pCount, 'm:', mCount);
    }
}
console.log('Final near-end balance:', nearEnd, 'p:', pCount, 'm:', mCount);

// Now: find all ) that have no matching ( before them
// by scanning for the specific pattern: ) without corresponding (
// We already know the total is -2, so there are 2 excess )

// Let me find the EXACT positions of all parens near the end
console.log('\n=== Paren positions near end ===');
for (var i = str.length - 50; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40 || c === 41) {
        console.log('Pos', i, ':', c === 40 ? '(' : ')', JSON.stringify(str[i]));
    }
}

// Now let's find: where do the 2 extra ) appear?
// Let me trace depth from position 32548 backwards
console.log('\n=== Tracing depth from 32548 backwards ===');
var depth = 0;
var changes = [];
for (var i = 32548; i >= 0; i--) {
    var c = str.charCodeAt(i);
    if (c === 40) { depth++; changes.push({pos: i, type: 'open', char: str[i]}); }
    else if (c === 41) { depth--; changes.push({pos: i, type: 'close', char: str[i]}); }
    if (depth < 0) {
        console.log('Depth went negative at', i, ':', depth);
        console.log('Context:', JSON.stringify(str.slice(Math.max(0, i - 20), i + 10)));
        break;
    }
}
changes.reverse().forEach(function(c2) {
    // console.log(c2.pos + ': ' + c2.type + ' ' + JSON.stringify(c2.char));
});

// Now I know: at position 32548, there are more ) than (
// The 2 extra ) must be somewhere in the file
// Let me find ALL positions where a ) appears with no matching ( before it
// by finding the FIRST occurrence of unbalanced )
console.log('\n=== Finding first unbalanced ) ===');
var d = 0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) d++;
    else if (c === 41) d--;
    
    if (d < 0) {
        console.log('First unbalanced ) at position', i, ':', JSON.stringify(str[i]));
        console.log('Context:', JSON.stringify(str.slice(Math.max(0, i - 30), i + 30)));
        // Show the last few ( before this
        var lastOpens = [];
        var tempD = 0;
        for (var j = i - 1; j >= 0; j--) {
            var tc = str.charCodeAt(j);
            if (tc === 40) tempD++;
            else if (tc === 41) tempD--;
            if (tempD > 0 && lastOpens.length < 5) {
                lastOpens.push({pos: j, ctx: JSON.stringify(str.slice(Math.max(0, j - 10), j + 10))});
                tempD--;
            }
        }
        lastOpens.forEach(function(lo) {
            console.log('  Last ( before pos', lo.pos, ':', lo.ctx);
        });
        break;
    }
}

// KEY: find the EXACT position of the 2 extra )
// We know the file ends with 2 extra )
// And the chunk should end with:
// (window.webpackJsonp=...||[]).push([["project-ifc"],{...}])
//     opens with ( at 0, ) at 40
//     opens with ( at 45, ) at end
// Total opens = 2, closes = 2
// But we're at p=-2, meaning 2 extra )

// Where are these 2 extra )?
// Let me count parens in a different way: check every position

// Actually, let me take a completely different approach
// The webpack chunk format is:
// (window.webpackJsonp=...||[]).push([["chunk-name"],{...}])
// 
// Let's count from position 0:
// - Position 0: ( (depth = 1)
// - Position 40: ) (depth = 0)  
// - Position 42-44: .push (depth stays 0)
// - Position 45: ( (depth = 1) -- this is the push() call
// - ... modules ...
// - ... should end with ...})]); -- but we have ...})] so 2 ) are missing!

// Let me check the ACTUAL end of the file
console.log('\n=== File ending analysis ===');
console.log('Last 30 chars:', JSON.stringify(str.slice(-30)));
console.log('Last 30 char codes:');
for (var i = str.length - 30; i < str.length; i++) {
    console.log('  pos', i, ':', JSON.stringify(str[i]), 'code:', str.charCodeAt(i));
}

// Compare with a WORKING webpack chunk
console.log('\n=== Checking working chunk ending ===');
var workingBuf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/LSD.bighome.3deb2a0f040de4b2cc6c.js');
var workingStr = workingBuf.toString('utf8');
console.log('Working chunk last 30:', JSON.stringify(workingStr.slice(-30)));
console.log('Working chunk starts:', workingStr.slice(0, 5));

// Count parens in working chunk
var wTotal = 0;
for (var i = 0; i < workingStr.length; i++) {
    var c = workingStr.charCodeAt(i);
    if (c === 40) wTotal++;
    else if (c === 41) wTotal--;
}
console.log('Working chunk paren balance:', wTotal);

// Now, let me find the MISSING content
// If the file has 2 extra ), the ORIGINAL file likely had 2 more )
// that were deleted, OR the original had 2 fewer (
// 
// Since the webpack chunk structure is fixed, the issue is:
// the push() call needs to be closed with )], not ]
// and then ) needs another )
// 
// Expected ending: ...}}]),)]);  -- or similar
// Actual ending:    ...}}]);
// 
// Let me check what the "normal" webpack chunk end looks like
// by examining a known-good chunk structure

console.log('\n=== Webpack chunk structure expectation ===');
// Standard webpack 4 chunk format:
// (window.webpackJsonp=window.webpackJsonp||[]).push([["name"],{...}])
// The [ and ] in .push([...]) are the chunk IDs array brackets
// The { and } are the modules object
// The outer ( and ) are a grouping operator
//
// At the end, we need:
// - } to close the modules object
// - ] to close the chunk IDs array  
// - ) to close the .push() call
// - ; to end the statement
//
// Current ending: }]); -- has 1 } 1 ] 1 )
// Should have:    }]); -- wait, that's 1 } 1 ] 1 ) which is correct for the OBJECT/ARRAY/PUSH
// But we need 2 extra ) -- where?

// OH WAIT! I think I understand now!
// The webpack chunk wraps everything in:
// (function(chunkMap){ ... })({...})
// OR the format is different
//
// Let me check: what does webpackJsonp.push actually return?
// push returns the new length
// The whole thing is: (window.webpackJsonp=...||[]).push([...])
// This is a METHOD CALL, so the ( after .push needs )
// And the whole thing is wrapped in () for the assignment
// So: (assignment).method() = (window...).push(...)
// Position 0: (
// ... assignment ...
// Position 40: )
// Position 41: .
// ... push ...
// We need: ) to close push() and then nothing more (the outer ( was closed at 40)

// But we're at p=-2
// This means we have 2 more ) than (
// So somewhere, there are 2 EXTRA ) in the file

// Let me find ALL ) in the last portion of the file and count them
console.log('\n=== Count parens in last 500 chars ===');
var lastOpen = 0, lastClose = 0;
for (var i = str.length - 500; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) lastOpen++;
    else if (c === 41) lastClose++;
}
console.log('Last 500: ( =', lastOpen, ') =', lastClose, 'balance =', lastClose - lastOpen);

// Count in entire file
var totalOpen = 0, totalClose = 0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) totalOpen++;
    else if (c === 41) totalClose++;
}
console.log('Total: ( =', totalOpen, ') =', totalClose, 'balance =', totalClose - totalOpen);

// THE FIX: add 2 ) at the end
// But wait, let me also check: maybe the issue is that 2 ( were removed from the middle
// Let me look at the MODULE STRUCTURE more carefully

// The webpack chunk has 2 modules: "17aa" and "2b00"
// Both have full function bodies (no stubs)
// The closing of "2b00" function and the closing of the modules object
// and the closing of push() should all work out

// Let me check if the "2b00" module closes properly
console.log('\n=== 2b00 module closing ===');
var idx2b00 = str.indexOf('"2b00":function');
if (idx2b00 >= 0) {
    // Find the function body closing }
    var funcStart = idx2b00 + 17; // "2b00":function(t,e,s){
    var depth = 0;
    var inStr = false;
    var strChar = '';
    for (var i = funcStart; i < str.length; i++) {
        var c = str[i];
        if (!inStr) {
            if (c === '"' || c === "'" || c === '`') {
                inStr = true; strChar = c;
            } else if (c === '{') depth++;
            else if (c === '}') { depth--; if (depth === 0) { 
                console.log('2b00 function ends at', i, ':', JSON.stringify(str.slice(i - 5, i + 10)));
                console.log('After end:', JSON.stringify(str.slice(i + 1, i + 20)));
                break;
            }}
        } else {
            if (c === strChar && str[i-1] !== '\\') inStr = false;
        }
    }
}

// Check: what does the end of the file look like byte by byte
console.log('\n=== Raw bytes at end ===');
var endBuf = buf.slice(-20);
for (var i = 0; i < endBuf.length; i++) {
    console.log('  byte', buf.length - endBuf.length + i, ':', endBuf[i], '(0x' + endBuf[i].toString(16) + ')', JSON.stringify(String.fromCharCode(endBuf[i])));
}

var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Verify the depth trace at position 16274
// by manually tracking bracket depth with proper string-aware parsing

function trackDepth(s, upTo) {
    var depth = { p: 0, b: 0, br: 0 };
    var inString = false;
    var stringChar = '';
    
    for (var i = 0; i < upTo; i++) {
        var c = s[i];
        var cc = s.charCodeAt(i);
        
        if (!inString) {
            if (c === '"' || c === "'" || c === '`') {
                inString = true;
                stringChar = c;
            } else if (c === '(') depth.p++;
            else if (c === ')') depth.p--;
            else if (c === '{') depth.b++;
            else if (c === '}') depth.b--;
            else if (c === '[') depth.br++;
            else if (c === ']') depth.br--;
        } else {
            // Inside string - skip escaped chars
            if (c === '\\') {
                i++; // skip next char
            } else if (c === stringChar) {
                // Check for escaped quote
                var escapeCount = 0;
                for (var j = i - 1; j >= 0 && s[j] === '\\'; j--) {
                    escapeCount++;
                }
                if (escapeCount % 2 === 0) {
                    inString = false;
                }
            }
        }
    }
    
    return depth;
}

// Verify at key positions
var checkpoints = [16200, 16220, 16240, 16260, 16262, 16263, 16264, 16265, 16266, 16267, 16268, 16269, 16270, 16271, 16272, 16273, 16274, 16275, 16280, 16300];
console.log('=== Depth verification ===');
checkpoints.forEach(function(pos) {
    if (pos < str.length) {
        var d = trackDepth(str, pos);
        var ctx = JSON.stringify(str.slice(Math.max(0, pos - 10), pos + 5));
        console.log('Pos ' + pos + ': p=' + d.p + ' b=' + d.b + ' br=' + d.br + ' | ' + ctx);
    }
});

// Verify the t._v string
console.log('\n=== Verify t._v() string ===');
// Find the t._v call that contains the Chinese text
var tvPos = str.indexOf('t._v("请在大屏点击');
if (tvPos >= 0) {
    console.log('t._v call at position:', tvPos);
    console.log('String content:', JSON.stringify(str.slice(tvPos, tvPos + 50)));
    
    // Find the closing of this t._v call
    var openQuote = tvPos + 4; // after t._v(
    var closeQuote = -1;
    var inStr = false;
    for (var i = openQuote + 1; i < str.length; i++) {
        var c = str[i];
        if (c === '\\') { i++; continue; }
        if (c === '"' && !inStr) {
            closeQuote = i;
            break;
        }
    }
    
    if (closeQuote >= 0) {
        console.log('String closes at position:', closeQuote);
        console.log('Char at closeQuote:', JSON.stringify(str[closeQuote]), 'code:', str.charCodeAt(closeQuote));
        console.log('Content:', JSON.stringify(str.slice(openQuote + 1, closeQuote)));
        
        // What comes after the closing quote?
        console.log('After closeQuote:', JSON.stringify(str.slice(closeQuote, closeQuote + 10)));
    }
}

// Now verify: is the depth at 16262 (closing of t._v) correct?
var depthAt16262 = trackDepth(str, 16262);
console.log('\nDepth at position 16262:', JSON.stringify(depthAt16262));

// What SHOULD the depth be?
// The t._v("...") call is inside an array [...], which is inside the Vue h() call
// Let me count from the START
console.log('\n=== Manual depth from start ===');
var ctx = trackDepth(str, 16262);
console.log('At 16262: p=' + ctx.p + ' b=' + ctx.b + ' br=' + ctx.br);

// Now check: what if the depth tracking IS correct and there ARE unmatched parens?
// This would mean the t._v string is unclosed
// Let me check: does the string at position 16224 actually close at 16261?
console.log('\n=== Checking string at 16224 ===');
// The string starts at 16224 (after t._v()
var sStart = 16224;
console.log('Char at 16224:', JSON.stringify(str[16224]), 'code:', str.charCodeAt(16224));
// It should be " (ASCII 34)
if (str.charCodeAt(16224) === 34) {
    console.log('Good, starts with "');
    // Find the closing "
    var sEnd = -1;
    for (var i = 16225; i < str.length; i++) {
        if (str[i] === '\\') { i++; continue; }
        if (str[i] === '"') {
            sEnd = i;
            break;
        }
    }
    console.log('String ends at:', sEnd);
    if (sEnd >= 0) {
        console.log('String content:', JSON.stringify(str.slice(16225, sEnd)));
    }
}

// Now the CRITICAL check: what if the " at position 16224 is not a standard quote?
// Let me check its BYTE value
var strBefore = str.slice(0, 16224);
var byteOf16224 = Buffer.byteLength(strBefore, 'utf8');
console.log('\n=== Byte check ===');
console.log('Byte position of char 16224:', byteOf16224);
console.log('Raw byte:', buf[byteOf16224], '(0x' + buf[byteOf16224].toString(16) + ')');
console.log('Expected: 0x22 (ASCII ")');

// And check the closing quote
var strBefore2 = str.slice(0, 16261);
var byteOf16261 = Buffer.byteLength(strBefore2, 'utf8');
console.log('Byte position of char 16261:', byteOf16261);
console.log('Raw byte:', buf[byteOf16261], '(0x' + buf[byteOf16261].toString(16) + ')');

// Check the bytes around 16224
console.log('\nBytes around 16224:');
console.log(Buffer.from(buf.slice(byteOf16224 - 3, byteOf16224 + 5)).toString('hex'));
console.log(Buffer.from(buf.slice(byteOf16224 - 3, byteOf16224 + 5)).toString('latin1').replace(/[^\x20-\x7e]/g, '?'));

// Check bytes around 16261
var strBefore3 = str.slice(0, 16261);
var byteOf16261_2 = Buffer.byteLength(strBefore3, 'utf8');
console.log('\nBytes around 16261:');
console.log(Buffer.from(buf.slice(byteOf16261_2 - 3, byteOf16261_2 + 5)).toString('hex'));

// THE KEY TEST: use acorn's error recovery to find the ACTUAL issue
console.log('\n=== Acorn error analysis ===');
try {
    acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
} catch(e) {
    console.log('Error at:', e.pos, ':', e.message);
    console.log('Line:', e.loc.line, 'Col:', e.loc.column);
    
    // What if we insert a ) at position 16272?
    var withInsertion = str.slice(0, 16272) + ')' + str.slice(16272);
    try {
        acorn.parse(withInsertion, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('With ) insertion at 16272: SUCCESS!');
    } catch(e2) {
        console.log('With ) insertion at 16272: FAILED at', e2.pos);
    }
    
    // What if we REMOVE the ) at position 16272?
    var withRemoval = str.slice(0, 16272) + str.slice(16273);
    try {
        acorn.parse(withRemoval, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('With ) removal at 16272: SUCCESS!');
    } catch(e3) {
        console.log('With ) removal at 16272: FAILED at', e3.pos);
    }
    
    // What about removing BOTH 16272 AND the orphaned ) at end?
    // First find the orphaned )
    var stack = [];
    var inStr2 = false;
    var strChar2 = '';
    for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if (!inStr2) {
            if (c === '"' || c === "'" || c === '`') {
                inStr2 = true; strChar2 = c;
            } else if (c === '(') {
                stack.push(i);
            } else if (c === ')') {
                if (stack.length > 0) stack.pop();
                else {
                    console.log('Orphaned ) at position:', i);
                    break;
                }
            }
        } else {
            if (c === '\\') { i++; }
            else if (c === strChar2 && str[i-1] !== '\\') { inStr2 = false; }
        }
    }
}

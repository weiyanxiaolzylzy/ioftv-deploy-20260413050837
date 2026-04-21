var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

console.log('Size:', buf.length, 'bytes,', str.length, 'chars');

// Detailed byte analysis around position 16274
var errorPos = 16274;
console.log('\n=== Byte-level analysis at error position ===');
console.log('String char at', errorPos, ':', JSON.stringify(str[errorPos]), 'code:', str.charCodeAt(errorPos));

// Get the exact byte offset in the UTF-8 buffer
var before = str.slice(0, errorPos);
var byteOffset = Buffer.byteLength(before, 'utf8');
console.log('Byte offset:', byteOffset);

// Check actual bytes around the error
console.log('\nBytes around error (from byte', byteOffset, '):');
var region = buf.slice(Math.max(0, byteOffset - 5), byteOffset + 10);
console.log('  Hex:', region.toString('hex'));
console.log('  ASCII:', region.toString('ascii').replace(/[^\x20-\x7e]/g, '?'));

// Check the last few bytes BEFORE the error
var lastBytes = buf.slice(Math.max(0, byteOffset - 3), byteOffset);
console.log('\nLast 3 bytes before error char:');
console.log('  Hex:', lastBytes.toString('hex'));
console.log('  ASCII:', lastBytes.toString('ascii'));

// Now let's look at the string literal that should contain the Chinese text
// Find the position of the Chinese string start
var chinesePattern = 't._v("请';
var chineseIdx = str.indexOf(chinesePattern);
console.log('\n=== Chinese string analysis ===');
console.log('Chinese string starts at char pos:', chineseIdx);

// Find the closing quote
// Look for "),e(" which typically ends a t._v() call
var endPattern = '"),e("p"';
var endIdx = str.indexOf(endPattern, chineseIdx);
if (endIdx < 0) {
    // Try alternative
    endIdx = str.indexOf('"),e("p"', chineseIdx);
}
console.log('String ends (with "),e("p")? at char:', endIdx);

// Look for the closing " of the string
// It should be just before the "),e(" pattern
if (endIdx > chineseIdx) {
    var closingQuote = endIdx;
    console.log('Closing quote at char:', closingQuote);
    console.log('Char at closing quote - 1:', JSON.stringify(str[closingQuote - 1]), 'code:', str.charCodeAt(closingQuote - 1));
    console.log('Char at closing quote:', JSON.stringify(str[closingQuote]), 'code:', str.charCodeAt(closingQuote));
    console.log('String content length:', closingQuote - chineseIdx - 4); // -4 for 't._v("'
    
    // Check the UTF-8 bytes of the string
    var strStart = chineseIdx + 4; // after t._v("
    var strEnd = closingQuote;
    var strContent = str.slice(strStart, strEnd);
    console.log('String content:', JSON.stringify(strContent.slice(0, 50)) + '...');
    console.log('Expected closing quote at position:', closingQuote);
    
    // Get byte-level info
    var strBefore = str.slice(0, strStart);
    var strStartByte = Buffer.byteLength(strBefore, 'utf8');
    var strContentBuf = buf.slice(strStartByte, strStartByte + Buffer.byteLength(strContent, 'utf8'));
    console.log('String content bytes length:', strContentBuf.length);
    
    // Check if the string content ends properly
    console.log('Last 5 bytes of string content:', strContentBuf.slice(-5).toString('hex'));
    console.log('Last 5 chars of string content:', JSON.stringify(strContent.slice(-5)));
}

// Now let's trace the exact position of the closing quote
// by looking at the raw bytes
var quoteCharCode = 34; // ASCII double quote
console.log('\n=== Finding closing quote in raw bytes ===');
// Find all byte positions where the byte equals 0x22 (")
var bytePositions = [];
for (var i = 0; i < buf.length; i++) {
    if (buf[i] === quoteCharCode) bytePositions.push(i);
}

// Now find which of these closes the Chinese string
// The string starts at chineseIdx + 4 (after t._v(")
// We need to find the byte corresponding to char position chineseIdx + 4
var charToFind = chineseIdx + 4;
var byteBeforeStr = Buffer.byteLength(str.slice(0, charToFind), 'utf8');
console.log('Byte corresponding to char', charToFind, ':', byteBeforeStr);

// The closing quote should be at the byte position of char closingQuote
// closingQuote = endIdx
var charClosingQuote = endIdx;
var byteClosingQuote = Buffer.byteLength(str.slice(0, charClosingQuote), 'utf8');
console.log('Byte corresponding to closing quote at char', charClosingQuote, ':', byteClosingQuote);

// Check the byte at that position
console.log('Byte at', byteClosingQuote, ':', buf[byteClosingQuote], '(0x' + buf[byteClosingQuote].toString(16) + ')');
if (buf[byteClosingQuote] === 0x22) {
    console.log('Confirmed: closing quote byte is 0x22');
}

// Now verify: what byte corresponds to char position errorPos (16274)?
var errorByte = Buffer.byteLength(str.slice(0, errorPos), 'utf8');
console.log('\nByte at char position', errorPos, ':', errorByte);
console.log('Byte value:', buf[errorByte], '(0x' + buf[errorByte].toString(16) + ')');

// The error is at char 16274, byte errorByte
// Acorn says ! is unexpected
// If the closing quote is at char closingQuote (which should be < 16274),
// then ! at 16274 should be outside the string

// Let me check: is closingQuote < errorPos?
console.log('\nclosingQuote:', charClosingQuote, 'errorPos:', errorPos);
if (charClosingQuote < errorPos) {
    console.log('CLOSING QUOTE IS BEFORE ERROR - string is properly closed!');
    console.log('Then why does Acorn say ! is unexpected?');
} else {
    console.log('CLOSING QUOTE IS AFTER ERROR or at same position!');
}

// Let's check: is the " before the error actually a closing quote?
// Find the last " before position 16274
var lastQuoteBefore = -1;
for (var i = 0; i < errorPos; i++) {
    if (buf[Buffer.byteLength(str.slice(0, i+1), 'utf8') - 1] === 0x22) {
        // Check if this is a byte-level quote
        var byteOfI = Buffer.byteLength(str.slice(0, i+1), 'utf8') - 1;
        if (buf[byteOfI] === 0x22) {
            lastQuoteBefore = i;
        }
    }
}
console.log('\nLast char " before position', errorPos, ':', lastQuoteBefore);

// DO IT DIFFERENTLY: search the raw bytes
console.log('\n=== Raw byte search for quotes ===');
// Find all occurrences of 0x22 (") in the byte range 16000-16500
var byteRangeStart = 16000;
var byteRangeEnd = 16500;
var quoteBytes = [];
for (var i = byteRangeStart; i < byteRangeEnd; i++) {
    if (buf[i] === 0x22) quoteBytes.push(i);
}
console.log('Quote byte positions (0x22) in range', byteRangeStart, '-', byteRangeEnd, ':');
quoteBytes.forEach(function(p) {
    // Find char position
    var charPos = Buffer.from(buf.slice(0, p)).toString('utf8').length;
    console.log('  Byte', p, '-> char', charPos, '-> char code', str.charCodeAt(charPos), '->', JSON.stringify(str[charPos]));
});

// THEORY: maybe the closing quote is encoded differently
// Let me check if there's a special character at the "closing" position
console.log('\n=== Character at position', charClosingQuote, '===');
console.log('Char:', JSON.stringify(str[charClosingQuote]), 'code:', str.charCodeAt(charClosingQuote));
console.log('Char:', JSON.stringify(str[charClosingQuote+1]), 'code:', str.charCodeAt(charClosingQuote+1));
console.log('Char:', JSON.stringify(str[charClosingQuote+2]), 'code:', str.charCodeAt(charClosingQuote+2));

// Maybe the issue is that the string hasn't been closed yet because
// there are unbalanced quotes inside
// Let me count quotes in the string
var innerQuotes = (strContent.match(/["']/g) || []).length;
console.log('\nQuotes inside string content:', innerQuotes);
if (innerQuotes > 0) {
    console.log('WARNING: There are', innerQuotes, 'quotes INSIDE the string!');
    console.log('This would cause the string to close prematurely!');
    console.log('Looking for inner quotes in:', JSON.stringify(strContent.slice(0, 100)));
    for (var i = 0; i < strContent.length; i++) {
        var c = strContent.charCodeAt(i);
        if (c === 34 || c === 39) {
            console.log('Inner quote at string pos', i, ':', JSON.stringify(strContent[i]));
        }
    }
}

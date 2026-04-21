const fs = require('fs');
const zlib = require('zlib');

// Read the git original file
const gitOrig = fs.readFileSync(process.env.TEMP + '/git_orig.bin');
console.log('Git original size:', gitOrig.length, 'bytes');

// Check encoding
let nullCount = 0;
for (let i = 0; i < gitOrig.length; i++) {
    if (gitOrig[i] === 0x00) nullCount++;
}
console.log('Null bytes:', nullCount, '/', gitOrig.length, '=', (nullCount/gitOrig.length*100).toFixed(1) + '%');

// UTF-16 LE: every 2 bytes = 1 character
const charCount = Math.floor(gitOrig.length / 2);
const chars = [];
for (let i = 0; i < charCount; i++) {
    const charCode = gitOrig[i * 2] | (gitOrig[i * 2 + 1] << 8);
    if (charCode > 0) {
        chars.push(String.fromCharCode(charCode));
    }
}
const str = chars.join('');
console.log('\nReconstructed string length:', str.length);

// Verify the content
console.log('Starts with:', str.slice(0, 60));
console.log('Has AdvancedIfcViewer:', str.includes('AdvancedIfcViewer'));
console.log('Has project-ifc:', str.includes('project-ifc'));

// Check brackets
let b=0, br=0, p2=0;
for (const c of str) {
    if (c === '{') b++;
    else if (c === '}') b--;
    else if (c === '[') br++;
    else if (c === ']') br--;
    else if (c === '(') p2++;
    else if (c === ')') p2--;
}
console.log('Brackets: b=' + b + ' br=' + br + ' p=' + p2);

// Check at position 16675
if (str.length > 16675) {
    console.log('\nChar at 16675:', JSON.stringify(str.charAt(16675)));
    console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
}

// Check for backticks
const bt = (str.match(/`/g) || []).length;
console.log('\nBackticks:', bt);

// Check for the "17aa" stub
const has17aa = str.includes('"17aa":function(t,e,s){"use strict";s("8920")}');
console.log('Has 17aa stub:', has17aa);

// Check if file ends properly
console.log('\nLast 20 chars:', JSON.stringify(str.slice(-20)));

// Now save the converted UTF-8 version
// We need to figure out the correct hash. The file in git is named "3deb2a0f040de4b2cc6c"
// Let's save it with both hash names to be safe

const target1 = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
const target2 = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js';

// Write as UTF-8
const utf8Buf = Buffer.from(str, 'utf8');
console.log('\nConverted to UTF-8:', utf8Buf.length, 'bytes');

fs.writeFileSync(target1, utf8Buf);
console.log('Saved to:', target1.split('/').pop());

fs.writeFileSync(target2, utf8Buf);
console.log('Saved to:', target2.split('/').pop());

// Also update the beifen backup
const beifen = 'd:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
fs.writeFileSync(beifen, utf8Buf);
console.log('Updated beifen backup too');

// Verify
const verify = fs.readFileSync(target1);
const vstr = verify.toString('utf8');
console.log('\n=== Verification ===');
console.log('Size:', verify.length, 'bytes');
let vb=0, vbr=0, vp=0;
for (const c of vstr) {
    if (c === '{') vb++;
    else if (c === '}') vb--;
    else if (c === '[') vbr++;
    else if (c === ']') vbr--;
    else if (c === '(') vp++;
    else if (c === ')') vp--;
}
console.log('Brackets: b=' + vb + ' br=' + vbr + ' p=' + vp);
console.log('Ends:', JSON.stringify(vstr.slice(-15)));
console.log('Starts:', vstr.slice(0, 50));

// Check char at 16675
if (vstr.length > 16675) {
    console.log('\nChar at 16675:', JSON.stringify(vstr.charAt(16675)));
    console.log('Context:', JSON.stringify(vstr.slice(16650, 16700)));
}

// Clean up temp file
try { fs.unlinkSync(process.env.TEMP + '/git_orig.bin'); } catch(e) {}

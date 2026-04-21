const fs = require('fs');

// Read the current file on disk
const disk = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Disk size:', disk.length, 'bytes');
console.log('Last 30 bytes hex:', disk.slice(-30).toString('hex'));

// The webpack chunk format: (window.webpackJsonp=...||[]).push([["name"],{...}])
// The opening `(` at byte 0 needs a closing `)`
// The `.push([` opens an array argument, which needs `]` to close
// The `{...}` modules object needs `}` to close
// Then `)` closes the push call
// Then `;` ends the statement

// Current ending: `};\r\n` (bytes ...7d 3b 0d 0a)
// That's: `}` + `;` + `\r\n`
// But we need: `}` + `]` + `)` + `;` + `\r\n`
// Or: `}` + `]` + `)` + `;` + `\n` (if no \r)

console.log('\nCurrent last 5 bytes:', disk.slice(-5).toString('hex'));
console.log('Current last 5 chars:', disk.slice(-5).toString('ascii').replace(/[^\x20-\x7e]/g, '?'));

// The file starts with `(` which is parenthesized
// So the running bracket balance at position 0 would be 1 (open paren)
// As we parse, the paren balance should be 1 until we find the matching `)`
// Let me find where the last `)` is
const str = disk.toString('utf8');
let parenBalance = 0;
let lastCloseParen = -1;
for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') parenBalance++;
    else if (str[i] === ')') { parenBalance--; lastCloseParen = i; }
}
console.log('\nRunning paren balance at end:', parenBalance);
console.log('Last close paren at:', lastCloseParen, '->', JSON.stringify(str.slice(lastCloseParen, lastCloseParen + 20)));

// Also check brackets
let bracketBalance = 0;
let lastCloseBracket = -1;
for (let i = 0; i < str.length; i++) {
    if (str[i] === '[') bracketBalance++;
    else if (str[i] === ']') { bracketBalance--; lastCloseBracket = i; }
}
console.log('Running bracket balance at end:', bracketBalance);
console.log('Last close bracket at:', lastCloseBracket, '->', JSON.stringify(str.slice(lastCloseBracket, lastCloseBracket + 20)));

// If parenBalance > 0, we need more `)` chars
// If bracketBalance > 0, we need more `]` chars

// The webpack chunk format has:
// 1. Outer `(` wrapping - needs `)`
// 2. `||[]` - needs `]` 
// 3. `.push([` - needs `]`
// 4. `[["name"],{modules}]` - inner [ and ] for chunk name, inner [ and ] for modules
// 5. `)` for push call
//
// The last `)` in the file should be the one that closes the `.push()` call
// But if the file ends with `};\r\n`, then there's NO `)` after the `}`

// Let me check: what's at the last `)` position?
if (lastCloseParen >= 0) {
    console.log('\nAfter last ):', JSON.stringify(str.slice(lastCloseParen, lastCloseParen + 30)));
}

// The fix: append `])` to the end of the file
console.log('\n=== Applying fix ===');
const fixed = Buffer.concat([disk, Buffer.from('])', 'utf8')]);
console.log('Fixed size:', fixed.length, 'bytes');
console.log('Fixed last 10 hex:', fixed.slice(-10).toString('hex'));

// Save
fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', fixed);
fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', fixed);
console.log('Saved both files');

// Verify
const verify = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('\nVerify size:', verify.length, 'bytes');
console.log('Verify last 15 hex:', verify.slice(-15).toString('hex'));

const vstr = verify.toString('utf8');
parenBalance = 0;
for (const c of vstr) {
    if (c === '(') parenBalance++;
    else if (c === ')') parenBalance--;
}
bracketBalance = 0;
for (const c of vstr) {
    if (c === '[') bracketBalance++;
    else if (c === ']') bracketBalance--;
}
console.log('Paren balance:', parenBalance, 'Bracket balance:', bracketBalance);
console.log('Ends with `]);`:', vstr.endsWith(']);'));
console.log('Ends with `]);\\r\\n`:', vstr.endsWith(']);\r\n'));

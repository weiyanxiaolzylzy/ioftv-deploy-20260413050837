const fs = require('fs');
const zlib = require('zlib');

// Check the git original file
const gitOrig = fs.readFileSync(process.env.TEMP + '/git_orig.bin');
console.log('Git original size:', gitOrig.length, 'bytes');
console.log('First 20 bytes hex:', gitOrig.slice(0, 20).toString('hex'));

// Check encoding
// UTF-16 LE would have even bytes = 0x00, odd bytes = actual chars
let nullCount = 0;
for (let i = 0; i < gitOrig.length; i++) {
    if (gitOrig[i] === 0x00) nullCount++;
}
console.log('Null bytes:', nullCount, '/', gitOrig.length);
console.log('Null percentage:', (nullCount / gitOrig.length * 100).toFixed(1) + '%');

// Try to decode as UTF-16 LE
try {
    const utf16le = gitOrig.slice(0, 100).toString('utf16le');
    console.log('\nFirst 50 chars as UTF-16 LE:', utf16le);
} catch(e) {
    console.log('UTF-16 LE decode failed:', e.message);
}

// Try UTF-16 BE
try {
    const utf16be = gitOrig.slice(0, 100).toString('ucs2');
    console.log('First 50 chars as UCS-2:', utf16be);
} catch(e) {
    console.log('UCS-2 decode failed:', e.message);
}

// Check: is it gzip?
if (gitOrig[0] === 0x1f && gitOrig[1] === 0x8b) {
    console.log('\nGit original is GZIP compressed!');
    try {
        const decompressed = zlib.gunzipSync(gitOrig);
        console.log('Decompressed size:', decompressed.length);
        const str = decompressed.toString('utf8');
        console.log('Decompressed string length:', str.length);
        
        // Check bracket balance
        let b=0, br=0, p2=0;
        for (const c of str) {
            if (c === '{') b++;
            else if (c === '}') b--;
            else if (c === '[') br++;
            else if (c === ']') br--;
            else if (c === '(') p2++;
            else if (c === ')') p2--;
        }
        console.log('Decompressed brackets: b=' + b + ' br=' + br + ' p=' + p2);
        
        // Check char at 16675
        if (str.length > 16675) {
            console.log('\nChar at 16675:', JSON.stringify(str.charAt(16675)));
            console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
        }
        
        console.log('Ends:', JSON.stringify(str.slice(-20)));
        console.log('Starts:', str.slice(0, 50));
    } catch(e2) {
        console.log('Decompress failed:', e2.message);
    }
} else {
    console.log('\nNot gzip. Checking as UTF-16 LE...');
    // Try UTF-16 LE interpretation
    if (nullCount > gitOrig.length * 0.3) {
        console.log('Looks like UTF-16 encoding (high null byte count)');
        // Each 2 bytes = 1 character
        const charCount = Math.floor(gitOrig.length / 2);
        const chars = [];
        for (let i = 0; i < charCount; i++) {
            const charCode = gitOrig[i * 2] | (gitOrig[i * 2 + 1] << 8);
            if (charCode > 0) {
                chars.push(String.fromCharCode(charCode));
            }
        }
        const str = chars.join('');
        console.log('Reconstructed string length:', str.length);
        console.log('First 100 chars:', str.slice(0, 100));
        
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
        
        if (str.length > 16675) {
            console.log('Char at 16675:', JSON.stringify(str.charAt(16675)));
            console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
        }
    }
}

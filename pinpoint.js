const fs = require('fs');
const vm = require('vm');

const buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
const content = buf.toString('latin1');

console.log('Total length:', content.length);

// Binary search for the last valid position
function tryParse(upTo) {
    try {
        new vm.Script(content.substring(0, upTo));
        return true;
    } catch (e) {
        return false;
    }
}

// Coarse search - find roughly where it fails
let step = Math.floor(content.length / 2);
let lo = 0, hi = content.length;
while (step > 100) {
    if (tryParse(lo + step)) {
        lo += step;
    }
    step = Math.floor(step / 2);
}

console.log('Rough last good:', lo, 'trying around there...');

// Fine search around lo
for (let i = lo; i < Math.min(content.length, lo + 200); i++) {
    if (!tryParse(i)) {
        console.log('First failure at char', i, 'code', content.charCodeAt(i), JSON.stringify(content[i]));
        // Show context
        console.log('Around error:', JSON.stringify(content.substring(Math.max(0,i-50), i+50)));
        break;
    }
}

// Try to pinpoint using line by line
console.log('\nLine-based analysis:');
const lines = content.split('\n');
let charPos = 0;
for (let li = 0; li < lines.length; li++) {
    const lineLen = lines[li].length + 1; // +1 for \n
    if (!tryParse(charPos + lineLen)) {
        console.log('Fails during line', li+1, 'at char offset', charPos);
        // Find exact position within this line
        for (let pi = 0; pi < lines[li].length; pi++) {
            if (!tryParse(charPos + pi)) {
                console.log('Exact failure: line', li+1, 'col', pi, 'char', content.charCodeAt(charPos + pi), JSON.stringify(content[charPos + pi]));
                // Context
                const ctx = content.substring(charPos + pi - 30, charPos + pi + 30);
                console.log('Context:', JSON.stringify(ctx));
                // Find unmatched parens in context
                let depth = 0, inStr = false, strChar = '';
                for (let ci = 0; ci < ctx.length; ci++) {
                    const c = ctx[ci];
                    if (!inStr) {
                        if (c === '(' || c === '[' || c === '{') depth++;
                        if (c === ')' || c === ']' || c === '}') depth--;
                    }
                }
                console.log('Paren depth around error:', depth);
                break;
            }
        }
        break;
    }
    charPos += lineLen;
}

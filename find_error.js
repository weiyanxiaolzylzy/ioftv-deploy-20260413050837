const fs = require('fs');
const vm = require('vm');

const buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
const content = buf.toString('latin1');

console.log('Length:', content.length, 'bytes:', buf.length);

// Binary search for the error position
// Try compiling increasingly larger portions
let lo = 0, hi = content.length;
let lastGood = -1;

function tryParse(upTo) {
    const snippet = content.substring(0, upTo);
    try {
        new vm.Script(snippet);
        return true;
    } catch (e) {
        return false;
    }
}

// Binary search for where it starts failing
while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (tryParse(mid)) {
        lo = mid;
    } else {
        hi = mid - 1;
    }
}

console.log('Last good position:', lo);
console.log('First bad char:', content.charCodeAt(lo));
console.log('Context:', JSON.stringify(content.substring(Math.max(0, lo-30), lo+30)));

// Show bytes around error
console.log('\nBytes around error:');
for (let i = Math.max(0, lo-20); i < Math.min(content.length, lo+20); i++) {
    console.log('  pos', i, ':', buf[i], '(0x' + buf[i].toString(16) + ') =', JSON.stringify(content[i]));
}

// Now try to pinpoint by scanning from the last good position
console.log('\nScanning from last good:');
for (let i = lo + 1; i < Math.min(content.length, lo + 100); i++) {
    const snippet = content.substring(0, i);
    if (!tryParse(i)) {
        console.log('Fails at pos', i, 'char', content.charCodeAt(i), JSON.stringify(content[i]));
        break;
    }
}

var fs = require('fs');
var vm = require('vm');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var content = buf.toString('latin1');

console.log('File length:', content.length);

function tryParse(upTo) {
    try {
        new vm.Script(content.substring(0, upTo), {filename: 'test.js'});
        return true;
    } catch(e) {
        return false;
    }
}

// Binary search
var lo = 0, hi = content.length;
while (hi - lo > 1) {
    var mid = Math.floor((lo + hi) / 2);
    if (tryParse(mid)) {
        lo = mid;
    } else {
        hi = mid;
    }
}
console.log('Last good:', lo, 'First bad:', hi);

// Now do a linear scan from lo to find exact position
var lastGood = lo;
for (var i = lo; i < hi; i++) {
    if (!tryParse(i)) {
        console.log('Exact failure at char', i, '=', content.charCodeAt(i), JSON.stringify(content[i]));
        // Show context
        console.log('Context:', JSON.stringify(content.substring(Math.max(0,i-30), i+30)));
        // Show bytes
        for (var j = Math.max(0,i-5); j < Math.min(content.length, i+5); j++) {
            console.log('  ' + j + ': 0x' + content.charCodeAt(j).toString(16) + ' = ' + content.charCodeAt(j) + ' = ' + JSON.stringify(content[j]));
        }
        break;
    }
    lastGood = i;
}

// Also check: what does vm say the error is?
var errMsg = '';
try {
    new vm.Script(content, {filename: 'test.js'});
} catch(e) {
    errMsg = e.message;
}
console.log('\nvm.Script error:', errMsg);

// Find position from error message
var posMatch = errMsg.match(/at position (\d+)/);
if (posMatch) {
    console.log('Position from vm:', posMatch[1]);
}

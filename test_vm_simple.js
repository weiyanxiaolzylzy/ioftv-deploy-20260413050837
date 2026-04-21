var vm = require('vm');

// Test simple expressions
var tests = [
    ['(', 1],
    ['(w', 2],
    ['(w', 3],
    ['(', 10],
    ['(w', 100],
    ['(function(){})', 15],
];

for (var i = 0; i < tests.length; i++) {
    try {
        new vm.Script(tests[i][0]);
        console.log('OK:', JSON.stringify(tests[i][0]));
    } catch (e) {
        console.log('FAIL:', JSON.stringify(tests[i][0]), e.message);
    }
}

// Now test the actual file byte by byte
var fs = require('fs');
var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var content = buf.toString('latin1');

console.log('\nByte-by-byte analysis:');
for (var i = 0; i < 20; i++) {
    var s = content.substring(0, i);
    try {
        new vm.Script(s);
        console.log('OK length', i, ':', JSON.stringify(s));
    } catch (e) {
        console.log('FAIL length', i, ':', JSON.stringify(s), '->', e.message);
    }
}

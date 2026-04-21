var vm = require('vm');
var tests = [
    '(t.getFullYear())+"-"+(e)+"-"+(s)',
    '(window.location.origin)+(t.startsWith("/")?t:"/"+t)',
    '"already updated "+(this.listSelectedRows.length)+" items"',
    '"/api/projects/"+(t.id)+"/components/batch-assign"',
    'function(module,exports,require){"use strict";module.exports.r(1);var r={data:()=>({a:1})};}',
];

for (var i = 0; i < tests.length; i++) {
    try {
        new vm.Script(tests[i]);
        console.log('OK', i, tests[i].substring(0, 40));
    } catch(e) {
        console.log('FAIL', i, e.message);
    }
}

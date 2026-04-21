var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js');
var vm = require('vm');

var content = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'latin1');

// Extract module 2b00
var mod2Start = content.indexOf('"2b00":function');
if (mod2Start === -1) mod2Start = content.indexOf("'2b00':function");
console.log('Module 2b00 starts at: ' + mod2Start);

if (mod2Start >= 0) {
    // Find the closing } of module 2b00
    var braceCount = 0;
    var started = false;
    var endPos = mod2Start;
    for (var i = mod2Start; i < content.length; i++) {
        if (content[i] === '{') { started = true; braceCount++; }
        else if (content[i] === '}') { braceCount--; }
        if (started && braceCount === 0) { endPos = i + 1; break; }
    }
    
    var module2 = content.substring(mod2Start, endPos);
    console.log('Module 2b00 length: ' + module2.length);
    
    // Test with acorn
    try {
        acorn.parse(module2, { ecmaVersion: 2020, sourceType: 'script' });
        console.log('Acorn: Module 2b00 parses OK!');
    } catch(e) {
        console.log('Acorn: ' + e.message + ' at ' + e.pos);
        console.log('Context: ' + JSON.stringify(module2.substring(Math.max(0,e.pos-50), e.pos+50)));
    }
    
    // Test with vm
    try {
        new vm.Script(module2, { filename: 'mod2.js' });
        console.log('vm: Module 2b00 compiles OK!');
    } catch(e) {
        console.log('vm: ' + e.message);
    }
    
    // Binary search with acorn within module 2b00
    console.log('\nBinary search for acorn within module 2b00...');
    var lo = 0, hi = module2.length, lastOk = 0;
    while (lo < hi) {
        var mid = Math.floor((lo + hi + 1) / 2);
        try {
            acorn.parse(module2.substring(0, mid), { ecmaVersion: 2020, sourceType: 'script' });
            lastOk = mid;
            lo = mid;
        } catch(e) {
            hi = mid - 1;
        }
    }
    console.log('Acorn max parseable: ' + lastOk + ' / ' + module2.length);
    console.log('Context: ' + JSON.stringify(module2.substring(Math.max(0,lastOk-50), lastOk+50)));
    
    // Binary search with vm within module 2b00
    console.log('\nBinary search for vm within module 2b00...');
    lo = 0; hi = module2.length; lastOk = 0;
    while (lo < hi) {
        var mid2 = Math.floor((lo + hi + 1) / 2);
        try {
            new vm.Script(module2.substring(0, mid2), { filename: 'mod2.js' });
            lastOk = mid2;
            lo = mid2;
        } catch(e) {
            hi = mid2 - 1;
        }
    }
    console.log('vm max parseable: ' + lastOk + ' / ' + module2.length);
    console.log('Context: ' + JSON.stringify(module2.substring(Math.max(0,lastOk-50), lastOk+50)));
}

var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js');
var vm = require('vm');

var content = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'latin1');

// Extract module 2b00
var mod2Start = content.indexOf('"2b00":function');
if (mod2Start === -1) mod2Start = content.indexOf("'2b00':function");

if (mod2Start >= 0) {
    var braceCount = 0;
    var started = false;
    var endPos = mod2Start;
    for (var i = mod2Start; i < content.length; i++) {
        if (content[i] === '{') { started = true; braceCount++; }
        else if (content[i] === '}') { braceCount--; }
        if (started && braceCount === 0) { endPos = i + 1; break; }
    }
    
    var module2 = content.substring(mod2Start, endPos);
    
    // Wrap as function expression
    var asFunc = '(function(){' + module2 + '})';
    
    console.log('Function-wrapped module length: ' + asFunc.length);
    
    // Test with vm
    try {
        new vm.Script(asFunc, { filename: 'mod2.js' });
        console.log('vm: Function-wrapped parses OK!');
    } catch(e) {
        console.log('vm: ' + e.message);
        // Binary search
        var lo = 0, hi = asFunc.length, lastOk = 0;
        while (lo < hi) {
            var mid = Math.floor((lo + hi + 1) / 2);
            try {
                new vm.Script(asFunc.substring(0, mid), { filename: 'mod2.js' });
                lastOk = mid;
                lo = mid;
            } catch(e2) {
                hi = mid - 1;
            }
        }
        console.log('vm max parseable: ' + lastOk + ' / ' + asFunc.length);
        console.log('Context: ' + JSON.stringify(asFunc.substring(Math.max(0,lastOk-50), lastOk+50)));
    }
    
    // Test with acorn
    try {
        acorn.parse(asFunc, { ecmaVersion: 2020, sourceType: 'script' });
        console.log('Acorn: Function-wrapped parses OK!');
    } catch(e) {
        console.log('Acorn: ' + e.message + ' at ' + e.pos);
        var lo = 0, hi = asFunc.length, lastOk = 0;
        while (lo < hi) {
            var mid = Math.floor((lo + hi + 1) / 2);
            try {
                acorn.parse(asFunc.substring(0, mid), { ecmaVersion: 2020, sourceType: 'script' });
                lastOk = mid;
                lo = mid;
            } catch(e2) {
                hi = mid - 1;
            }
        }
        console.log('Acorn max parseable: ' + lastOk + ' / ' + asFunc.length);
        console.log('Context: ' + JSON.stringify(asFunc.substring(Math.max(0,lastOk-50), lastOk+50)));
    }
    
    // Now test WITHOUT the object wrapper
    console.log('\n--- Testing raw module content ---');
    // Just the function body
    var funcBody = module2.substring(module2.indexOf('{') + 1, module2.lastIndexOf('}'));
    console.log('Function body length: ' + funcBody.length);
    
    try {
        new vm.Script(funcBody, { filename: 'body.js' });
        console.log('vm: Raw function body OK!');
    } catch(e) {
        console.log('vm: ' + e.message);
        var lo = 0, hi = funcBody.length, lastOk = 0;
        while (lo < hi) {
            var mid = Math.floor((lo + hi + 1) / 2);
            try {
                new vm.Script(funcBody.substring(0, mid), { filename: 'body.js' });
                lastOk = mid;
                lo = mid;
            } catch(e2) {
                hi = mid - 1;
            }
        }
        console.log('vm body max: ' + lastOk + ' / ' + funcBody.length);
        console.log('Context: ' + JSON.stringify(funcBody.substring(Math.max(0,lastOk-50), lastOk+50)));
    }
}

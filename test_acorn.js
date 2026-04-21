var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js');

// Test if acorn supports template literals
var testCode = 'var x = `hello ${"world"}`;';
try {
    acorn.parse(testCode, { ecmaVersion: 2020, sourceType: 'script' });
    console.log('Acorn supports template literals with ecmaVersion 2020');
} catch(e) {
    console.log('Acorn does NOT support: ' + e.message);
}

var testCode2 = 'var x = `hello world`;';
try {
    acorn.parse(testCode2, { ecmaVersion: 2020, sourceType: 'script' });
    console.log('Acorn supports simple template literals');
} catch(e) {
    console.log('Acorn simple template: ' + e.message);
}

// Try with webpack format
var webpackCode = '(window.webpackJsonp=window.webpackJsonp||[]).push([["test"],{"a":function(t,e,s){"use strict";s("b")},"c":function(t,e,s){"use strict";s.r(e)}});';
try {
    acorn.parse(webpackCode, { ecmaVersion: 2020, sourceType: 'script' });
    console.log('Acorn parses webpack format OK');
} catch(e) {
    console.log('Acorn webpack: ' + e.message + ' at ' + e.pos);
}

// Read the actual file
var fs = require('fs');
var content = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'latin1');

// Extract just the modules object - wrap in parentheses
var modulesOnly = content.match(/push\(\[\[.*?\]\]\,(\{.*\})\);/s);
if (modulesOnly) {
    console.log('\nExtracted modules: ' + modulesOnly[1].length + ' chars');
    try {
        acorn.parse('(' + modulesOnly[1] + ')', { ecmaVersion: 2020, sourceType: 'script' });
        console.log('Modules parse OK!');
    } catch(e) {
        console.log('Modules error: ' + e.message + ' at ' + e.pos);
        var pos = e.pos;
        console.log('Context: ' + JSON.stringify(modulesOnly[1].substring(Math.max(0,pos-30), pos+30)));
    }
}

// Now test with vm.Script which uses V8 directly
var vm = require('vm');
console.log('\n--- Testing with Node.js vm module ---');
try {
    var script = new vm.Script(content, { filename: 'chunk.js' });
    console.log('vm.Script compiles OK!');
} catch(e) {
    console.log('vm.Script error: ' + e.message);
}

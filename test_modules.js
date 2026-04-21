var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js');
var acorn_parse = acorn.parse;

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var content = buf.toString('latin1');

console.log('File length:', content.length);

// Check: where does optional chaining appear in the file?
var optchain_positions = [];
for (var i = 0; i < content.length - 1; i++) {
    if (content[i] === '?' && content[i+1] === '.') {
        optchain_positions.push(i);
    }
}
console.log('Optional chaining operators found:', optchain_positions.length);
if (optchain_positions.length > 0) {
    console.log('First at:', optchain_positions[0]);
    console.log('Context:', JSON.stringify(content.substring(optchain_positions[0]-20, optchain_positions[0]+30)));
}

// Try Acorn with acmaVersion that supports optional chaining (2020)
console.log('\n--- Acorn with ecmaVersion: 2020 ---');
try {
    acorn_parse(content, { ecmaVersion: 2020, sourceType: 'script' });
    console.log('OK');
} catch (e) {
    console.log('FAIL at pos', e.pos, ':', e.message);
    console.log('Context:', JSON.stringify(content.substring(Math.max(0, e.pos-30), e.pos+30)));
}

// Try Acorn with experimental features enabled
console.log('\n--- Acorn with ecmaVersion: 2022 ---');
try {
    acorn_parse(content, { ecmaVersion: 2022, sourceType: 'script' });
    console.log('OK');
} catch (e) {
    console.log('FAIL at pos', e.pos, ':', e.message);
    console.log('Context:', JSON.stringify(content.substring(Math.max(0, e.pos-30), e.pos+30)));
}

// Try to find the REAL error by removing optional chaining
// Strategy: extract each module and test individually
console.log('\n--- Testing modules individually ---');
// Find all module definitions: "moduleId":function(t,e,s){...},
var modulePattern = /"([0-9a-f]+)":function\(t,e,s\)\{(.+?)\},(?="[0-9a-f]+":|$)/g;
var match;
var moduleNum = 0;
var modules = [];
while ((match = modulePattern.exec(content)) !== null) {
    moduleNum++;
    var moduleId = match[1];
    var moduleBody = match[2];
    var fullMatch = match[0];
    // Check if this module contains optional chaining
    var hasOptChain = moduleBody.indexOf('?.') >= 0;
    console.log('Module', moduleId, 'body len:', moduleBody.length, 'hasOptChain:', hasOptChain);

    // Test the module body
    // Wrap in a function to make it valid
    var wrapped = 'function __test__(module,exports,require,__acorn_test__){' + moduleBody + '}';
    var testCode = '__test__(null,null,null,null);';
    try {
        // This won't work with optional chaining in older Acorn...
        // Try with acorn 8+ which supports optional chaining
        acorn_parse(wrapped, { ecmaVersion: 2020 });
        console.log('  -> Valid (Acorn 2020)');
    } catch (e) {
        console.log('  -> FAIL (Acorn 2020):', e.message.substring(0, 80));
    }
}

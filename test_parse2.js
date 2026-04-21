var fs = require('fs');
var acorn_path = 'd:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js';
var content = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', 'latin1');

var acorn;
try {
    acorn = require(acorn_path);
} catch(e) {
    console.log('Cannot load acorn from project, trying global');
    process.exit(1);
}

try {
    var result = acorn.parse(content, { ecmaVersion: 2020, sourceType: 'script' });
    console.log('Acorn parse: SUCCESS');
} catch(e) {
    console.log('Acorn error at position:', e.pos);
    console.log('Acorn message:', e.message);
    var ctx = content.substring(Math.max(0, e.pos-80), e.pos+80);
    console.log('Context around error:');
    console.log(JSON.stringify(ctx));
}

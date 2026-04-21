var fs = require('fs');
var content = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', 'latin1');

console.log('File size:', content.length);
console.log('Char at 16675:', JSON.stringify(content.charAt(16675)));

// Try to parse the whole thing with acorn
try {
    var acorn = require('acorn');
    var result = acorn.parse(content, { ecmaVersion: 2020, sourceType: 'script', onComment: [] });
    console.log('Acorn parse: SUCCESS');
} catch(e) {
    console.log('Acorn error at:', e.pos);
    console.log('Acorn message:', e.message);
    var ctx = content.substring(Math.max(0, e.pos-50), e.pos+50);
    console.log('Context:', JSON.stringify(ctx));
}

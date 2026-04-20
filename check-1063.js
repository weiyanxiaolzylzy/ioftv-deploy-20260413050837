var fs = require('fs');
var acorn = require('./server/node_modules/acorn');

var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js');
var text = buf.toString('utf8');
console.log('1063 file length:', text.length);

try {
    acorn.parse(text, {ecmaVersion: 2020, sourceType: 'script'});
    console.log('1063 is VALID!');
} catch(e) {
    console.log('1063 error at:', e.pos);
    console.log('Context:', JSON.stringify(text.slice(Math.max(0, e.pos-30), e.pos+30)));
}

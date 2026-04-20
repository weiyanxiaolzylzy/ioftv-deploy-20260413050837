var fs = require('fs');
var acorn = require('./server/node_modules/acorn');

var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');

try {
    acorn.parse(text, {ecmaVersion: 2020, sourceType: 'script'});
    console.log('Valid!');
} catch(e) {
    console.log('Error at pos:', e.pos);
    console.log('Context:', JSON.stringify(text.slice(Math.max(0, e.pos-40), e.pos+40)));
}

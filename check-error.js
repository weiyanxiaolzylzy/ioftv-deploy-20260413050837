var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var text = buf.toString('latin1');
console.log('Length:', text.length);

// Use acorn to find the exact error
try {
    var acorn = require('D:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
    var ast = acorn.parse(text, {ecmaVersion: 2020, sourceType: 'script'});
    console.log('Parsed successfully!');
} catch(e) {
    console.log('Error at pos:', e.pos);
    console.log('Context:', JSON.stringify(text.slice(Math.max(0, e.pos-50), e.pos+50)));
}

var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var text = buf.toString('utf8');
console.log('Text length:', text.length);
try {
    new Function(text);
    console.log('VALID JS!');
} catch(e) {
    console.log('Error:', e.message);
}

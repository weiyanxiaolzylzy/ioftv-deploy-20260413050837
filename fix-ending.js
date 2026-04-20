var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Original length:', buf.length);

// Add missing ending
var fixed = Buffer.concat([buf, Buffer.from(']);')]);
console.log('Fixed length:', fixed.length);

fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', fixed);

var text = fixed.toString('latin1');
try {
    new Function(text);
    console.log('VALID JS!');
} catch(e) {
    console.log('Error:', e.message);
}

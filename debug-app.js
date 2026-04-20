var fs = require('fs');
var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/app.3deb2a0f040de4b2cc6c.js', 'utf8');
var idx = text.indexOf('"project-ifc":1');
console.log('Around project-ifc:');
console.log(JSON.stringify(text.slice(idx - 500, idx + 500)));

var fs = require('fs');
var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/app.3deb2a0f040de4b2cc6c.js', 'utf8');

// Find the project-ifc route component definition
var idx = text.indexOf('n.bind(null,"2b00")');
console.log('2b00 context:', JSON.stringify(text.slice(idx - 200, idx + 200)));

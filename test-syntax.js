var vm = require('vm');
var fs = require('fs');
var code = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');
try {
    new vm.Script(code, { filename: 'project-ifc.js' });
    console.log('Valid!');
} catch(e) {
    console.log('Error:', e.message);
    if (e.lineNumber) console.log('Line:', e.lineNumber, 'Col:', e.column);
}

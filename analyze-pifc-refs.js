var fs = require('fs');
var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/app.3deb2a0f040de4b2cc6c.js', 'utf8');

// Find all occurrences of "project-ifc"
var idx = 0;
while ((idx = text.indexOf('project-ifc', idx)) !== -1) {
  console.log('At ' + idx + ': ' + JSON.stringify(text.slice(idx - 20, idx + 200)));
  console.log('---');
  idx++;
}

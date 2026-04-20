var fs = require('fs');
var files = [
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/LSD.bighome.0693d7eae3642f7e93a4.js',
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/LSD.bighome.518e6ac5429a1c91ba4c.js',
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/LSD.bighome.d5d84c1fbc2d0bab5346.js',
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/LSD.bighome.e061535dd3b7c2e2195b.js',
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/secondview.0693d7eae3642f7e93a4.js',
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/secondview.518e6ac5429a1c91ba4c.js'
];
files.forEach(function(f) {
  var text = fs.readFileSync(f, 'utf8');
  var hasPifp = text.includes('批量指派') || text.includes('ProjectIfcPage') || text.includes('projectIfcPage');
  console.log(f.split('/').pop() + ': hasPifp=' + hasPifp + ', len=' + text.length);
  if (hasPifp) {
    var idx = text.indexOf('批量指派');
    if (idx === -1) idx = text.indexOf('ProjectIfcPage');
    if (idx === -1) idx = text.indexOf('projectIfcPage');
    console.log('  Context: ' + JSON.stringify(text.slice(Math.max(0,idx-50), idx+50)));
  }
});

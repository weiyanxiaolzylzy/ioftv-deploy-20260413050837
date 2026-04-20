var fs = require('fs');
var files = [
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/app.0693d7eae3642f7e93a4.js',
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/app.518e6ac5429a1c91ba4c.js',
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/app.d5d84c1fbc2d0bab5346.js',
  'D:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js/app.e061535dd3b7c2e2195b.js'
];
files.forEach(function(f) {
  var text = fs.readFileSync(f, 'utf8');
  var matches = text.match(/"project-ifc":\d+/g);
  console.log(f.split('/').pop() + ' refs: ' + (matches ? matches.join(', ') : 'none'));
});

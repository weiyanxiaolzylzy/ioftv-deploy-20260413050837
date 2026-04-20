var fs = require('fs');
function findFiles(dir, ext, files) {
  try {
    var list = fs.readdirSync(dir);
    for (var i = 0; i < list.length; i++) {
      var p = dir + '/' + list[i];
      try {
        var stat = fs.statSync(p);
        if (stat.isDirectory() && !p.includes('node_modules') && !p.includes('.git') && !p.includes('dist')) {
          findFiles(p, ext, files);
        } else if (p.endsWith(ext)) {
          files.push(p);
        }
      } catch (e) {}
    }
  } catch (e) {}
}
var files = [];
findFiles('D:/Roaming/ioftv-deploy-20260413050837', '.js', files);
var filtered = files.filter(function(f) {
  return !f.includes('dist') && !f.includes('node_modules') && !f.includes('.git') && !f.includes('terminals') && !f.includes('agent-transcripts');
});
console.log(filtered.join('\n'));

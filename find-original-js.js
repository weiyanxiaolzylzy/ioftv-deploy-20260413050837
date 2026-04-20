var fs = require('fs');
var path = require('path');
function findFiles(dir, ext, files) {
  try {
    var list = fs.readdirSync(dir);
    for (var i = 0; i < list.length; i++) {
      var p = path.join(dir, list[i]);
      try {
        var stat = fs.statSync(p);
        if (stat.isDirectory()) {
          findFiles(p, ext, files);
        } else if (p.endsWith(ext)) {
          files.push(p);
        }
      } catch (e) {}
    }
  } catch (e) {}
}
var files = [];
findFiles('D:/Roaming/ioftv-deploy-20260413050837/dist/original', '.js', files);
console.log(files.join('\n'));

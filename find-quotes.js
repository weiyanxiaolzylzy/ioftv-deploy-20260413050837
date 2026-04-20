var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var latin1 = buf.toString('latin1');

// Find all positions with double quotes
var positions = [];
for (var i = 1; i < latin1.length; i++) {
    if (latin1[i] === '"' && latin1[i-1] === '"') {
        positions.push(i);
    }
}
console.log('Double quote positions:', positions.length);
if (positions.length > 0) {
    for (var j = 0; j < Math.min(positions.length, 5); j++) {
        var p = positions[j];
        console.log('At', p, ':', JSON.stringify(latin1.slice(Math.max(0,p-20), p+20)));
    }
}

// Also check for problematic patterns like "" inside strings
var tripleQuote = /"""/g;
var matches = latin1.match(tripleQuote);
console.log('Triple quotes:', matches ? matches.length : 0);

// Check for the specific pattern in templates
var pos = latin1.indexOf('项目管理');
if (pos > 0) {
    console.log('Context around 项目管理:', JSON.stringify(latin1.slice(pos-50, pos+50)));
}

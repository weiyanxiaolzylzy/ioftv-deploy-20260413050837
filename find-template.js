var fs = require('fs');
var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');
var pos = text.indexOf('${');
console.log('First template literal at:', pos);
if (pos > 0) {
    console.log('Context:', JSON.stringify(text.slice(pos-20, pos+50)));
}

// Find ALL template literals
var positions = [];
for (var i = 0; i < text.length; i++) {
    if (text[i] === '$' && text[i+1] === '{') {
        positions.push(i);
    }
}
console.log('Total template literals:', positions.length);
if (positions.length > 0) {
    for (var j = 0; j < Math.min(positions.length, 5); j++) {
        console.log('At', positions[j], ':', JSON.stringify(text.slice(positions[j], positions[j]+30)));
    }
}

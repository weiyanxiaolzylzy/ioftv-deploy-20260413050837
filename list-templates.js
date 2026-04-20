var fs = require('fs');
var Iconv = require('./server/node_modules/iconv-lite');

var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var text = Iconv.decode(buf, 'gbk');

// Find all template literal contents
var inTemplate = false;
var templateStart = -1;
var templates = [];

for (var i = 0; i < text.length; i++) {
    if (text[i] === '`' && (i === 0 || text[i-1] !== '\\')) {
        if (!inTemplate) {
            inTemplate = true;
            templateStart = i;
        } else {
            templates.push(text.slice(templateStart, i + 1));
            inTemplate = false;
        }
    }
}

console.log('Found', templates.length, 'template literals');
for (var j = 0; j < templates.length; j++) {
    console.log('Template', j + 1, ':', JSON.stringify(templates[j]));
}

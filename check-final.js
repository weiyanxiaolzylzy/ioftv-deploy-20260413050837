var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var text = buf.toString('utf8');
console.log('Length:', text.length);

try {
    var acorn = require('D:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
    var ast = acorn.parse(text, {ecmaVersion: 2020, sourceType: 'script'});
    console.log('Valid!');
} catch(e) {
    console.log('Error at pos:', e.pos);
    console.log('Context:', JSON.stringify(text.slice(Math.max(0, e.pos-30), e.pos+30)));
}

// Let's also try looking for template literal issues
var hasTemplateLiteral = text.includes('${');
console.log('Has template literals:', hasTemplateLiteral);

// Find the actual issue by looking at the webpack structure
var webpackMatch = text.match(/^\(window\.webpackJsonp=window\.webpackJsonp\|\|\[\]\)\.push\(\[\[([^,\]]+)/);
console.log('Chunk ID:', webpackMatch ? webpackMatch[1] : 'not found');

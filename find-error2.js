var fs = require('fs');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var latin1 = buf.toString('latin1');

// Wrap it to simulate webpack context
var wrapped = '(function(window){' + latin1 + '})(window);';
try {
    new Function(wrapped);
    console.log('Wrapped version valid!');
} catch(e) {
    console.log('Wrapped error:', e.message);
}

// Try extracting just the template function
var templateMatch = latin1.match(/function\(\)\{var t=this[^}]+}\)\}\)/);
if (templateMatch) {
    console.log('Template found at:', templateMatch.index);
}

// Try using acorn to get better error info
try {
    var acorn = require('D:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
    var ast = acorn.parse(latin1, {ecmaVersion: 2020, sourceType: 'script'});
    console.log('Parsed successfully with acorn!');
} catch(e) {
    console.log('Acorn error at pos:', e.pos);
    if (e.loc) console.log('Line:', e.loc.line, 'Col:', e.loc.column);
    console.log('Context:', JSON.stringify(latin1.slice(Math.max(0, e.pos-50), e.pos+50)));
}

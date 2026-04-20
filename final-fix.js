var fs = require('fs');
var Iconv = require('./server/node_modules/iconv-lite');
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Original length:', buf.length);

var text = Iconv.decode(buf, 'gb18030');
console.log('Decoded:', text.length);

var out = Iconv.encode(text, 'utf8');
console.log('Encoded:', out.length);

// Verify
var verify = out.toString('utf8');
console.log('Verify length:', verify.length);

try {
    new Function(verify);
    console.log('VALID JS!');
} catch(e) {
    console.log('Error:', e.message);
    // Use acorn for better error location
    var acorn = require('./server/node_modules/acorn');
    try {
        acorn.parse(verify, {ecmaVersion: 2020, sourceType: 'script'});
    } catch(e2) {
        console.log('Acorn error at:', e2.pos);
        console.log('Context:', JSON.stringify(verify.slice(Math.max(0, e2.pos-30), e2.pos+30)));
    }
}

// Save
fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', out);
console.log('Saved!');

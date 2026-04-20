var fs = require('fs');
var Iconv = require('./server/node_modules/iconv-lite');

var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var text = Iconv.decode(buf, 'gbk');

console.log('Original length:', text.length);

// Find all backtick positions
var backticks = [];
for (var i = 0; i < text.length; i++) {
    if (text[i] === '`') backticks.push(i);
}
console.log('Backticks found:', backticks.length);

// Simple regex replacement
var fixed = text
    // Replace template literals with simple string concatenation
    .replace(/`\$\{t\.getFullYear\(\)\}-\$\{e\}-\$\{s\}`/g, 't.getFullYear()+"-"+e+"-"+s')
    .replace(/`\$\{t\.startsWith\("\/"\)\?t:"\/"\+t\}`/g, 't.startsWith("/")?t:"/"+t')
    .replace(/`\/api\/projects\/\$\{t\.id\}\/components\/batch-assign`/g, '"/api/projects/"+t.id+"/components/batch-assign"')
    .replace(/`\/api\/projects\/\$\{String\(t\.id\)\}\/components\/batch-assign`/g, '"/api/projects/"+String(t.id)+"/components/batch-assign"')
    .replace(/`\$\{window\.location\.origin\}\$\{t\.startsWith\("\/"\)\?t:"\/"\+t\}`/g, 'window.location.origin+(t.startsWith("/")?t:"/"+t)')
    .replace(/`\$\{t\.id\}`/g, '"+t.id+"');

console.log('After replacement:', fixed.length);

// Write as UTF-8
var out = Buffer.from(fixed, 'utf8');
console.log('Output:', out.length);

// Verify
try {
    new Function(out.toString('utf8'));
    console.log('VALID JS!');
} catch(e) {
    console.log('Error:', e.message);
}

// Save
fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', out);
console.log('Saved!');

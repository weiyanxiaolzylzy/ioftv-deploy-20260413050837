var fs = require('fs');
var Iconv = require('./server/node_modules/iconv-lite');

// Read original
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');

// Decode as GBK
var text = Iconv.decode(buf, 'gbk');
console.log('Decoded length:', text.length);

// Find all template literals and their positions
var templatePositions = [];
for (var i = 0; i < text.length; i++) {
    if (text[i] === '`') {
        templatePositions.push(i);
    }
}
console.log('Backtick positions:', templatePositions.length);

// If we have template literals, replace them
if (templatePositions.length > 0) {
    // Simple approach: replace backtick pairs with single quotes
    var result = '';
    var i = 0;
    while (i < text.length) {
        if (text[i] === '`') {
            // Find matching closing backtick
            var j = i + 1;
            var depth = 1;
            while (j < text.length && depth > 0) {
                if (text[j] === '`' && (j === i + 1 || text[j-1] !== '\\')) {
                    depth--;
                    if (depth === 0) break;
                }
                j++;
            }
            // Extract content between backticks
            var content = text.slice(i + 1, j);
            // Replace template expressions with empty strings (they won't work anyway without proper escaping)
            content = content.replace(/\$\{[^}]+\}/g, '');
            // Replace with single quotes
            result += "'" + content + "'";
            i = j + 1;
        } else {
            result += text[i];
            i++;
        }
    }
    text = result;
    console.log('After template replacement:', text.length);
}

// Write as UTF-8
var out = Buffer.from(text, 'utf8');
console.log('Output length:', out.length);

// Verify
var verifyText = out.toString('utf8');
try {
    new Function(verifyText);
    console.log('VALID JS!');
} catch(e) {
    console.log('Error:', e.message);
}

// Save
fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', out);
console.log('Saved!');

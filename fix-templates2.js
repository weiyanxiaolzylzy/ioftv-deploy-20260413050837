var fs = require('fs');
var Iconv = require('./server/node_modules/iconv-lite');

var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var text = Iconv.decode(buf, 'gbk');

// Replace template literals with proper string concatenation
// Pattern: `prefix${expr}suffix` -> '"+("+expr+")+"suffix"'
// Or simpler: `text` -> '"text"' for static strings

function replaceTemplate(str) {
    var result = '';
    var i = 0;
    while (i < str.length) {
        if (str[i] === '`') {
            // Start of template literal
            var j = i + 1;
            var parts = [];
            var current = '';
            while (j < str.length) {
                if (str[j] === '\\' && j + 1 < str.length) {
                    // Escape sequence
                    current += str[j] + str[j + 1];
                    j += 2;
                } else if (str[j] === '$' && j + 1 < str.length && str[j + 1] === '{') {
                    // Template expression
                    if (current) {
                        parts.push({type: 'text', value: current});
                        current = '';
                    }
                    var k = j + 2;
                    var depth = 1;
                    while (k < str.length && depth > 0) {
                        if (str[k] === '{') depth++;
                        else if (str[k] === '}') depth--;
                        k++;
                    }
                    var expr = str.slice(j + 2, k - 1);
                    parts.push({type: 'expr', value: expr});
                    j = k;
                } else if (str[j] === '`') {
                    // End of template literal
                    if (current) {
                        parts.push({type: 'text', value: current});
                    }
                    j++;
                    break;
                } else {
                    current += str[j];
                    j++;
                }
            }
            
            // Build the replacement
            if (parts.length === 1 && parts[0].type === 'text') {
                // Static string: `hello` -> '"hello"'
                result += '"' + parts[0].value + '"';
            } else {
                // Has expressions: `a${x}b` -> '"+("+x+")+"b"'
                result += '"';
                for (var p = 0; p < parts.length; p++) {
                    if (parts[p].type === 'text') {
                        result += parts[p].value;
                    } else {
                        result += '"+(' + parts[p].value + ')+"';
                    }
                }
                result += '"';
            }
            i = j;
        } else {
            result += str[i];
            i++;
        }
    }
    return result;
}

var fixed = replaceTemplate(text);
console.log('Fixed length:', fixed.length);

// Write as UTF-8
var out = Buffer.from(fixed, 'utf8');
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

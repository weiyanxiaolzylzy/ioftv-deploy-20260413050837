var fs = require('fs');
var acorn_path = 'd:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js';

var content = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'latin1');
console.log('File size:', content.length);

var acorn = require(acorn_path);

function parseWithLine(content) {
    try {
        var result = acorn.parse(content, { ecmaVersion: 2020, sourceType: 'script', onComment: [] });
        return { success: true };
    } catch(e) {
        return { success: false, pos: e.pos, message: e.message };
    }
}

var result = parseWithLine(content);
if (!result.success) {
    console.log('Parse error at position:', result.pos);
    var pos = result.pos;
    
    // Show lines around the error
    var lines = content.split('\n');
    var charCount = 0;
    var lineNum = 0;
    for (var i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= pos) {
            lineNum = i + 1;
            break;
        }
        charCount += lines[i].length + 1;
    }
    
    console.log('Line number:', lineNum);
    console.log('Error message:', result.message);
    console.log('\nLine ' + lineNum + ':');
    console.log(content.split('\n')[lineNum - 1]);
    
    // Also show the exact byte at error position
    console.log('\nByte at error:', content.charCodeAt(pos), '(char:', JSON.stringify(content.charAt(pos)), ')');
    console.log('Context:', JSON.stringify(content.substring(Math.max(0,pos-50), pos+50)));
}

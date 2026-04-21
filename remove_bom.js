var fs = require('fs');

// Read the current file
var disk = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Current size:', disk.length, 'bytes');
console.log('First 5 bytes hex:', disk.slice(0, 5).toString('hex'));

// Check for UTF-8 BOM (EF BB BF)
if (disk[0] === 0xEF && disk[1] === 0xBB && disk[2] === 0xBF) {
    console.log('Found UTF-8 BOM at start - removing...');
    var stripped = disk.slice(3);
    console.log('Stripped size:', stripped.length, 'bytes');
    
    // Write stripped version
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', stripped);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', stripped);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', stripped);
    
    // Verify
    var verify = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
    console.log('\nVerify - New size:', verify.length, 'bytes');
    console.log('First 10 bytes hex:', verify.slice(0, 10).toString('hex'));
    console.log('First char:', JSON.stringify(String.fromCharCode(verify[0])));
    
    // Check string
    var str = verify.toString('utf8');
    console.log('String length:', str.length);
    
    // Check brackets (skip any remaining BOM)
    var startIdx = str.charCodeAt(0) === 0xFEFF ? 1 : 0;
    var b=0, br=0, p=0;
    for (var i = startIdx; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c === 123) b++;
        else if (c === 125) b--;
        else if (c === 91) br++;
        else if (c === 93) br--;
        else if (c === 40) p++;
        else if (c === 41) p--;
    }
    console.log('Brackets: b=' + b + ' br=' + br + ' p=' + p);
    
    // Check at position 16675
    var actualPos = str.length > 16675 ? 16675 : str.length - 10;
    console.log('\nChar at', actualPos + ':', JSON.stringify(str.charAt(actualPos)));
    console.log('Context:', JSON.stringify(str.slice(Math.max(0, actualPos - 25), actualPos + 25)));
    
    // Check start and end
    console.log('\nStarts:', str.slice(startIdx, startIdx + 60));
    console.log('Ends:', JSON.stringify(str.slice(-20)));
    
    // Check for corruption
    var has17aa = str.indexOf('"17aa":function(t,e,s){"use strict";s("8920")}') >= 0;
    console.log('\nHas 17aa stub:', has17aa);
    var bt = (str.match(/\x60/g) || []).length;
    console.log('Backticks:', bt);
} else {
    console.log('No BOM found. File starts with:', disk.slice(0, 5).toString('hex'));
}

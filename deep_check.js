var http = require('http');
var fs = require('fs');
var cp = require('child_process');
var path = require('path');

// Step 1: Get git original file
var gitBinPath = path.join(process.env.TEMP || 'C:\\Users\\weiyanxiao\\AppData\\Local\\Temp', 'git_orig2.bin');

// Check if it already exists
if (!fs.existsSync(gitBinPath)) {
    console.log('Fetching git original...');
    cp.execSync('git show HEAD:dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js > "' + gitBinPath + '"', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'});
    console.log('Done. Size:', fs.statSync(gitBinPath).size);
}

var gitBin = fs.readFileSync(gitBinPath);
console.log('Git binary size:', gitBin.length, 'bytes');
console.log('First 4 bytes hex:', gitBin.slice(0, 4).toString('hex'));

// The file is UTF-16 LE encoded (fffe = LE BOM)
// When Node reads it as 'utf16le', it treats ff fe as regular chars, not BOM
// The actual content starts at byte 2 (after ff fe), and the BOM char (0xFEFF) is included
// as the first character in the string

// Let's decode properly: bytes 0-1 are the UTF-16 LE BOM (FF FE)
// After that, each pair of bytes is a character
var str16 = gitBin.toString('utf16le');
console.log('UTF-16 LE string length:', str16.length);
console.log('First char code:', str16.charCodeAt(0), '(0xFEFF =', 0xFEFF, ')');

// Skip the BOM character (U+FEFF)
var content = str16.charCodeAt(0) === 0xFEFF ? str16.slice(1) : str16;
console.log('Content string length (no BOM):', content.length);
console.log('Starts:', content.slice(0, 70));

// Check brackets
var b=0, br=0, p=0;
for (var i = 0; i < content.length; i++) {
    var cc = content.charCodeAt(i);
    if (cc === 123) b++;
    else if (cc === 125) b--;
    else if (cc === 91) br++;
    else if (cc === 93) br--;
    else if (cc === 40) p++;
    else if (cc === 41) p--;
}
console.log('\nUTF-16 LE content brackets: b=' + b + ' br=' + br + ' p=' + p);

// Position 16675
console.log('\nChar at 16675:', JSON.stringify(content.charAt(16675)));
console.log('Context:', JSON.stringify(content.slice(16650, 16700)));
console.log('Ends:', JSON.stringify(content.slice(-20)));

// Check for backticks and 17aa stub
var has17aa = content.indexOf('"17aa":function(t,e,s){"use strict";s("8920")}') >= 0;
var bt = (content.match(/\x60/g) || []).length;
console.log('\nHas 17aa stub:', has17aa);
console.log('Backticks:', bt);

// Now check what the server currently serves
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        var str = buf.toString('utf8');
        console.log('\n=== Server Response ===');
        console.log('Served bytes:', buf.length, '| String length:', str.length);
        console.log('Server char at 16675:', JSON.stringify(str.charAt(16675)));
        console.log('Server context:', JSON.stringify(str.slice(16650, 16700)));
        console.log('Server ends:', JSON.stringify(str.slice(-20)));
        
        // Brackets
        b=0; br=0; p=0;
        for (var i = 0; i < str.length; i++) {
            var cc = str.charCodeAt(i);
            if (cc === 123) b++;
            else if (cc === 125) b--;
            else if (cc === 91) br++;
            else if (cc === 93) br--;
            else if (cc === 40) p++;
            else if (cc === 41) p--;
        }
        console.log('Server brackets: b=' + b + ' br=' + br + ' p=' + p);
        
        // Compare with UTF-16 LE content
        console.log('\nDoes server match UTF-16 LE content?');
        console.log('Same length:', str.length === content.length ? 'YES' : 'NO - server=' + str.length + ' expected=' + content.length);
        if (str.length === content.length) {
            var same = true;
            for (var i = 0; i < Math.min(str.length, 16700); i++) {
                if (str.charAt(i) !== content.charAt(i)) {
                    same = false;
                    console.log('First diff at pos', i, ': server=' + JSON.stringify(str.charAt(i)) + ' expected=' + JSON.stringify(content.charAt(i)));
                    break;
                }
            }
            if (same) console.log('First 16700 chars: EXACT MATCH');
        }
    });
});

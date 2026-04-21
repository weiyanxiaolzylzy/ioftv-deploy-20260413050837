var fs = require('fs');
var cp = require('child_process');
var path = require('path');

var tmpPath = path.join(process.env.TEMP || 'C:\\Users\\weiyanxiao\\AppData\\Local\\Temp', 'git_clean.bin');
var cwd = 'd:/Roaming/ioftv-deploy-20260413050837';

// Fetch git HEAD version
console.log('Fetching git HEAD version...');
try {
    cp.execSync('git show HEAD:dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js > "' + tmpPath + '"', {cwd: cwd});
} catch(e) {
    console.log('Failed:', e.message);
    process.exit(1);
}

var gitBuf = fs.readFileSync(tmpPath);
console.log('Git HEAD size:', gitBuf.length, 'bytes');
console.log('First 20 bytes:', gitBuf.slice(0, 20).toString('hex'));

// Verify it's clean UTF-8
var str = gitBuf.toString('utf8');
console.log('String length:', str.length);
console.log('First char:', JSON.stringify(str[0]), '(code:', str.charCodeAt(0), ')');

// Check bracket balance
var b=0, br=0, p=0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 123) b++;
    else if (c === 125) b--;
    else if (c === 91) br++;
    else if (c === 93) br--;
    else if (c === 40) p++;
    else if (c === 41) p--;
}
console.log('Brackets: b=' + b + ' br=' + br + ' p=' + p);

// Check corruption
var has17aa = str.indexOf('"17aa":function(t,e,s){"use strict";s("8920")}') >= 0;
console.log('Has 17aa stub:', has17aa);
var bt = (str.match(/\x60/g) || []).length;
console.log('Backticks:', bt);
var nullChars = (str.match(/\x00/g) || []).length;
console.log('Null chars:', nullChars);

// Check start and end
console.log('\nStarts:', str.slice(0, 70));
console.log('Ends:', JSON.stringify(str.slice(-20)));

// Check error positions
if (str.length > 16675) {
    console.log('\nChar at 16675:', JSON.stringify(str.charAt(16675)));
    console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
}
if (str.length > 16275) {
    console.log('Char at 16275:', JSON.stringify(str.charAt(16275)));
    console.log('Context:', JSON.stringify(str.slice(16250, 16300)));
}

// Key content
console.log('\nHas AdvancedIfcViewer:', str.indexOf('AdvancedIfcViewer') >= 0);
console.log('Has routeProjectId:', str.indexOf('routeProjectId') >= 0);
console.log('Has webpackJsonp.push:', str.indexOf('webpackJsonp.push') >= 0);

// Save to all three locations
var target1 = cwd + '/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
var target2 = cwd + '/dist/static/js/project-ifc.1063e5d0b18f28247f69.js';
var beifen = cwd + '/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';

fs.writeFileSync(target1, gitBuf);
console.log('\nSaved to:', target1.split('/').pop());

fs.writeFileSync(target2, gitBuf);
console.log('Saved to:', target2.split('/').pop());

fs.writeFileSync(beifen, gitBuf);
console.log('Updated beifen:', beifen.split('/').pop());

// Verify
var verify = fs.readFileSync(target1);
var vstr = verify.toString('utf8');
console.log('\n=== Verification ===');
console.log('Size:', verify.length, 'bytes');
console.log('String:', vstr.length, 'chars');
b=0; br=0; p=0;
for (var i = 0; i < vstr.length; i++) {
    var c = vstr.charCodeAt(i);
    if (c === 123) b++;
    else if (c === 125) b--;
    else if (c === 91) br++;
    else if (c === 93) br--;
    else if (c === 40) p++;
    else if (c === 41) p--;
}
console.log('Brackets: b=' + b + ' br=' + br + ' p=' + p);
console.log('First 5 bytes:', verify.slice(0, 5).toString('hex'));
console.log('Ends:', JSON.stringify(vstr.slice(-15)));

// Clean up
try { fs.unlinkSync(tmpPath); } catch(e) {}

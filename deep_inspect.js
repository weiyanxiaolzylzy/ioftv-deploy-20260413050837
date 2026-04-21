const fs = require('fs');

// Get exact byte content at the end of each file
const files = [
    'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js',
    'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js',
    'd:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js'
];

for (const fp of files) {
    const buf = fs.readFileSync(fp);
    const len = buf.length;
    console.log('\n=== ' + fp.split('/').pop() + ' ===');
    console.log('File size:', len, 'bytes');
    console.log('Last 30 bytes (hex):', buf.slice(-30).toString('hex'));
    console.log('Last 30 bytes (ascii):', buf.slice(-30).toString('ascii').replace(/[^\x20-\x7e]/g, '?'));
    console.log('Last 30 bytes (chars):', buf.slice(-30).toString('utf8').split('').map(c => c.charCodeAt(0)).join(' '));
}

// Now let's figure out the correct webpack chunk structure.
// The webpack chunk format is:
// (function(window) { window.webpackJsonp = ... }) 
// But looking at our chunk, it's:
// (window.webpackJsonp=window.webpackJsonp||[]).push([["chunk-name"],{...}]);
// 
// The outer webpack runtime does: webpackJsonpCallback(data) { window.webpackJsonp.push = function() { ... for each chunk ... } }
// Then our chunk calls: window.webpackJsonp.push([["name"],{...}])
// 
// Let's count brackets in the WHOLE file to find what's missing.

console.log('\n\n=== Bracket analysis ===');
for (const fp of files) {
    const buf = fs.readFileSync(fp);
    const content = buf.toString('utf8');
    
    let braces = 0, brackets = 0, parens = 0;
    let maxBraces = 0, maxBrackets = 0, maxParens = 0;
    let pos = 0;
    let openBracePos = -1;
    
    for (let i = 0; i < content.length; i++) {
        const c = content[i];
        if (c === '{') { braces++; if (braces > maxBraces) { maxBraces = braces; openBracePos = i; } }
        else if (c === '}') braces--;
        else if (c === '[') { brackets++; if (brackets > maxBrackets) maxBrackets = brackets; }
        else if (c === ']') brackets--;
        else if (c === '(') parens++;
        else if (c === ')') parens--;
    }
    
    console.log('\n' + fp.split('/').pop() + ':');
    console.log('  Final: braces=' + braces + ' brackets=' + brackets + ' parens=' + parens);
    console.log('  Max: braces=' + maxBraces + ' brackets=' + maxBrackets + ' parens=' + maxParens);
    console.log('  Max brace at:', openBracePos);
    if (openBracePos >= 0) {
        console.log('  Context:', JSON.stringify(content.slice(openBracePos, openBracePos + 50)));
    }
}

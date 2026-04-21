var fs = require('fs');

var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
var buf = fs.readFileSync(target);
var str = buf.toString('utf8');

console.log('=== Disk File Analysis ===');
console.log('File size:', buf.length, 'bytes');
console.log('String length:', str.length, 'chars');
console.log('First 10 bytes:', buf.slice(0, 10).toString('hex'));
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

// Check for corruption patterns
console.log('\n=== Corruption Checks ===');
var has17aa = str.indexOf('"17aa":function(t,e,s){"use strict";s("8920")}') >= 0;
console.log('Has 17aa stub:', has17aa);
var hasBackticks = (str.match(/\x60/g) || []).length;
console.log('Backticks:', hasBackticks);
var nullChars = (str.match(/\x00/g) || []).length;
console.log('Null chars:', nullChars);

// Check position 16675 (error location)
console.log('\n=== Error Position Analysis ===');
if (str.length > 16675) {
    console.log('Char at 16675:', JSON.stringify(str.charAt(16675)));
    console.log('Context 16650-16700:', JSON.stringify(str.slice(16650, 16700)));
} else {
    console.log('File is shorter than 16675! Length:', str.length);
}

// Also check position 16275 (the other error)
if (str.length > 16275) {
    console.log('\nChar at 16275:', JSON.stringify(str.charAt(16275)));
    console.log('Context 16250-16300:', JSON.stringify(str.slice(16250, 16300)));
}

// Check start and end
console.log('\n=== Structure ===');
console.log('Start:', str.slice(0, 70));
console.log('End:', JSON.stringify(str.slice(-20)));

// Key content checks
console.log('\n=== Key Content ===');
console.log('Has AdvancedIfcViewer:', str.indexOf('AdvancedIfcViewer') >= 0);
console.log('Has routeProjectId:', str.indexOf('routeProjectId') >= 0);
console.log('Has project-ifc chunk name:', str.indexOf('project-ifc') >= 0);
console.log('Starts with webpackJsonp.push:', str.indexOf('webpackJsonp.push') >= 0);

// Check the webpack chunk structure - find the array and object
var arrStart = str.indexOf('.push([["project-ifc"');
if (arrStart >= 0) {
    console.log('Chunk array start found at:', arrStart);
}

// Find the closing of the webpack chunk
// The file should end with }]);\r\n or something similar
var lastChars = str.slice(-30);
console.log('Last 30 chars:', JSON.stringify(lastChars));

// Verify the file is valid JS by checking if we can find the matching brackets
// Count from the .push( opening
var pushIdx = str.indexOf('.push([[');
if (pushIdx >= 0) {
    // Start counting from after .push(
    var parenDepth = 0;
    var inString = false;
    var stringChar = '';
    for (var i = pushIdx + 5; i < str.length; i++) {
        var c = str[i];
        if (!inString) {
            if (c === '"' || c === "'" || c === '`') {
                inString = true;
                stringChar = c;
            } else if (c === '(') {
                parenDepth++;
            } else if (c === ')') {
                parenDepth--;
                if (parenDepth === 0) {
                    console.log('\nMatching ) found at:', i, '| Context:', JSON.stringify(str.slice(i - 10, i + 10)));
                    break;
                }
            }
        } else {
            if (c === stringChar && str[i-1] !== '\\') {
                inString = false;
            }
        }
    }
    if (parenDepth !== 0) {
        console.log('WARNING: No matching ) found for .push()');
    }
}

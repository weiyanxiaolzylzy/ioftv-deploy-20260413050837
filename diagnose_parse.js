var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js');

var content = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'latin1');

function testParse(code) {
    try {
        acorn.parse(code, { ecmaVersion: 2020, sourceType: 'script' });
        return { ok: true };
    } catch(e) {
        return { ok: false, pos: e.pos, msg: e.message };
    }
}

// Find the webpackJsonp structure
// (window.webpackJsonp=window.webpackJsonp||[]).push([["project-ifc"],{...}])

// Binary search for exact error location
var lo = 0, hi = content.length;
var lastOk = 0;

while (lo < hi) {
    var mid = Math.floor((lo + hi + 1) / 2);
    var result = testParse(content.substring(0, mid));
    if (result.ok) {
        lastOk = mid;
        lo = mid;
    } else {
        hi = mid - 1;
    }
}

console.log('Max parseable prefix length: ' + lastOk);
console.log('First unparseable: ' + (lastOk + 1));

// Show context around the boundary
var ctxStart = Math.max(0, lastOk - 100);
var ctxEnd = Math.min(content.length, lastOk + 100);
console.log('\nContext around error boundary:');
console.log(JSON.stringify(content.substring(ctxStart, ctxEnd)));

// Now test progressively larger chunks around the webpackJsonp structure
// Find the push( and try to parse in chunks
var pushIdx = content.indexOf('.push(');
console.log('\nAnalyzing from push( at ' + pushIdx);

// Test 1: just the webpackJsonp statement
var webpackStmt = content.substring(0, pushIdx + 6); // include .push(
console.log('\nTest 1 (up to .push(): ' + webpackStmt.length + ' chars');
var r1 = testParse(webpackStmt);
console.log('Result: ' + (r1.ok ? 'OK' : 'FAIL at ' + r1.pos));

// Test 2: the push argument start
var pushArg = content.substring(0, pushIdx + 100);
console.log('\nTest 2 (up to .push([[): ' + pushArg.length + ' chars');
var r2 = testParse(pushArg);
console.log('Result: ' + (r2.ok ? 'OK' : 'FAIL at ' + r2.pos));

// Test 3: up to the first module
var firstMod = content.indexOf('"17aa":function');
if (firstMod === -1) firstMod = content.indexOf("'17aa':function");
console.log('\nFirst module at: ' + firstMod);
if (firstMod > 0) {
    var chunk3 = content.substring(0, firstMod + 100);
    console.log('Test 3 (up to first module + 100): ' + chunk3.length);
    var r3 = testParse(chunk3);
    console.log('Result: ' + (r3.ok ? 'OK' : 'FAIL at ' + r3.pos));
}

// Test 4: up to second module
var secMod = content.indexOf('"2b00":function');
if (secMod === -1) secMod = content.indexOf("'2b00':function");
console.log('\nSecond module at: ' + secMod);
if (secMod > 0) {
    var chunk4 = content.substring(0, secMod + 200);
    console.log('Test 4 (up to second module + 200): ' + chunk4.length);
    var r4 = testParse(chunk4);
    console.log('Result: ' + (r4.ok ? 'OK' : 'FAIL at ' + r4.pos));
}

// Test 5: just module 2b00
if (secMod > 0) {
    // Find the closing } of module 2b00
    var braceCount = 0;
    var started = false;
    var endPos = secMod;
    for (var i = secMod; i < content.length; i++) {
        if (content[i] === '{') { started = true; braceCount++; }
        else if (content[i] === '}') { braceCount--; }
        if (started && braceCount === 0) { endPos = i + 1; break; }
    }
    var module2 = content.substring(secMod, endPos);
    console.log('\nModule 2b00 length: ' + module2.length);
    var r5 = testParse(module2);
    console.log('Module 2b00: ' + (r5.ok ? 'OK' : 'FAIL at ' + r5.pos));
    if (!r5.ok) {
        // Binary search within module
        var lo2 = 0, hi2 = module2.length, lastOk2 = 0;
        while (lo2 < hi2) {
            var mid2 = Math.floor((lo2 + hi2 + 1) / 2);
            var r = testParse(module2.substring(0, mid2));
            if (r.ok) { lastOk2 = mid2; lo2 = mid2; }
            else { hi2 = mid2 - 1; }
        }
        console.log('Module 2b00 max parseable: ' + lastOk2 + ' / ' + module2.length);
        console.log('Module context: ' + JSON.stringify(module2.substring(Math.max(0,lastOk2-50), lastOk2+50)));
    }
}

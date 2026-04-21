var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

// Read the git HEAD restored file
var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

console.log('Size:', buf.length, 'bytes,', str.length, 'chars');
console.log('UTF-8 overhead:', buf.length - str.length, 'extra bytes');

// Try to find exact error
console.log('\n=== Acorn Error Analysis ===');
try {
    acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Parse: SUCCESS');
} catch(e) {
    console.log('Error at pos', e.pos, ':', e.message);
    console.log('Line:', e.loc.line, 'Col:', e.loc.column);
    var pos = e.pos;
    console.log('Context:', JSON.stringify(str.slice(Math.max(0, pos - 60), pos + 60)));
    
    // Show bytes around the error
    var beforeBytes = Buffer.byteLength(str.slice(0, pos), 'utf8');
    console.log('\nByte offset:', beforeBytes, '(before error char)');
    
    // Find what character is at the error position
    var c = str[pos];
    console.log('Char at pos', pos, ':', JSON.stringify(c), 'code:', c.charCodeAt(0));
    
    // The ! might be at pos or pos+1
    if (str[pos] === '!') {
        console.log('The "!" is at pos', pos);
    } else {
        console.log('The "!" is at pos', pos+1, '(char:', JSON.stringify(str[pos+1]), ')');
    }
    
    // Show broader context
    console.log('\nBroader context 16200-16400:');
    for (var i = 16200; i < Math.min(16400, str.length); i += 50) {
        console.log('  ' + i + ':', JSON.stringify(str.slice(i, i + 50)));
    }
    
    // Check: maybe it's inside a string literal
    // Look for the module this is in
    var pushStart = str.indexOf('.push([[');
    console.log('\n.push([[ found at:', pushStart);
    
    // The webpack chunk is: (window.webpackJsonp=...||[]).push([["project-ifc"],{...}])
    // Let's check if the error is inside a string by looking for quotes
    var inString = false;
    var stringChar = '';
    var lastClose = 0;
    for (var i = 0; i < pos + 50; i++) {
        var c = str[i];
        if (!inString) {
            if (c === '"' || c === "'" || c === '`') {
                inString = true;
                stringChar = c;
            }
        } else {
            if (c === stringChar && (i === 0 || str[i-1] !== '\\')) {
                inString = false;
                lastClose = i;
            }
        }
    }
    console.log('\nIn string at pos', pos, '?:', inString);
    console.log('Last string closed at:', lastClose);
    
    // If inside a string, what string?
    if (inString) {
        console.log('String started with:', stringChar);
        // Find where it started
        var si = lastClose + 1;
        while (si < str.length && (str[si] === ' ' || str[si] === ':' || str[si] === ',')) si++;
        console.log('Context around start:', JSON.stringify(str.slice(Math.max(0, si - 30), si + 30)));
    }
    
    // Check: is there a regex that starts with /?
    // Maybe the ! is being confused with a regex /!
    // Look for regex literals near the error
    console.log('\n=== Checking for Regex Issues ===');
    var reCtx = str.slice(Math.max(0, pos - 100), pos + 100);
    console.log('Near error context:', JSON.stringify(reCtx));
    
    // The error says "Unexpected token !" - in JS, ! is only unexpected if
    // the parser expects something different
    // Common causes:
    // 1. Unclosed expression before this point
    // 2. Missing operator
    // 3. Parser in wrong state
    
    // Let's check the char BEFORE the ! area
    var beforeExcl = pos > 0 ? str[pos-1] : '';
    console.log('\nChar before "!" area:', JSON.stringify(beforeExcl));
    
    // Count nesting depth at the error position
    var b=0, br=0, p=0;
    for (var i = 0; i < pos; i++) {
        var c = str.charCodeAt(i);
        if (c === 123) b++;
        else if (c === 125) b--;
        else if (c === 91) br++;
        else if (c === 93) br--;
        else if (c === 40) p++;
        else if (c === 41) p--;
    }
    console.log('Nesting at pos', pos, ': b=' + b + ' br=' + br + ' p=' + p);
    
    // The real test: check if maybe the error is that a string is unclosed
    // causing the parser to be "in string" mode
    // Let's look at the surrounding Chinese text more carefully
    console.log('\n=== Chinese Text Analysis ===');
    var atError = str.slice(16100, 16400);
    // Check for encoding issues - Chinese chars should be in valid UTF-8 ranges
    for (var i = 0; i < atError.length; i++) {
        var c = atError.charCodeAt(i);
        // Chinese UTF-8: U+4E00 to U+9FFF (CJK), U+3000 to U+303F, U+FF00 to U+FFEF
        if (c >= 0x4E00 && c <= 0x9FFF) {
            // Valid CJK range
        } else if (c >= 0x3000 && c <= 0x303F) {
            // CJK symbols
        } else if (c >= 0xFF00 && c <= 0xFFEF) {
            // Fullwidth
        } else if (c >= 0x80) {
            console.log('WARNING: Char at ' + (16100+i) + ' code ' + c + ' (0x' + c.toString(16) + ') might be invalid UTF-8!');
            console.log('Char:', JSON.stringify(atError[i]));
        }
    }
}

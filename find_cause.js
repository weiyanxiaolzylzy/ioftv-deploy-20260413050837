var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// The error is at position 16274, but the byte context shows valid JS around it
// This means the parser is in a weird state because something BEFORE is broken
// Let me check the entire context more carefully

var errorPos = 16274;

// Check what's around the error with more detail
console.log('Context 16200-16300:');
for (var i = 16200; i < 16300; i++) {
    var c = str[i];
    console.log(i + ': ' + JSON.stringify(c) + ' (code:' + str.charCodeAt(i) + ')');
}

// Now let me try to find the ACTUAL issue: maybe there's an unclosed string
// or regex somewhere earlier that's causing the parser to be confused

// Let's manually parse by tracking string literals, comments, regex
// to understand what the parser sees

console.log('\n=== Manual Tokenization (strings, comments, regex) ===');
var inString = false;
var stringChar = '';
var inComment = false;
var inRegex = false;
var lastToken = null;
var problems = [];

for (var i = 0; i < str.length; i++) {
    var c = str[i];
    var cc = str.charCodeAt(i);
    
    if (inComment) {
        if (c === '\n') inComment = false;
        continue;
    }
    
    if (!inString) {
        // Check for string start
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        }
        // Check for comment start
        else if (c === '/' && str[i+1] === '/') {
            inComment = true;
        }
        // Check for regex (after specific tokens)
        else if (c === '/' && !inString) {
            // Simple heuristic: regex after operators/open braces
            if (lastToken === null || 
                lastToken === ')' || lastToken === '(' ||
                lastToken === '[' || lastToken === '{' ||
                lastToken === '=' || lastToken === ',' ||
                lastToken === ':' || lastToken === '!' ||
                lastToken === '?' || lastToken === ';' ||
                lastToken === 'return' || lastToken === 'throw') {
                // Could be regex, check it
                inRegex = true;
            }
        }
        
        // Track last token
        if (c.trim() && !inString) {
            lastToken = c;
        }
    } else {
        // Inside string
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
    
    if (inRegex) {
        // Find end of regex
        var depth = 0;
        for (var j = i; j < str.length; j++) {
            var rc = str[j];
            if (rc === '\\') { j++; continue; }
            if (rc === '[') depth++;
            else if (rc === ']') depth--;
            else if (rc === '/' && depth === 0) {
                inRegex = false;
                i = j;
                break;
            } else if ((rc === '\n' || rc === '\r') && depth === 0) {
                problems.push({pos: i, type: 'regex-no-close', ctx: str.slice(Math.max(0,i-10), i+10)});
                inRegex = false;
                break;
            }
        }
    }
}

if (inString) {
    problems.push({pos: str.length, type: 'unclosed-string', char: stringChar});
}

// Also check for unclosed string at specific positions
// Let me re-scan for the problematic string more carefully
console.log('\n=== Scanning for unclosed strings ===');

// Find the Vue template string that should contain the Chinese text
// Vue render functions look like: t._v("some text")
// Let me find all t._v(" occurrences
var matches = [];
var searchStr = 't._v("';
var idx = str.indexOf(searchStr);
while (idx >= 0 && idx < errorPos + 500) {
    // Find the closing )
    var closeParen = -1;
    var depth = 0;
    for (var i = idx + searchStr.length; i < str.length; i++) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') {
            depth--;
            if (depth === -1) { closeParen = i; break; }
        }
    }
    
    // Find the closing quote of the string
    // Look for the matching " after the opening "
    var openQuote = idx + searchStr.length - 1; // position of "
    var stringStart = openQuote + 1;
    var stringEnd = -1;
    var sDepth = 0;
    for (var i = stringStart; i < str.length; i++) {
        var sc = str[i];
        if (sc === '\\') { i++; continue; }
        if (sc === '"' || sc === "'") {
            // Is this opening or closing?
            // A " is closing if we're not inside a template literal with ${...}
            // Actually, let's just count: if we're at depth 0 and it's a ", it's closing
            if (sDepth === 0 && sc === '"') {
                stringEnd = i;
                break;
            }
        }
        if (sc === '${') sDepth++;
        else if (sc === '}') sDepth--;
    }
    
    if (stringEnd >= 0) {
        matches.push({open: openQuote, close: stringEnd, len: stringEnd - stringStart});
        console.log('t._v string at ' + openQuote + ' closes at ' + stringEnd + ' (len=' + matches[matches.length-1].len + ')');
        console.log('  Content:', JSON.stringify(str.slice(stringStart, stringStart + 30)) + '...');
    } else {
        console.log('t._v string at ' + openQuote + ' NEVER CLOSES (starts at char ' + stringStart + ')');
        matches.push({open: openQuote, close: -1, len: -1});
    }
    
    idx = str.indexOf(searchStr, idx + 1);
}

// Check if any string extends past the error position
console.log('\nStrings that extend past error position 16274:');
for (var i = 0; i < matches.length; i++) {
    if (matches[i].close < 0 || matches[i].close > errorPos) {
        console.log('  String at', matches[i].open, 'extends to', matches[i].close);
    }
}

// Now, let me also check: maybe the issue is NOT the Chinese string
// Let me try a different approach: binary search to find the earliest position
// where acorn starts failing
console.log('\n=== Binary search for first error position ===');

// Test different lengths
var testLengths = [5000, 10000, 15000, 16000, 16200, 16250, 16270, 16273, 16274, 16275];
testLengths.forEach(function(len) {
    var testStr = str.slice(0, len);
    try {
        acorn.parse(testStr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('Length', len + ': SUCCESS');
    } catch(e) {
        console.log('Length', len + ': FAILED at', e.pos, '(in full string) =', len + e.pos - str.length);
    }
});

// Actually, the real way: use acorn's error recovery or tokenizer
// Let me try with acorn 8's tokenizer to see what happens
console.log('\n=== Acorn Tokenizer Analysis ===');
try {
    var acorn2 = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.mjs');
} catch(e) {}

// Try to use acorn's parser with tolerant mode or check what tokens exist
// Let me just print the raw tokens around position 16274
var Tokenizer = acorn.tokener || acorn.Parser || null;

// Actually, let me try the simplest thing: 
// wrap the code in an IIFE and parse as expression
console.log('\n=== Test: Parse as expression ===');
var wrapped = '(function(){' + str.slice(0, errorPos + 100) + '})()';
try {
    acorn.parse(wrapped, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Wrapped parse: SUCCESS');
} catch(e) {
    console.log('Wrapped parse FAILED at', e.pos, ':', e.message);
}

// Try: parse just up to the error position as a statement
var justBefore = str.slice(0, errorPos);
try {
    acorn.parse(justBefore, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Just-before parse: SUCCESS');
} catch(e2) {
    console.log('Just-before parse FAILED at', e2.pos, 'offset', e2.pos);
}

// Let's look at the context BEFORE the string that contains the Chinese text
// The Chinese string is in a Vue template render function
// The pattern is: [t._v("text") 
// Let me find what opens the array containing this string
console.log('\n=== Finding context around the Chinese string ===');
// Find the Chinese text position
var chinesePos = str.indexOf('请在大屏点击');
if (chinesePos < 0) {
    chinesePos = str.indexOf('请在大屏');
}
console.log('Chinese text at position:', chinesePos);

// Find the opening of this render function
// It's inside something like: render:function(t,e,s){...
// or the Vue component definition
// Let's look backwards from the Chinese text
var contextStart = Math.max(0, chinesePos - 200);
console.log('Context from', contextStart + ':');
console.log(str.slice(contextStart, chinesePos + 50));

// Find what MODULE this belongs to in the webpack chunk
// The webpack chunk maps IDs to functions
// Let me find the module boundaries
console.log('\n=== Module boundaries ===');
// Find all "ID":function patterns
var modulePattern = /"([0-9a-f]{4})":function\(/g;
var match;
var modules = [];
while ((match = modulePattern.exec(str)) !== null) {
    modules.push({pos: match.index, id: match[1]});
}
console.log('Found', modules.length, 'modules');

// Find which module contains the Chinese text
for (var i = 0; i < modules.length; i++) {
    var nextStart = modules[i+1] ? modules[i+1].pos : str.length;
    if (chinesePos >= modules[i].pos && chinesePos < nextStart) {
        console.log('Chinese text is in module "' + modules[i].id + '" at pos ' + modules[i].pos);
        console.log('Module spans:', modules[i].pos, 'to', nextStart);
        
        // Check if the module closes properly
        var moduleContent = str.slice(modules[i].pos, nextStart);
        var closing = str.slice(Math.max(0, nextStart - 30), nextStart);
        console.log('Module closing context:', JSON.stringify(closing));
        
        // Try to parse just this module
        var modWrapped = '(function(){' + moduleContent + '})';
        try {
            acorn.parse(modWrapped, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
            console.log('Module parse: SUCCESS');
        } catch(e3) {
            console.log('Module parse FAILED at offset', e3.pos, ':', e3.message);
            var absPos = modules[i].pos + e3.pos;
            console.log('In original string, position:', absPos);
        }
    }
}

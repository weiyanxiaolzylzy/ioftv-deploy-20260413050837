var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Check the "17aa" module at the start
console.log('=== The "17aa" module ===');
var mod17aaPos = str.indexOf('"17aa":function');
console.log('"17aa":function at position:', mod17aaPos);
console.log('Content:', JSON.stringify(str.slice(mod17aaPos, mod17aaPos + 100)));

// The chunk should have multiple modules. Let's find them by looking at the full structure
// The webpack chunk is: (window.webpackJsonp=window.webpackJsonp||[]).push([["project-ifc"],{...}])
// Let's find ALL module definitions
console.log('\n=== Finding ALL modules ===');
var modulePattern = /"([0-9a-f]{2,6})":function\(/g;
var m;
var modules = [];
while ((m = modulePattern.exec(str)) !== null) {
    modules.push({pos: m.index, id: m[1], full: m[0]});
    if (modules.length > 20) break;
}
console.log('Found', modules.length, 'modules:');
modules.forEach(function(mod) {
    console.log('  "' + mod.id + '" at pos', mod.pos, ':', JSON.stringify(str.slice(mod.pos, mod.pos + 40)));
});

// Now let's understand the webpack chunk structure
// Find the opening of the module object
var objStart = str.indexOf('.push([["project-ifc"],{');
console.log('\n=== Webpack Chunk Structure ===');
console.log('.push starts at:', objStart);

// Find the closing of the object by tracking nesting
var depth = 0;
var inString = false;
var stringChar = '';
var objEnd = -1;
for (var i = objStart; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '{') {
            depth++;
        } else if (c === '}') {
            depth--;
            if (depth === 0) {
                objEnd = i;
                break;
            }
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}
console.log('Module object closes at position:', objEnd);
console.log('Closing context:', JSON.stringify(str.slice(Math.max(0, objEnd - 20), objEnd + 10)));

// Find the closing ) of .push(
var pushEnd = -1;
depth = 0;
inString = false;
for (var i = objStart; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '(') {
            depth++;
        } else if (c === ')') {
            depth--;
            if (depth === -1) {
                pushEnd = i;
                break;
            }
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}
console.log('.push() closes at position:', pushEnd);
console.log('Final chars:', JSON.stringify(str.slice(Math.max(0, pushEnd - 10), pushEnd + 5)));

// Now let's find where each module ends
// A module "XXXX":function(t,e,s){"use strict";...} 
// ends when we find a }, at depth 0 (after the { of the function body)
console.log('\n=== Module Boundaries ===');
for (var mi = 0; mi < modules.length; mi++) {
    var modStart = modules[mi].pos;
    var funcNameEnd = modStart + modules[mi].full.length; // after "XXXX":function(
    console.log('Module "' + modules[mi].id + '" starts at', modStart + ', function body at', funcNameEnd);
    
    // Find the closing } of this function
    depth = 0;
    inString = false;
    var funcEnd = -1;
    for (var i = funcNameEnd; i < str.length; i++) {
        var c = str[i];
        if (!inString) {
            if (c === '"' || c === "'" || c === '`') {
                inString = true;
                stringChar = c;
            } else if (c === '{') {
                depth++;
            } else if (c === '}') {
                depth--;
                if (depth === 0) {
                    funcEnd = i;
                    break;
                }
            }
        } else {
            if (c === stringChar && str[i-1] !== '\\') {
                inString = false;
            }
        }
    }
    
    if (funcEnd >= 0) {
        console.log('  Function body ends at:', funcEnd, '->', JSON.stringify(str.slice(funcEnd - 5, funcEnd + 10)));
        
        // Check the next char (should be , or })
        var next = str[funcEnd + 1];
        console.log('  Next char:', JSON.stringify(next), 'code:', str.charCodeAt(funcEnd + 1));
        
        // How many chars is the function body?
        console.log('  Function body length:', funcEnd - funcNameEnd + 1, 'chars');
        console.log('  Function body preview:', JSON.stringify(str.slice(funcNameEnd, funcNameEnd + 50)));
    } else {
        console.log('  Function body NEVER CLOSES');
    }
    
    // Find the next module or end
    if (mi < modules.length - 1) {
        var nextModStart = modules[mi+1].pos;
        console.log('  Next module starts at:', nextModStart, '(gap:', nextModStart - funcEnd - 1, 'chars)');
    }
}

// The critical question: is the "2b00" module properly closed?
// Find "2b00" module
var mod2b00 = modules.find(function(m) { return m.id === '2b00'; });
if (mod2b00) {
    console.log('\n=== "2b00" module detail ===');
    var funcStart = mod2b00.pos + mod2b00.full.length;
    console.log('Function body starts at:', funcStart);
    
    // Try to find the closing }
    depth = 0;
    inString = false;
    var funcEnd = -1;
    for (var i = funcStart; i < str.length; i++) {
        var c = str[i];
        if (!inString) {
            if (c === '"' || c === "'" || c === '`') {
                inString = true;
                stringChar = c;
            } else if (c === '{') {
                depth++;
            } else if (c === '}') {
                depth--;
                if (depth === 0) {
                    funcEnd = i;
                    break;
                }
            }
        } else {
            if (c === stringChar && str[i-1] !== '\\') {
                inString = false;
            }
        }
    }
    
    if (funcEnd >= 0) {
        console.log('Function body ends at:', funcEnd);
        console.log('Closing context:', JSON.stringify(str.slice(funcEnd - 10, funcEnd + 20)));
        console.log('Content after end:', JSON.stringify(str.slice(funcEnd + 1, funcEnd + 30)));
    }
}

// Now let me check: what does the "17aa" module look like?
// Find the closing of the "17aa" function
var mod17aa = modules.find(function(m) { return m.id === '17aa'; });
if (mod17aa) {
    console.log('\n=== "17aa" module detail ===');
    var funcStart = mod17aa.pos + mod17aa.full.length;
    console.log('Function body starts at:', funcStart);
    console.log('Function body:', JSON.stringify(str.slice(funcStart, funcStart + 60)));
    
    depth = 0;
    inString = false;
    var funcEnd = -1;
    for (var i = funcStart; i < str.length; i++) {
        var c = str[i];
        if (!inString) {
            if (c === '"' || c === "'" || c === '`') {
                inString = true;
                stringChar = c;
            } else if (c === '{') {
                depth++;
            } else if (c === '}') {
                depth--;
                if (depth === 0) {
                    funcEnd = i;
                    break;
                }
            }
        } else {
            if (c === stringChar && str[i-1] !== '\\') {
                inString = false;
            }
        }
    }
    
    if (funcEnd >= 0) {
        console.log('Function body ends at:', funcEnd);
        console.log('Length:', funcEnd - funcStart + 1);
        console.log('Is it just a stub (s("8920"))?:', str.slice(funcStart, funcEnd + 1).indexOf('s("8920")') >= 0 && funcEnd - funcStart < 30);
    }
}

// Let me also check: what if the issue is with TEMPLATE LITERALS?
// The webpack chunk contains template literals like `...${...}...`
// If the $ is not properly escaped, the parser gets confused
console.log('\n=== Checking for template literal issues ===');
var inTemplate = false;
var templateDepth = 0;
var templateStart = -1;
for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (!inTemplate) {
        if (c === '`') {
            inTemplate = true;
            templateStart = i;
            templateDepth = 0;
        }
    } else {
        if (c === '\\') {
            i++; // skip escaped char
        } else if (c === '$' && str[i+1] === '{') {
            templateDepth++;
            i++;
        } else if (c === '}') {
            templateDepth--;
        } else if (c === '`' && templateDepth === 0) {
            inTemplate = false;
        }
    }
}
if (inTemplate) {
    console.log('WARNING: Unclosed template literal starting at', templateStart);
    console.log('Context:', JSON.stringify(str.slice(templateStart, Math.min(templateStart + 100, str.length))));
} else {
    console.log('All template literals properly closed.');
}

// Check for the specific Vue template pattern
// In Vue render functions, strings contain HTML-like content
// Let me check if any string contains unescaped quotes that would break parsing
console.log('\n=== Checking for unescaped quotes in strings ===');
var line = 1;
var inStr = false;
var strStart = -1;
var strChar = '';
for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (!inStr) {
        if (c === '"' || c === "'") {
            inStr = true;
            strStart = i;
            strChar = c;
        }
    } else {
        if (c === '\\') {
            i++;
        } else if (c === strChar && str[i-1] !== '\\') {
            inStr = false;
        }
    }
}
if (inStr) {
    console.log('WARNING: Unclosed string at position', strStart);
    console.log('String starts with:', JSON.stringify(str.slice(strStart, strStart + 30)));
}

// NOW: the REAL issue. Let me try to see if acorn 8.x has issues with certain patterns
// Let me check if maybe the problem is with the webpack chunk's specific syntax
// The webpack chunk uses: window.webpackJsonp.push
// But acorn might have trouble with this IIFE-like pattern

// Let me try: what if I extract just the module object and parse THAT?
console.log('\n=== Parsing just the module object ===');
var objStartPos = str.indexOf('.push([["project-ifc"],{') + '.push(['.length;
var moduleObj = str.slice(objStartPos); // from { to end
console.log('Module object starts with:', JSON.stringify(moduleObj.slice(0, 50)));

// Find the end
var objEndPos = moduleObj.indexOf('})');
var moduleObjContent = moduleObj.slice(0, objEndPos + 1);
console.log('Module object content length:', moduleObjContent.length);
console.log('Module object ends with:', JSON.stringify(moduleObjContent.slice(-20)));

// Try to parse as expression
try {
    acorn.parse(moduleObjContent, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Module object parse: SUCCESS');
} catch(e) {
    console.log('Module object parse: FAILED at', e.pos, ':', e.message);
    console.log('Context:', JSON.stringify(moduleObjContent.slice(Math.max(0, e.pos - 30), e.pos + 30)));
}

// Try the WHOLE webpack chunk
console.log('\n=== Parsing whole webpack chunk ===');
try {
    acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Whole chunk parse: SUCCESS');
} catch(e) {
    console.log('Whole chunk parse: FAILED at', e.pos, ':', e.message);
    console.log('Context:', JSON.stringify(str.slice(Math.max(0, e.pos - 30), e.pos + 30)));
}

// The key test: what if the issue is with acorn 8 vs the actual browser parser?
// Acorn 8 is a strict ES parser. Webpack chunks might use features acorn doesn't handle.
// Let me check: does the file use the comma operator or other advanced features?
console.log('\n=== Checking for advanced JS features ===');
// The error position has "!" - let me check if maybe it's inside an arrow function body
// or some other construct
// Actually, let me look at the "17aa" stub issue more carefully
// In a webpack chunk, the "stub" for a missing module looks like:
// "17aa":function(t,e,s){"use strict";s("8920")}
// This is MISSING the closing } of the webpack module's object
// because the stub only has one line of code
// The webpack module object should have: "17aa":function...},"2b00":function...
// Notice the } before "2b00"
// But if 17aa's function body is just {s("8920")}, then the } closes the function
// and the next char should be , 
// Let me check the actual chars around the "17aa" / "2b00" boundary

// Find "2b00" in the file
var idx2b00 = str.indexOf('"2b00":function');
if (idx2b00 >= 0) {
    console.log('\n=== "2b00" module position ===');
    console.log('"2b00":function at position:', idx2b00);
    
    // Show the content between the two modules
    // "17aa":function(t,e,s){"use strict";s("8920")}
    // is at some position. Let's find where 17aa ends
    var mod17aaEnd = idx2b00 - 1;
    while (mod17aaEnd > 0 && (str[mod17aaEnd] === ' ' || str[mod17aaEnd] === '\t' || str[mod17aaEnd] === '\n' || str[mod17aaEnd] === '\r')) {
        mod17aaEnd--;
    }
    console.log('Content BEFORE "2b00":', JSON.stringify(str.slice(Math.max(0, mod17aaEnd - 50), mod17aaEnd + 1)));
    
    // Check the exact character at mod17aaEnd
    console.log('Char at', mod17aaEnd, ':', JSON.stringify(str[mod17aaEnd]), 'code:', str.charCodeAt(mod17aaEnd));
    
    // And the context
    console.log('Chars', mod17aaEnd - 10, 'to', mod17aaEnd + 10, ':', JSON.stringify(str.slice(mod17aaEnd - 10, mod17aaEnd + 11)));
}

// Let me also check: maybe the issue is that the "17aa" module's function body
// is MISSING its closing brace, so the "2b00" content is INSIDE the 17aa function
// which would cause a syntax error
console.log('\n=== Checking if 17aa function is missing its closing brace ===');
if (mod17aa) {
    var funcStart = mod17aa.pos + mod17aa.full.length;
    console.log('17aa function body start:', funcStart, '= after "17aa":function(t,e,s)');
    console.log('Body preview:', JSON.stringify(str.slice(funcStart, funcStart + 50)));
    
    // Find the FIRST } after function start (should close the function body)
    var firstBrace = str.indexOf('}', funcStart);
    console.log('First } after function start at:', firstBrace);
    console.log('Context:', JSON.stringify(str.slice(firstBrace - 5, firstBrace + 5)));
    
    // Is there a comma after this }?
    console.log('Next char:', JSON.stringify(str[firstBrace + 1]), 'code:', str.charCodeAt(firstBrace + 1));
    console.log('Next 5:', JSON.stringify(str.slice(firstBrace + 1, firstBrace + 6)));
}

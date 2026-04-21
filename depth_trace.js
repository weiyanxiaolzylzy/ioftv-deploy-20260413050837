var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Track depth of (), {}, [] ignoring strings
var depth = { paren: 0, brace: 0, bracket: 0 };
var lastChange = { paren: 0, brace: 0, bracket: 0 };
var inString = false;
var stringChar = '';
var negativeDepths = [];

for (var i = 0; i < str.length; i++) {
    var c = str[i];
    var cc = str.charCodeAt(i);
    
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '(') {
            depth.paren++;
            lastChange.paren = i;
        } else if (c === ')') {
            depth.paren--;
            lastChange.paren = i;
            if (depth.paren < 0) {
                negativeDepths.push({pos: i, ctx: str.slice(Math.max(0, i - 30), i + 5), depth: depth.paren});
                depth.paren = 0; // Reset for continued analysis
            }
        } else if (c === '{') {
            depth.brace++;
            lastChange.brace = i;
        } else if (c === '}') {
            depth.brace--;
            lastChange.brace = i;
        } else if (c === '[') {
            depth.bracket++;
            lastChange.bracket = i;
        } else if (c === ']') {
            depth.bracket--;
            lastChange.bracket = i;
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}

console.log('=== Depth Analysis ===');
console.log('Final depth - paren:', depth.paren, 'brace:', depth.brace, 'bracket:', depth.bracket);
console.log('Last paren change at:', lastChange.paren);
console.log('Last brace change at:', lastChange.brace);
console.log('Last bracket change at:', lastChange.bracket);

console.log('\n=== Negative depth events (unmatched closing) ===');
negativeDepths.forEach(function(n) {
    console.log('  Pos', n.pos, ': depth went to', n.depth, '| Context:', JSON.stringify(n.ctx));
});

// Now find where the UNCLOSED parens opened
// We need to find 2 unmatched ( characters
// They should be somewhere in the file
// Let's track paren depth more carefully, looking for the LAST 2 opens that were never closed
console.log('\n=== Finding unclosed parens ===');
var openStack = []; // stack of { position: index, type: 'paren'/'brace'/'bracket' }
inString = false;
stringChar = '';
depth = { paren: 0, brace: 0, bracket: 0 };

for (var i = 0; i < str.length; i++) {
    var c = str[i];
    
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '(') {
            depth.paren++;
            openStack.push({pos: i, type: 'paren'});
        } else if (c === ')') {
            depth.paren--;
            if (depth.paren >= 0) {
                // Find and remove matching open
                for (var j = openStack.length - 1; j >= 0; j--) {
                    if (openStack[j].type === 'paren' && openStack[j].closed) {
                        continue;
                    }
                    if (openStack[j].type === 'paren') {
                        openStack[j].closed = true;
                        break;
                    }
                }
            }
        } else if (c === '{') {
            depth.brace++;
            openStack.push({pos: i, type: 'brace'});
        } else if (c === '}') {
            depth.brace--;
            for (var j = openStack.length - 1; j >= 0; j--) {
                if (openStack[j].type === 'brace' && !openStack[j].closed) {
                    openStack[j].closed = true;
                    break;
                }
            }
        } else if (c === '[') {
            depth.bracket++;
            openStack.push({pos: i, type: 'bracket'});
        } else if (c === ']') {
            depth.bracket--;
            for (var j = openStack.length - 1; j >= 0; j--) {
                if (openStack[j].type === 'bracket' && !openStack[j].closed) {
                    openStack[j].closed = true;
                    break;
                }
            }
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}

// Find unclosed parens
var unclosed = openStack.filter(function(item) { return !item.closed && item.type === 'paren'; });
console.log('Unclosed parens:', unclosed.length);
unclosed.forEach(function(u) {
    console.log('  Pos', u.pos, ':', JSON.stringify(str.slice(Math.max(0, u.pos - 30), u.pos + 30)));
    // Also show context around the end of the file
    console.log('  Near EOF:', JSON.stringify(str.slice(Math.max(0, str.length - 50))));
});

// Now let's try to narrow down WHERE the imbalance started
// Look at the LAST 50 characters before the error position
console.log('\n=== Context BEFORE error position 16274 ===');
for (var i = 16200; i <= 16274; i++) {
    var c = str[i];
    if (c === '(' || c === ')' || c === '{' || c === '}' || c === '[' || c === ']') {
        console.log('  Pos', i, ':', JSON.stringify(c));
    }
}

// Track depth specifically around the error position
console.log('\n=== Bracket depth trace (last 200 chars before error) ===');
inString = false;
stringChar = '';
var traceDepth = 0;
for (var i = Math.max(0, 16074); i < 16275; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '(' || c === '[' || c === '{') {
            traceDepth++;
        } else if (c === ')' || c === ']' || c === '}') {
            traceDepth--;
        }
        if (traceDepth < 0) {
            console.log('DEPTH went NEGATIVE at', i, ':', traceDepth, '|', JSON.stringify(str.slice(Math.max(0, i-5), i+5)));
        }
        if (traceDepth > 10) {
            console.log('DEPTH went HIGH at', i, ':', traceDepth);
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}

// The key insight: the file ends with p=-2 (2 unclosed parens)
// Those 2 parens must be the LAST ones that were opened and never closed
// Let me find the LAST two unclosed ( characters
console.log('\n=== Last unclosed parens ===');
var allOpens = [];
inString = false;
stringChar = '';
for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '(') {
            allOpens.push({pos: i, ctx: str.slice(Math.max(0, i-10), i+5)});
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}

// Find the LAST two opens
console.log('Last 10 opens:');
for (var i = Math.max(0, allOpens.length - 10); i < allOpens.length; i++) {
    console.log('  Open at', allOpens[i].pos, ':', JSON.stringify(allOpens[i].ctx));
}

// Now check: how many CLOSING parens are after each of these?
// If we have 2 extra opens, we need to find them
// Count closes from the end backwards
console.log('\n=== Count closes from end ===');
var closeCount = 0;
for (var i = str.length - 1; i >= 0; i--) {
    if (str[i] === ')') closeCount++;
    if (str[i] === '(') {
        closeCount--;
        if (closeCount < 0) {
            console.log('Last unmatched ( at pos', i, ':', JSON.stringify(str.slice(Math.max(0, i-10), i+5)));
            closeCount = 0; // reset
        }
    }
}

// THEORY: maybe the issue is NOT bracket imbalance
// but rather a SPECIFIC Vue template syntax that acorn doesn't handle
// Let me check: what if the error is caused by a TERNARY operator in JSX-like syntax?
// Vue render functions use: condition ? trueVal : falseVal
// And the expression at position 16274 might be inside a ternary
// But acorn SHOULD handle ternary operators...

// Let me check the SPECIFIC context around 16274 in terms of DEPTH
console.log('\n=== Depth at position 16274 ===');
inString = false;
stringChar = '';
depth = { paren: 0, brace: 0, bracket: 0 };
for (var i = 0; i < 16274; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '(') depth.paren++;
        else if (c === ')') depth.paren--;
        else if (c === '{') depth.brace++;
        else if (c === '}') depth.brace--;
        else if (c === '[') depth.bracket++;
        else if (c === ']') depth.bracket--;
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}
console.log('At position 16274: paren=' + depth.paren + ' brace=' + depth.brace + ' bracket=' + depth.bracket);

// At position 16274, we're at char "!" which is outside all strings
// depth should be 0 for all, but maybe it's not?
console.log('Expected: all 0. Is this correct?');

// Let me verify by checking position 16273 (the , before !)
if (depth.paren === 0 && depth.brace === 0 && depth.bracket === 0) {
    console.log('Depth is 0 - the code structure IS balanced at this point');
    console.log('So the "!" at position 16274 IS at top level');
    console.log('And "!1" at top level of an object is INVALID JS');
}

// But WAIT - if depth IS 0, then the issue is that the content is WRONG
// not that there's a bracket mismatch
// Let me re-check the depth at 16274
console.log('\nRe-checking depth at 16274:');
var testStr = str.slice(0, 16274);
try {
    acorn.parse(testStr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Parsing up to 16274: SUCCESS');
} catch(e) {
    console.log('Parsing up to 16274: FAILED at', e.pos, ':', e.message);
}

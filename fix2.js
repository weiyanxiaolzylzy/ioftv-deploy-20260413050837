var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

// Find the first position where paren depth goes negative
console.log('=== Finding first negative paren depth ===');
var depth = 0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) depth++;
    else if (c === 41) depth--;
    
    if (depth < 0) {
        console.log('First negative depth at position', i, ': depth=' + depth);
        console.log('Context:', JSON.stringify(str.slice(Math.max(0, i - 30), i + 30)));
        console.log('Prev 5 chars:');
        for (var j = Math.max(0, i - 5); j < i; j++) {
            console.log('  pos', j, ':', JSON.stringify(str[j]), 'code:', str.charCodeAt(j));
        }
        console.log('Pos', i, ':', JSON.stringify(str[i]), 'code:', str.charCodeAt(i));
        break;
    }
}

// Now: if the first negative is at 32548, then the entire file before 32548 is balanced
// And position 32548 is the FIRST extra )
// So we need to find: where did the matching ( go for this )?
// The matching ( would be at the deepest depth point

// Let me find the MAXIMUM depth achieved in the file
console.log('\n=== Finding maximum paren depth ===');
depth = 0;
var maxDepth = 0;
var maxPos = 0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) depth++;
    else if (c === 41) depth--;
    if (depth > maxDepth) {
        maxDepth = depth;
        maxPos = i;
    }
}
console.log('Maximum depth:', maxDepth, 'at position', maxPos);

// Now, let me check: what if the issue is that the "2b00" module's function body
// has the wrong closing? Let me look at the 2b00 function more carefully
console.log('\n=== Analyzing 2b00 function ===');
var idx2b00 = str.indexOf('"2b00":function');
console.log('2b00 at position:', idx2b00);
var funcStart = idx2b00 + 17; // after "2b00":function(
console.log('Function body starts at:', funcStart);

// Find the function body closing
var fDepth = 0;
var fInString = false;
var fStringChar = '';
var funcEnd = -1;
for (var i = funcStart; i < str.length; i++) {
    var c = str[i];
    if (!fInString) {
        if (c === '"' || c === "'" || c === '`') {
            fInString = true;
            fStringChar = c;
        } else if (c === '{') {
            fDepth++;
        } else if (c === '}') {
            fDepth--;
            if (fDepth === 0) {
                funcEnd = i;
                break;
            }
        }
    } else {
        if (c === fStringChar && str[i-1] !== '\\') {
            fInString = false;
        }
    }
}
console.log('Function body ends at:', funcEnd);
console.log('Closing context:', JSON.stringify(str.slice(Math.max(0, funcEnd - 20), funcEnd + 30)));

// The 2b00 function ends at 32569, which is:
// ...=o.exports}}]);
// Wait, let me check what's BEFORE 32569 more carefully
console.log('\n=== Context around 32548-32573 ===');
for (var i = 32545; i < 32574; i++) {
    console.log('pos', i, ':', JSON.stringify(str[i]), 'code:', str.charCodeAt(i));
}

// The structure from 32545 to 32573:
// 32545: l
// 32546: l
// 32547: )
// 32548: )  <-- this is the FIRST extra )
// 32549: ;
// 32550: e
// ... 
// 32568: }
// 32569: }
// 32570: ]
// 32571: )
// 32572: ; (end)

// But wait: the 2b00 function ends at 32569
// And 32568-32569 are }} which should be:
// - 32568: } closes something in 2b00
// - 32569: } closes the function body

// And then:
// 32570: ] closes the modules object  
// 32571: ) closes the .push() call
// 32572: ; end

// So the issue is at 32547-32548: there are two )) 
// Let me check: what comes BEFORE 32545?
// It should be the LAST statement in the 2b00 function

// Let me find what's around 32530-32547
console.log('\n=== Context 32530-32547 ===');
for (var i = 32530; i < 32548; i++) {
    console.log('pos', i, ':', JSON.stringify(str[i]), 'code:', str.charCodeAt(i));
}

// The string at 32530-32547 is:
// ...null,"4efd1a67",null)
// and at 32547-32548: ))

// So we have: null,"4efd1a67",null))
// But we should have: null,"4efd1a67",null)
// The second ) is EXTRA

// But this is inside the 2b00 function's render function
// Let me find the context more precisely

// Looking at the structure from the earlier analysis:
// The "17aa" module at position 16320 has:
// ...},"2b00":function...
// And the content before "2b00" is the closing of "17aa" module's object
// With the pattern: e.default=o.exports}

// So the full end of "17aa" is: e.default=o.exports}
// And then comes "2b00":function...

// The "2b00" function has the SAME content
// e.default=o.exports} at 32567
// Wait, but there's also a null at 32548

// Let me re-read the context:
// 32545: l  (null)
// 32546: l  
// 32547: )  
// 32548: )  <-- EXTRA
// 32549: ;
// 32550: e (e.default)
// ...

// Actually, wait. Let me check: what's at position 32520-32548?
// From the earlier output:
// 32520: ]
// 32521: )
// 32522: }
// 32523: )
// 32524: ,
// 32525: !
// ...
// 32547: )
// 32548: )

// So the structure is: ])}),!
// That's ] ) } ) ,
// Which means: ] closes the render function array
// ) closes the render function call  
// } closes the component options object
// ) closes the e() call
// , is the separator
// !1 is the next property value

// The CORRECT structure should be: ])},
// But we have: ])}),

// And then the next part starts with !1,null,"4efd1a67",null);
// So we have an extra ) between the closing ) of the component and the comma

// Let me verify: is there a missing module or property that would justify this?
// The pattern is: ...}),!1,null,"4efd1a67",null);
// This looks like a webpack chunk's "module.exports" call
// But it's inside the 2b00 function

// Actually, I think the issue is that the 2b00 function body is MISSING
// its e("p",...) call that closes the render function
// OR there's an extra ) in the 2b00 function

// Let me find what the "17aa" function ends with and compare
console.log('\n=== Compare 17aa and 2b00 endings ===');
// 17aa ends at 16318 with: e.default=o.exports}
// 2b00 ends at 32569 with: o.exports}}

// 17aa structure at 16309-16320:
// ...o.exports},"2b00"...
// So 17aa ends with: },"

// 2b00 structure at 32555-32573:
// ...null);e.default=o.exports}}]);
// Wait, that's different!

// Let me re-check. From the raw analysis:
// 32545-32547: null)  <-- this closes something
// 32548: )  <-- EXTRA
// 32549: ;
// 32550-32569: e.default=o.exports}}
// 32570: ]
// 32571: )
// 32572: ;
// 32573: (EOF)

// So the structure is:
// null);e.default=o.exports}}]);
// Which decodes as:
// null);   <-- something that returns null, then ;
// e.default=o.exports}  <-- set default export
// }  <-- close the 2b00 function body
// ]  <-- close the modules object
// )  <-- close the .push() call
// ;  <-- end

// But there's also a null); at 32545-32547
// Let me find what THIS is closing
// It should be the last render function call in the 2b00 module

// Let me search for where the 2b00 function's render function starts
console.log('\n=== Finding 2b00 render function ===');
// The 2b00 module should have a Vue component definition
// Let me find all function definitions in 2b00
var funcDepth = 0;
var inString = false;
var stringChar = '';
var funcStarts = [];
var braceDepth = 0;
for (var i = funcStart; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '{') {
            braceDepth++;
        } else if (c === '}') {
            braceDepth--;
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}
// Actually, let me look for the Vue render function pattern
// It should be: render:function(t,e,s){return e("div",...
var renderStart = str.indexOf('render:function', funcStart);
if (renderStart >= 0) {
    console.log('Render function starts at:', renderStart);
    console.log('Context:', JSON.stringify(str.slice(renderStart, renderStart + 50)));
}

// Now find the LAST t._v or e() call in the 2b00 module
// by looking backwards from position 32545
console.log('\n=== Looking backwards from 32545 ===');
for (var i = 32500; i < 32548; i++) {
    var c = str.charCodeAt(i);
    if (c === 40 || c === 41 || c === 123 || c === 125) {
        console.log('pos', i, ':', JSON.stringify(str[i]));
    }
}

// I think the fix is simpler: the null); at 32545-32547
// is the LAST statement in the 2b00 function
// But it returns null AND has a trailing );
// Then after that comes e.default=o.exports}

// The issue is that null); has TWO )
// Let me check: what opens these?
// null) closes the value expression
// ; ends the statement
// The second ) is EXTRA

// Actually, wait. Let me re-read the context.
// The 2b00 function is a Vue component render function.
// Vue render functions return something like: e("div", {...})
// The LAST element in the render function should be the return value.
// But here, there's a null followed by );;
// This would be: return null); which is invalid

// Unless... the null) is NOT a return statement
// Let me find the full context of 32545-32573

// From the byte-level analysis, the last part of the file is:
// ..."4efd1a67",null);e.default=o.exports}}]);

// So "4efd1a67" is a webpack chunk dependency ID
// And null is the export value
// So the pattern is: "4efd1a67": null

// The webpack module export format is: module.exports
// But webpack 4 uses: e.default=o.exports
// where o is the module object

// So the structure at the end is:
// null);  <-- this is the export value: module.exports = null
// e.default=o.exports}  <-- set default export
// }  <-- close 2b00 function
// ]  <-- close modules
// )  <-- close push
// ;  <-- end

// The null) at 32545-32547: let me find what opens the )
// It could be: e("4efd1a67") which returns null
// Or: the return value of the render function is null

// Let me look at the LAST 100 characters before 32545
console.log('\n=== Last 100 chars before 32545 ===');
for (var i = 32445; i < 32548; i++) {
    var c = str.charCodeAt(i);
    if (c === 40 || c === 41 || c === 123 || c === 125 || c === 91 || c === 93 || c === 44) {
        console.log('pos', i, ':', JSON.stringify(str[i]));
    }
}

// Let me also check: what if the fix is just to REMOVE the ) at 32548?
// Because the entire file before 32548 has p=0
// And at 32548, we add one more ), making p=-1
// But we need p=-2, so there must be ANOTHER issue

// Wait, I think I made a mistake. Let me re-trace.
// From the end analysis:
// Last 500 chars: ( = 12 ) = 20 balance = 8
// But this is from the LAST 500 chars of the STRING, not from position 32406

// And the total file is 32574 chars
// So last 500 = positions 32074 to 32574

// Let me count parens from position 0 properly
var totalOpen = 0, totalClose = 0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) totalOpen++;
    else if (c === 41) totalClose++;
}
console.log('\nTotal parens: ( =', totalOpen, ') =', totalClose, 'balance =', totalClose - totalOpen);

// So there are 2 more ) than (
// And from the end analysis, the balance first goes negative at 32548
// This means: up to position 32548, the balance is -1
// And at position 32548, it goes to -2

// So the issue is: the FIRST extra ) is at or before 32548
// And the SECOND extra ) is at 32548

// Let me find where the FIRST extra ) is
// by going backwards from 32548
console.log('\n=== Finding all unbalanced parens ===');
var openStack = [];
var inString2 = false;
var strChar2 = '';
for (var i = 0; i < 32548; i++) {
    var c = str[i];
    if (!inString2) {
        if (c === '"' || c === "'" || c === '`') {
            inString2 = true;
            strChar2 = c;
        } else if (c === '(') {
            openStack.push({pos: i, type: 'paren'});
        } else if (c === ')') {
            if (openStack.length > 0 && openStack[openStack.length - 1].type === 'paren') {
                openStack.pop();
            }
        }
    } else {
        if (c === strChar2 && str[i-1] !== '\\') {
            inString2 = false;
        }
    }
}
console.log('Unmatched ( at position 32548 (first pass):', openStack.length);

// Now, the unmatched stack has the unclosed parens
// But we only care about the LAST ones
// Let me check the stack
console.log('Unmatched parens:');
openStack.forEach(function(item) {
    console.log('  pos', item.pos, ':', JSON.stringify(str.slice(Math.max(0, item.pos - 20), item.pos + 20)));
});

// So there are unmatched parens in the file
// Let me find the LAST few
console.log('\nLast 10 unmatched:');
for (var i = Math.max(0, openStack.length - 10); i < openStack.length; i++) {
    var item = openStack[i];
    console.log('  pos', item.pos, ':', JSON.stringify(str.slice(Math.max(0, item.pos - 30), item.pos + 30)));
}

// Now let me understand: the issue is that 2 ( were opened but never closed
// OR 2 ) were added that shouldn't be there
// Let me check: what if the 2 unmatched ( are at the beginning of the file?

// Actually wait, let me re-check the beginning of the file.
// The webpack chunk starts with: (window.webpackJsonp=...||[]).push(...)
// - ( at 0, ) at 40: GROUPING operator (opens and closes)
// - .push( at 45: METHOD CALL (opens at 45, should close somewhere)
// So there should be a matching ) for the one at 45

// And then at the end:
// The file ends with }); -- which should close the push() and the grouping

// But we're at p=-2, meaning we have 2 extra )
// And the first unbalanced ) is at 32548

// Let me find: what is at position 32548?
// And what should be there?
console.log('\n=== Position 32548 analysis ===');
console.log('Char at 32548:', JSON.stringify(str[32548]), 'code:', str.charCodeAt(32548));
console.log('Context:', JSON.stringify(str.slice(32530, 32573)));

// The context is: ...null,"4efd1a67",null);e.default...
// So at 32548, we have ) that closes null);
// And the ; at 32549 ends the statement

// But wait: null); would be valid (calling null as a function)
// But null); with a trailing ) would be null))( -- two closing parens
// So the issue is: at 32548, there are TWO )) where there should be ONE

// The fix: remove the ) at 32548
// BUT: is the balance correct before 32548?
// Let me check: count from start to 32548 (exclusive)
var balanceBefore = 0;
for (var i = 0; i < 32548; i++) {
    var c = str.charCodeAt(i);
    if (c === 40) balanceBefore++;
    else if (c === 41) balanceBefore--;
}
console.log('\nBalance before position 32548:', balanceBefore);

// If balance is 0, then removing the ) at 32548 would make balance -1
// And we need the final balance to be 0
// So there must be ANOTHER extra ) somewhere

// Let me check: what is at position 32547?
console.log('Char at 32547:', JSON.stringify(str[32547]), 'code:', str.charCodeAt(32547));

// So 32547 is ), which closes something
// And 32548 is ), which is extra

// Let me also check: what is the STRUCTURE of the 2b00 module?
// It should be: "2b00":function(t,e,s){"use strict";s.r(e);...}
// And the function body ends at 32569

// The last part of the function body should be the export
// In webpack 4, this is: e.default=o.exports
// which sets module.exports.default

// But there's ALSO a null at 32545-32547
// null); -- this could be: return null;
// or: (function() { return null; })();
// or: the return value of the render function

// Let me find the render function in 2b00
var renderPattern = 'render:function';
var renderIdx = str.indexOf(renderPattern, funcStart);
if (renderIdx >= 0) {
    console.log('\n2b00 render function at:', renderIdx);
    console.log('Context:', JSON.stringify(str.slice(renderIdx, renderIdx + 100)));
    
    // Find the return statement
    var returnIdx = str.indexOf('return', renderIdx);
    if (returnIdx >= 0) {
        console.log('Return at:', returnIdx);
        console.log('Context:', JSON.stringify(str.slice(returnIdx, returnIdx + 50)));
    }
}

// OK, I think I need to just TRY the fix and see if it works:
// Fix: remove ) at position 32548

// Actually, wait. Let me re-think the WHOLE problem.
// The acorn error says: "Unexpected token !" at position 16274
// Position 16274 is the "!" in the pattern: ])}),!1,null,"4efd1a67"

// If the brackets were balanced, position 16274 would be at top level
// And "!1" at top level would be a SyntaxError
// So "!1" is INVALID JavaScript at top level of an object

// But "!1" IS valid inside a webpack chunk's modules object
// For example: "key":!1 means the value is the negation of 1 = false

// The issue is: the webpack chunk parser sees "!)" as unexpected
// because the bracket depth is wrong

// If we fix the brackets, then:
// - Position 16274 would be at depth 0 (top level)
// - "!1" would be interpreted as a property value
// - This is VALID webpack chunk syntax

// So the root fix is: fix the bracket imbalance
// The bracket imbalance comes from: extra ) at position 32548

// Let me also check: is there an extra ( somewhere?
// Maybe the 2b00 module has a missing ( or )

// Let me try a practical approach:
// 1. Remove the extra ) at 32548
// 2. Check if acorn can parse it
// If not, try additional fixes

console.log('\n=== Trying fix: remove ) at 32548 ===');
var fixed1 = str.slice(0, 32548) + str.slice(32549);
var pCheck1 = 0;
for (var i = 0; i < fixed1.length; i++) {
    var c = fixed1.charCodeAt(i);
    if (c === 40) pCheck1++;
    else if (c === 41) pCheck1--;
}
console.log('After removing 32548: balance =', pCheck1);

try {
    acorn.parse(fixed1, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Acorn: SUCCESS!');
} catch(e1) {
    console.log('Acorn: FAILED at', e1.pos, ':', e1.message);
    console.log('Context:', JSON.stringify(fixed1.slice(Math.max(0, e1.pos - 30), e1.pos + 30)));
}

// If that doesn't work, try: also add ) at end
console.log('\n=== Trying fix: remove ) at 32548 AND add ) at end ===');
var fixed2 = str.slice(0, 32548) + str.slice(32549) + ')';
var pCheck2 = 0;
for (var i = 0; i < fixed2.length; i++) {
    var c = fixed2.charCodeAt(i);
    if (c === 40) pCheck2++;
    else if (c === 41) pCheck2--;
}
console.log('After removing 32548 + adding end ): balance =', pCheck2);

try {
    acorn.parse(fixed2, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Acorn: SUCCESS!');
} catch(e2) {
    console.log('Acorn: FAILED at', e2.pos, ':', e2.message);
}

// If that works, save it
if (pCheck2 === 0) {
    console.log('\nFix found! Saving...');
    var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
    fs.writeFileSync(target, fixed2);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', fixed2);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', fixed2);
    console.log('Saved!');
    
    // Verify
    var verify = fs.readFileSync(target);
    console.log('Verify size:', verify.length);
    try {
        acorn.parse(verify.toString('utf8'), { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('Verify Acorn: SUCCESS!');
    } catch(e3) {
        console.log('Verify Acorn: FAILED at', e3.pos);
    }
}

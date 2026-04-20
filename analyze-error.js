var fs = require('fs');

// Read the original broken file as latin1 (raw bytes)
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Original bytes:', buf.length);
var latin1 = buf.toString('latin1');
console.log('Latin1 length:', latin1.length);

// Check if it's valid JavaScript when interpreted as latin1
try {
    new Function(latin1);
    console.log('Valid as latin1!');
} catch(e) {
    console.log('Error as latin1:', e.message);
}

// Now let's find where the error is
// The issue is that Chinese chars like → (e2 86 92) have byte 0x92 which is invalid UTF-8
// Let's try to replace the problematic chars with ASCII equivalents
var fixed = latin1
    .replace(/\u2192/g, '->')  // →
    .replace(/\u300c/g, '[')   // 「
    .replace(/\u300d/g, ']')   // 」
    .replace(/\u2014/g, '--')  // —
    .replace(/\u2019/g, "'")  // '
    .replace(/\u201c/g, '"')  // "
    .replace(/\u201d/g, '"')  // "
    .replace(/\u2026/g, '...'); // ...

// Validate fixed version
try {
    new Function(fixed);
    console.log('Fixed version is valid JS!');
} catch(e) {
    console.log('Fixed version error:', e.message);
}

// Now let's find the actual syntax error in the original
// by looking at the structure
var openParens = (latin1.match(/\(/g) || []).length;
var closeParens = (latin1.match(/\)/g) || []).length;
var openBraces = (latin1.match(/\{/g) || []).length;
var closeBraces = (latin1.match(/\}/g) || []).length;
var openBrackets = (latin1.match(/\[/g) || []).length;
var closeBrackets = (latin1.match(/\]/g) || []).length;
console.log('Parens:', openParens, '/', closeParens);
console.log('Braces:', openBraces, '/', closeBraces);
console.log('Brackets:', openBrackets, '/', closeBrackets);

// Try to find template string issues
var hasUnescapedQuotes = /[^\\]"[^"]*[""][^"]*[""]/.test(latin1);
console.log('Has double consecutive quotes:', hasUnescapedQuotes);

// Let's look at the specific area around "构件管理" to find template issues
var pos = latin1.indexOf('项目构件管理');
if (pos > 0) {
    console.log('Found at:', pos);
    console.log('Context:', JSON.stringify(latin1.slice(pos-30, pos+50)));
}

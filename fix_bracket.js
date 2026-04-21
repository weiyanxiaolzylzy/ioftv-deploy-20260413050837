var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

console.log('Current file size:', buf.length, 'bytes,', str.length, 'chars');
console.log('Last 30 chars:', JSON.stringify(str.slice(-30)));
console.log('Chars at 32545-32555:');
for (var i = 32545; i < 32555; i++) {
    console.log('  pos', i, ':', JSON.stringify(str[i]), 'code:', str.charCodeAt(i));
}

// The fix: remove the orphaned ) at position 32548
// and add ) at the end

var fixed = str.slice(0, 32548) + str.slice(32549) + ')';
console.log('\nFixed file size:', fixed.length, 'chars');
console.log('Last 30 chars:', JSON.stringify(fixed.slice(-30)));

// Verify bracket balance
var b=0, br=0, p=0;
for (var i = 0; i < fixed.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 123) b++;
    else if (c === 125) b--;
    else if (c === 91) br++;
    else if (c === 93) br--;
    else if (c === 40) p++;
    else if (c === 41) p--;
}
console.log('Original brackets: b=0 br=0 p=-2');

var b2=0, br2=0, p2=0;
for (var i = 0; i < fixed.length; i++) {
    var c = fixed.charCodeAt(i);
    if (c === 123) b2++;
    else if (c === 125) b2--;
    else if (c === 91) br2++;
    else if (c === 93) br2--;
    else if (c === 40) p2++;
    else if (c === 41) p2--;
}
console.log('Fixed brackets: b=' + b2 + ' br=' + br2 + ' p=' + p2);

// Try acorn
console.log('\n=== Acorn Parse ===');
try {
    acorn.parse(fixed, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('SUCCESS!');
} catch(e) {
    console.log('FAILED at pos', e.pos, ':', e.message);
    console.log('Context:', JSON.stringify(fixed.slice(Math.max(0, e.pos - 30), e.pos + 30)));
}

// Save if fixed
var pFinal=0;
for (var i = 0; i < fixed.length; i++) {
    var c = fixed.charCodeAt(i);
    if (c === 40) pFinal++;
    else if (c === 41) pFinal--;
}
if (pFinal === 0) {
    console.log('\nBrackets balanced! Saving...');
    var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
    fs.writeFileSync(target, fixed);
    console.log('Saved!');
    
    // Copy to other locations
    var target2 = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js';
    var beifen = 'd:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
    fs.writeFileSync(target2, fixed);
    fs.writeFileSync(beifen, fixed);
    console.log('Copied to other locations too.');
    
    // Verify
    var verify = fs.readFileSync(target);
    console.log('\nVerify size:', verify.length);
    var vstr = verify.toString('utf8');
    var vb=0,vbr=0,vp=0;
    for (var i = 0; i < vstr.length; i++) {
        var c = vstr.charCodeAt(i);
        if (c === 123) vb++;
        else if (c === 125) vb--;
        else if (c === 91) vbr++;
        else if (c === 93) vbr--;
        else if (c === 40) vp++;
        else if (c === 41) vp--;
    }
    console.log('Verify brackets: b=' + vb + ' br=' + vbr + ' p=' + vp);
    
    // Acorn on saved
    try {
        acorn.parse(vstr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('Verify Acorn: SUCCESS!');
    } catch(e2) {
        console.log('Verify Acorn: FAILED at', e2.pos, ':', e2.message);
    }
} else {
    console.log('\nNot balanced (p=' + pFinal + '), NOT saving');
}

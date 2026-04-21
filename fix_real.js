var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var str = buf.toString('utf8');

console.log('Original size:', str.length, 'chars');
console.log('Chars 16267-16280:');
for (var i = 16267; i <= 16280; i++) {
    console.log('  pos', i, ':', JSON.stringify(str[i]), 'code:', str.charCodeAt(i));
}

// Remove the orphaned ) at position 16272
var fixed = str.slice(0, 16272) + str.slice(16273);
console.log('\nAfter removing char at 16272: size =', fixed.length, 'chars');

// Check bracket balance
var p=0,b2=0,br=0;
for (var i = 0; i < fixed.length; i++) {
    var c = fixed.charCodeAt(i);
    if (c === 40) p++;
    else if (c === 41) p--;
    else if (c === 123) b2++;
    else if (c === 125) b2--;
    else if (c === 91) br++;
    else if (c === 93) br--;
}
console.log('Brackets after fix: p=' + p + ' b=' + b2 + ' br=' + br);

// Acorn parse
try {
    acorn.parse(fixed, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
    console.log('Acorn: SUCCESS!');
    
    // Save!
    var target = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
    fs.writeFileSync(target, fixed);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js', fixed);
    fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', fixed);
    console.log('SAVED!');
    
    // Verify
    var v = fs.readFileSync(target);
    var vstr = v.toString('utf8');
    var vp=0;
    for (var i = 0; i < vstr.length; i++) {
        var c = vstr.charCodeAt(i);
        if (c === 40) vp++;
        else if (c === 41) vp--;
    }
    console.log('Verify brackets: p=' + vp);
    try {
        acorn.parse(vstr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('Verify: SUCCESS!');
    } catch(e2) {
        console.log('Verify: FAILED at', e2.pos);
    }
    
    console.log('\nNew ending:', JSON.stringify(fixed.slice(-20)));
    console.log('Context at 16272:', JSON.stringify(fixed.slice(16260, 16290)));
    
} catch(e) {
    console.log('Acorn: FAILED at', e.pos, ':', e.message);
    console.log('Context:', JSON.stringify(fixed.slice(Math.max(0, e.pos - 30), e.pos + 30)));
}

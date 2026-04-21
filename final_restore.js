const fs = require('fs');

// The beifen file is 17683 bytes and correct. Copy it to both targets.
const beifen = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');

const target1 = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
const target2 = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js';

// Restore both from beifen
fs.writeFileSync(target1, beifen);
fs.writeFileSync(target2, beifen);

console.log('Restored both files from beifen (' + beifen.length + ' bytes)');

// Verify
for (const fp of [target1, target2]) {
    const c = fs.readFileSync(fp, 'utf8');
    let b=0, br=0, p=0;
    for (const ch of c) {
        if (ch === '{') b++;
        else if (ch === '}') b--;
        else if (ch === '[') br++;
        else if (ch === ']') br--;
        else if (ch === '(') p++;
        else if (ch === ')') p--;
    }
    console.log(fp.split('/').pop() + ': len=' + c.length + ' b=' + b + ' br=' + br + ' p=' + p);
    console.log('  ends: ' + JSON.stringify(c.slice(-10)));
}

// Also verify template literals are intact
const t1 = fs.readFileSync(target1, 'utf8');
let backticks = 0;
for (const c of t1) {
    if (c.charCodeAt(0) === 96) backticks++;
}
console.log('\nBackticks in file:', backticks);

// Check specific template literals
const checks = [
    ['${t.getFullYear()}', 'getTodayStr template'],
    ['${window.location.origin}', 'resolveIfcAbsUrl template'],
    ['`已更新 ${', 'success message template'],
    ['`/api/projects/${', 'fetch URL template']
];
for (const [pattern, name] of checks) {
    console.log(name + ':', t1.includes(pattern) ? 'FOUND' : 'MISSING');
}

var fs = require('fs');

// Read git version (UTF-16 LE with BOM)
var gitContent = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/git_version_raw.js', 'utf16le');
// Strip BOM if present
if (gitContent.charCodeAt(0) === 0xFEFF) {
    gitContent = gitContent.substring(1);
}
console.log('Git version (UTF-16->UTF-8) size:', Buffer.byteLength(gitContent, 'utf8'));

// Read disk version
var diskContent = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');
console.log('Disk version size:', Buffer.byteLength(diskContent, 'utf8'));

// Compare
console.log('Are they equal?', Buffer.byteLength(gitContent, 'utf8') === Buffer.byteLength(diskContent, 'utf8'));

// Test git version
try {
    eval(gitContent);
    console.log('Git version (UTF-16 converted): SUCCESS');
} catch(e) {
    console.log('Git version (UTF-16 converted): ' + e.message.substring(0, 100));
}

// Test disk version
try {
    eval(diskContent);
    console.log('Disk version (UTF-8): SUCCESS');
} catch(e) {
    console.log('Disk version (UTF-8): ' + e.message.substring(0, 100));
}

// Save the git version (UTF-16 converted) as the fixed file
fs.writeFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', gitContent, 'utf8');
console.log('Saved git version as the fixed file');

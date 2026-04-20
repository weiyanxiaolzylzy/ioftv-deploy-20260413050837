// This script will add project-ifc as an inline module in app.js
var fs = require('fs');

// Read the working app.1063 file
var appPath = 'D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/app.1063e5d0b18f28247f69.js';
var appText = fs.readFileSync(appPath, 'utf8');

// Read the project-ifc content (as latin1 to get raw bytes)
var pifcBuf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js');
var pifcText = pifcBuf.toString('utf8');

// The project-ifc chunk starts after webpack wrapper
var chunkStart = pifcText.indexOf('"17aa":function');
var chunkEnd = pifcText.lastIndexOf('}]);');
if (chunkStart === -1 || chunkEnd === -1) {
    console.log('Could not find chunk boundaries');
    process.exit(1);
}

var chunkContent = pifcText.slice(chunkStart, chunkEnd + 3);
console.log('Chunk content length:', chunkContent.length);

// Add the chunk to the webpack modules
// Find the module object in app.js and add our chunk
// We need to modify the app.js webpackJsonp call

// Create a modified app.js with project-ifc as an inline module
var modifiedApp = appText;

// Find the position to insert the project-ifc module
// We look for a module definition like "LSD.bighome~project-ifc~secondview"
var insertMarker = '"LSD.bighome~project-ifc~secondview":function';

// Check if this exists in app.js
if (appText.indexOf(insertMarker) === -1) {
    console.log('Marker not found in app.js');
}

// Actually, the simplest approach is to just copy the working project-ifc.1063 file
// to the 3deb2 location and ensure it's served correctly

// Let's check if the 1063 project-ifc file is valid
try {
    new Function(pifcText);
    console.log('project-ifc.1063 is VALID!');
} catch(e) {
    console.log('project-ifc.1063 error:', e.message);
}

// Copy to 3deb2 location
fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', pifcText, 'utf8');
console.log('Copied to 3deb2 location');

// Now check if it's valid
var checkBuf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var checkText = checkBuf.toString('utf8');
console.log('3deb2 file length:', checkText.length);

try {
    new Function(checkText);
    console.log('3deb2 file is VALID!');
} catch(e) {
    console.log('3deb2 file error:', e.message);
}

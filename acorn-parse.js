var acorn = require('D:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
var fs = require('fs');
var text = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', 'utf8');

try {
    var ast = acorn.parse(text, {
        ecmaVersion: 2020,
        sourceType: 'script',
        allowReserved: true,
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true
    });
    console.log('Valid!');
} catch(e) {
    console.log('Error at pos:', e.pos, 'line:', e.loc ? e.loc.line : 'n/a');
    console.log('Message:', e.message);
    console.log('Context:', JSON.stringify(text.slice(Math.max(0, e.pos-40), e.pos+40)));
}

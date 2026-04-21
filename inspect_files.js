var fs = require('fs');

var paths = [
    ['backup', 'd:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js'],
    ['output', 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js'],
];

for (var pi = 0; pi < paths.length; pi++) {
    var name = paths[pi][0];
    var buf = fs.readFileSync(paths[pi][1]);
    var content = buf.toString('latin1');

    console.log('=== ' + name + ' ===');
    console.log('Bytes:', buf.length, 'Chars:', content.length);

    // First 100 chars
    console.log('FIRST 100 CHARS:');
    console.log(content.substring(0, 100));
    console.log('');

    // Last 200 chars
    console.log('LAST 200 CHARS:');
    console.log(content.substring(Math.max(0, content.length - 200)));
    console.log('');

    // Count backticks
    var bt = 0;
    for (var i = 0; i < content.length; i++) {
        if (content[i] === '`') bt++;
    }
    console.log('Backticks:', bt);

    // Count parentheses
    var open = 0, close = 0;
    for (var i = 0; i < content.length; i++) {
        if (content[i] === '(') open++;
        if (content[i] === ')') close++;
    }
    console.log('Parens: ( =', open, ') =', close, 'diff =', open - close);
    console.log('');
}

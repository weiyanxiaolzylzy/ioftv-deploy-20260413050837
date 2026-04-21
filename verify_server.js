var http = require('http');
var fs = require('fs');

console.log('=== Server Verification ===\n');

// Check server response
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        var str = buf.toString('utf8');
        console.log('Server Content-Length:', res.headers['content-length']);
        console.log('Server served bytes:', buf.length);
        console.log('String length:', str.length);
        
        // Check brackets
        var b=0, br=0, p=0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 123) b++;
            else if (c === 125) b--;
            else if (c === 91) br++;
            else if (c === 93) br--;
            else if (c === 40) p++;
            else if (c === 41) p--;
        }
        console.log('Brackets: b=' + b + ' br=' + br + ' p=' + p);
        
        // Check corruption
        var has17aa = str.indexOf('"17aa":function(t,e,s){"use strict";s("8920")}') >= 0;
        console.log('Has 17aa stub:', has17aa);
        var bt = (str.match(/\x60/g) || []).length;
        console.log('Backticks:', bt);
        
        // Check error positions
        console.log('\nChar at 16675:', JSON.stringify(str.charAt(16675)));
        console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
        
        console.log('\nStarts:', str.slice(0, 60));
        console.log('Ends:', JSON.stringify(str.slice(-15)));
        
        // Check disk matches server
        var disk = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
        console.log('\nDisk size:', disk.length, '| Server size:', buf.length);
        console.log('Disk matches server:', disk.equals(buf) ? 'YES' : 'NO');
        
        // Also check the other chunk
        http.get('http://localhost:8890/static/js/project-ifc.1063e5d0b18f28247f69.js', function(res2) {
            var chunks2 = [];
            res2.on('data', function(c) { chunks2.push(c); });
            res2.on('end', function() {
                var buf2 = Buffer.concat(chunks2);
                console.log('\n=== Other Chunk ===');
                console.log('Size:', buf2.length);
                console.log('Matches disk?:', buf2.equals(disk) ? 'YES' : 'NO');
            });
        });
    });
});

const http = require('http');
const fs = require('fs');

// Check disk file
const disk = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Disk size:', disk.length, 'bytes');
console.log('First 10 bytes hex:', disk.slice(0, 10).toString('hex'));
console.log('First char:', JSON.stringify(String.fromCharCode(disk[0])));

// Check server response
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        console.log('\nServer Content-Length:', res.headers['content-length']);
        console.log('Actual received:', buf.length, 'bytes');
        console.log('First 10 bytes hex:', buf.slice(0, 10).toString('hex'));
        
        var str = buf.toString('utf8');
        console.log('String length:', str.length);
        console.log('First char code:', str.charCodeAt(0));
        
        // Check brackets
        var b=0, br=0, p=0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            // Skip BOM
            if (i === 0 && c === 0xFEFF) continue;
            if (c === 123) b++;
            else if (c === 125) b--;
            else if (c === 91) br++;
            else if (c === 93) br--;
            else if (c === 40) p++;
            else if (c === 41) p--;
        }
        console.log('Brackets (skip BOM): b=' + b + ' br=' + br + ' p=' + p);
        
        // Check char at 16675
        if (str.length > 16675) {
            console.log('\nChar at 16675:', JSON.stringify(str.charAt(16675)));
            console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
        }
        
        // Check for corruption
        var has17aa = str.indexOf('"17aa":function(t,e,s){"use strict";s("8920")}') >= 0;
        console.log('\nHas 17aa stub:', has17aa);
        var hasBackticks = (str.match(/\x60/g) || []).length;
        console.log('Backticks:', hasBackticks);
        
        // Check start and end
        console.log('\nStarts:', str.slice(0, 60));
        console.log('Ends:', JSON.stringify(str.slice(-20)));
    });
});

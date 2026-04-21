var http = require('http');
var vm = require('vm');
var fs = require('fs');

// Fetch the file from server
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        var str = buf.toString('utf8');
        
        console.log('File size:', buf.length, 'bytes,', str.length, 'chars');
        console.log('First 10 bytes:', buf.slice(0, 10).toString('hex'));
        
        // Try to parse with acorn
        var acorn;
        try {
            acorn = require('acorn');
        } catch(e) {
            console.log('Acorn not available, trying eval test...');
        }
        
        if (acorn) {
            console.log('\n=== Acorn Parse Test ===');
            try {
                var result = acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
                console.log('Acorn parse: SUCCESS');
                console.log('AST body length:', result.body ? result.body.length : 'N/A');
            } catch(e2) {
                console.log('Acorn parse FAILED at pos', e2.pos, ':', e2.message);
                console.log('Context:', JSON.stringify(str.slice(Math.max(0, e2.pos - 30), e2.pos + 30)));
            }
        }
        
        // Try vm.Script to check syntax
        console.log('\n=== vm.Script Syntax Check ===');
        try {
            var script = new vm.Script(str, {
                filename: 'project-ifc.js',
                produceCachedData: false
            });
            console.log('vm.Script: SUCCESS (no syntax errors)');
        } catch(e3) {
            console.log('vm.Script FAILED:', e3.message);
            if (e3.lineNumber !== undefined) {
                console.log('Line:', e3.lineNumber, 'Col:', e3.columnNumber);
            }
        }
        
        // Also check the local disk file
        console.log('\n=== Local Disk File Check ===');
        var diskBuf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
        var diskStr = diskBuf.toString('utf8');
        
        try {
            var script2 = new vm.Script(diskStr, {
                filename: 'disk-project-ifc.js',
                produceCachedData: false
            });
            console.log('Disk vm.Script: SUCCESS');
        } catch(e4) {
            console.log('Disk vm.Script FAILED:', e4.message);
            if (e4.lineNumber !== undefined) {
                console.log('Line:', e4.lineNumber, 'Col:', e4.columnNumber);
            }
        }
        
        // Try acorn on disk file too
        if (acorn) {
            try {
                var result2 = acorn.parse(diskStr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
                console.log('Disk Acorn parse: SUCCESS');
            } catch(e5) {
                console.log('Disk Acorn parse FAILED at pos', e5.pos, ':', e5.message);
                console.log('Context:', JSON.stringify(diskStr.slice(Math.max(0, e5.pos - 30), e5.pos + 30)));
            }
        }
    });
});

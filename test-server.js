var http = require('http');

var req = http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(chunk) {
        chunks.push(chunk);
    });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        console.log('Server returned length:', buf.length);
        
        // Check for encoding issues
        var text = buf.toString('utf8');
        var latin1 = buf.toString('latin1');
        
        console.log('As UTF-8 length:', text.length);
        console.log('As latin1 length:', latin1.length);
        
        // Check first few Chinese chars
        var pos = text.indexOf('项目');
        if (pos > 0) {
            console.log('Chinese char at:', pos);
            console.log('UTF-8 bytes:', buf.slice(pos-3, pos+10).toString('hex'));
        }
        
        // Try to parse
        try {
            new Function(text);
            console.log('VALID JS from server!');
        } catch(e) {
            console.log('Server content invalid:', e.message);
        }
    });
});

req.on('error', function(e) {
    console.log('Request error:', e.message);
});

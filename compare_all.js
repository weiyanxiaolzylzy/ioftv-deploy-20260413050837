var http = require('http');

// The git file is UTF-16 LE encoded. Let's properly decode it.
// git file: 66022 bytes, 31660 null bytes (UTF-16 LE)
var fs = require('fs');
var gitBin = fs.readFileSync(process.env.TEMP + '/git_orig.bin');
console.log('Git binary size:', gitBin.length);

// Properly decode UTF-16 LE using Node.js built-in
var str16 = gitBin.toString('utf16le');
console.log('Proper UTF-16 LE string length:', str16.length);
console.log('Starts:', str16.slice(0, 80));

// The BOM issue: UTF-16 LE files may have 0xFEFF at start
// FF FE = little-endian marker at byte positions 0,1
// FE FF = big-endian marker at byte positions 0,1
console.log('First 2 bytes:', gitBin.slice(0, 2).toString('hex'));
console.log('Is LE BOM (fffe)?:', gitBin[0] === 0xff && gitBin[1] === 0xfe);

// Check if the actual content starts with BOM (FE FF at bytes 0,1 means BE)
// or if LE BOM (FF FE) is at bytes 0,1
// If ff fe, the 0xFEFF char is at bytes 0,1 in LE order = 0xFE 0xFF
// Wait, 0xFEFF in LE would be bytes: FF FE
if (gitBin[0] === 0xff && gitBin[1] === 0xfe) {
    console.log('File starts with LE BOM (FF FE)');
    // The string from byte 2 onwards is the actual content
    var str16Content = gitBin.slice(2).toString('utf16le');
    console.log('Content without BOM, length:', str16Content.length);
    console.log('Starts:', str16Content.slice(0, 80));
} else {
    console.log('No LE BOM found at start');
}

// Now check the bracket balance of the properly decoded string
var content = str16;
if (gitBin[0] === 0xff && gitBin[1] === 0xfe) {
    content = str16.slice(1); // skip BOM char
}
var b=0, br=0, p=0;
for (var i = 0; i < content.length; i++) {
    var c = content.charCodeAt(i);
    if (c === 123) b++;
    else if (c === 125) b--;
    else if (c === 91) br++;
    else if (c === 93) br--;
    else if (c === 40) p++;
    else if (c === 41) p--;
}
console.log('\nProper UTF-16 LE brackets: b=' + b + ' br=' + br + ' p=' + p);
console.log('Length:', content.length);

// Check at position 16675
console.log('\nChar at 16675:', JSON.stringify(content.charAt(16675)));
console.log('Context:', JSON.stringify(content.slice(16650, 16700)));

// Check start and end
console.log('\nStarts:', content.slice(0, 60));
console.log('Ends:', JSON.stringify(content.slice(-20)));

// Now serve this to check what the server sends
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', function(res) {
    var chunks = [];
    res.on('data', function(c) { chunks.push(c); });
    res.on('end', function() {
        var buf = Buffer.concat(chunks);
        console.log('\n=== Server Response ===');
        console.log('Size:', buf.length, 'bytes');
        var str = buf.toString('utf8');
        console.log('String length:', str.length);
        console.log('First 5 bytes:', buf.slice(0, 5).toString('hex'));
        
        // Check brackets
        b=0; br=0; p=0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 123) b++;
            else if (c === 125) b--;
            else if (c === 91) br++;
            else if (c === 93) br--;
            else if (c === 40) p++;
            else if (c === 41) p--;
        }
        console.log('Server brackets: b=' + b + ' br=' + br + ' p=' + p);
        
        // Check position 16675
        console.log('\nServer char at 16675:', JSON.stringify(str.charAt(16675)));
        console.log('Server context:', JSON.stringify(str.slice(16650, 16700)));
        console.log('Server ends:', JSON.stringify(str.slice(-20)));
        
        // Check if this matches the UTF-16 content
        console.log('\nMatch at 16675:', str.charAt(16675) === content.charAt(16675) ? 'YES' : 'NO - DIFFERENT!');
        
        // Also check the current on-disk file
        var diskBuf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
        var diskStr = diskBuf.toString('utf8');
        console.log('\nDisk file size:', diskBuf.length, 'bytes');
        console.log('Disk string length:', diskStr.length);
        console.log('Disk char at 16675:', JSON.stringify(diskStr.charAt(16675)));
        console.log('Disk context:', JSON.stringify(diskStr.slice(16650, 16700)));
        
        console.log('\nDisk matches server?:', diskStr === str ? 'YES' : 'NO');
        console.log('Disk matches UTF-16 original?:', diskStr === content ? 'YES' : 'NO');
    });
});

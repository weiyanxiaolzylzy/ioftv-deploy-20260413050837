var fs = require('fs');
var Iconv = require('iconv-lite');

var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Original length:', buf.length);

// Convert from the original encoding (likely GBK or similar)
var text = Iconv.decode(buf, 'gb18030');
console.log('Decoded length:', text.length);

// Check for remaining encoding issues
try {
    var outBuf = Iconv.encode(text, 'utf8');
    console.log('Re-encoded length:', outBuf.length);
    
    // Verify it's valid UTF-8
    var verify = outBuf.toString('utf8');
    console.log('Verify length:', verify.length);
    
    // Test syntax
    try {
        new Function(verify);
        console.log('VALID JS!');
    } catch(e) {
        console.log('Syntax error:', e.message);
    }
    
    // Save
    fs.writeFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', outBuf);
    console.log('Saved!');
} catch(e) {
    console.log('Iconv error:', e.message);
}

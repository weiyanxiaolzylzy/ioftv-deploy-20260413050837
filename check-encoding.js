var fs = require('fs');

// Read the backup file and extract correct content
var buf = fs.readFileSync('D:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');

// Check the first 100 bytes
console.log('First 100 bytes hex:', buf.slice(0, 100).toString('hex'));

// Convert to different encodings to find the right one
var encodings = ['utf8', 'latin1', 'gbk', 'gb2312', 'cp936'];
for (var i = 0; i < encodings.length; i++) {
    try {
        var text = buf.toString(encodings[i]);
        // Check if Chinese chars are readable
        var hasChinese = /[\u4e00-\u9fa5]/.test(text);
        console.log(encodings[i], '- has Chinese:', hasChinese, 'length:', text.length);
    } catch(e) {
        console.log(encodings[i], '- error:', e.message);
    }
}

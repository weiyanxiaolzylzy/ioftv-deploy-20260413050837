const http = require('http');
const fs = require('fs');

console.log('=== Final Verification ===\n');

// 1. Check Node.js server on 8890
http.get('http://localhost:8890/', (res) => {
    console.log('1. Node.js server (8890): OK - status', res.statusCode);
    
    // Check project-ifc chunk
    http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', (r2) => {
        const chunks = [];
        r2.on('data', c => chunks.push(c));
        r2.on('end', () => {
            const buf = Buffer.concat(chunks);
            const str = buf.toString('utf8');
            console.log('   project-ifc chunk: ' + buf.length + ' bytes');
            let b=0, br=0, p=0;
            for (const c of str) {
                if (c === '{') b++;
                else if (c === '}') b--;
                else if (c === '[') br++;
                else if (c === ']') br--;
                else if (c === '(') p++;
                else if (c === ')') p--;
            }
            console.log('   Brackets: b=' + b + ' br=' + br + ' p=' + p);
            console.log('   Ends: ' + JSON.stringify(str.slice(-10)));
            console.log('   Backticks: ' + ((str.match(/`/g)||[]).length));
        });
    });
});

// 2. Check Python FastAPI on 8765
http.get('http://localhost:8765/health', (res) => {
    console.log('2. Python FastAPI (8765): OK - status', res.statusCode);
});

// 3. Check IFC viewer on 5174
http.get('http://localhost:5174/', (res) => {
    console.log('3. IFC viewer (5174): OK - status', res.statusCode);
});

// 4. Check files on disk
console.log('\n4. Files on disk:');
const files = [
    'dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js',
    'dist/static/js/project-ifc.1063e5d0b18f28247f69.js',
    'dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js'
];
for (const f of files) {
    try {
        const disk = fs.readFileSync(f);
        let b=0, br=0, p=0;
        for (const byte of disk) {
            if (byte === 0x7B) b++;
            else if (byte === 0x7D) b--;
            else if (byte === 0x5B) br++;
            else if (byte === 0x5D) br--;
            else if (byte === 0x28) p++;
            else if (byte === 0x29) p--;
        }
        console.log('   ' + f.split('/').pop() + ': ' + disk.length + ' bytes, b=' + b + ' br=' + br + ' p=' + p);
    } catch(e) {
        console.log('   ' + f + ': ERROR - ' + e.message);
    }
}

const http = require('http');
const fs = require('fs');

console.log('=== Final Check ===\n');

// Check the file on disk
const disk = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Disk size:', disk.length, 'bytes');

// What does the server send?
http.get('http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', (res) => {
    console.log('Content-Length header:', res.headers['content-length']);
    console.log('Content-Encoding:', res.headers['content-encoding']);
    
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
        const buf = Buffer.concat(chunks);
        console.log('Actual served bytes:', buf.length);
        
        const str = buf.toString('utf8');
        console.log('As UTF-8 string:', str.length, 'chars');
        
        // Check brackets
        let b=0, br=0, p=0;
        for (const c of str) {
            if (c === '{') b++;
            else if (c === '}') b--;
            else if (c === '[') br++;
            else if (c === ']') br--;
            else if (c === '(') p++;
            else if (c === ')') p--;
        }
        console.log('Brackets: b=' + b + ' br=' + br + ' p=' + p);
        
        // Check at error position 16675
        if (str.length > 16675) {
            console.log('\nChar at 16675:', JSON.stringify(str.charAt(16675)));
            console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
        }
        
        // Check start and end
        console.log('\nStarts:', str.slice(0, 60));
        console.log('Ends:', JSON.stringify(str.slice(-20)));
        
        // Check for corruption indicators
        const has17aaStub = str.includes('"17aa":function(t,e,s){"use strict";s("8920")}');
        console.log('\nHas 17aa stub:', has17aaStub);
        
        const hasBackticks = (str.match(/`/g) || []).length;
        console.log('Backticks:', hasBackticks);
        
        // Check for null characters
        const nullCount = (str.match(/\0/g) || []).length;
        console.log('Null chars:', nullCount);
        
        // The git original has p=-2 (2 extra parens). Let's check
        // Maybe the UTF-16 BOM causes issues. Check if string starts with BOM
        console.log('\nFirst char code:', str.charCodeAt(0));
        
        if (str.charCodeAt(0) === 0xFEFF) {
            console.log('String starts with BOM (0xFEFF)');
            // Count parens without BOM
            let b2=0, br2=0, p2=0;
            for (let i = 1; i < str.length; i++) {
                const c = str[i];
                if (c === '{') b2++;
                else if (c === '}') b2--;
                else if (c === '[') br2++;
                else if (c === ']') br2--;
                else if (c === '(') p2++;
                else if (c === ')') p2--;
            }
            console.log('Brackets (without BOM): b=' + b2 + ' br=' + br2 + ' p=' + p2);
        }
    });
});
});

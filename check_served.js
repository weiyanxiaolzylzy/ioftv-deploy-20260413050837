const http = require('http');

const url = 'http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';
http.get(url, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
        const buf = Buffer.concat(chunks);
        console.log('=== HTTP Response Analysis ===');
        console.log('Content-Length:', res.headers['content-length']);
        console.log('Content-Encoding:', res.headers['content-encoding']);
        console.log('Total received bytes:', buf.length);
        
        // Try to parse as UTF-8 string
        let str;
        try {
            str = buf.toString('utf8');
            console.log('UTF-8 string length:', str.length);
        } catch(e) {
            console.log('UTF-8 decode FAILED:', e.message);
            // Try Latin-1
            str = buf.toString('latin1');
            console.log('Latin-1 string length:', str.length);
        }
        
        // Check bracket balance
        let b=0, br=0, p=0;
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (c === '{') b++;
            else if (c === '}') b--;
            else if (c === '[') br++;
            else if (c === ']') br--;
            else if (c === '(') p++;
            else if (c === ')') p--;
        }
        console.log('Brackets: b=' + b + ' br=' + br + ' p=' + p);
        
        // Check character at position 16675
        console.log('\nCharacter at pos 16675:', JSON.stringify(str.charAt(16675)));
        console.log('Char code:', str.charCodeAt(16675));
        console.log('Context:', JSON.stringify(str.slice(16650, 16700)));
        
        // Check the last 20 characters
        console.log('\nLast 20 chars:', JSON.stringify(str.slice(-20)));
        
        // Check for template literals
        const bt = (str.match(/`/g) || []).length;
        console.log('Backticks:', bt);
        
        // Check if file starts with webpackJsonp
        console.log('Starts with webpackJsonp:', str.startsWith('(window.webpackJsonp'));
        
        // Also check: is the file GZIP'd?
        // Check first 2 bytes for gzip magic number (0x1f 0x8b)
        console.log('\nFirst 2 bytes hex:', buf.slice(0, 2).toString('hex'));
        console.log('Is GZIP?:', buf[0] === 0x1f && buf[1] === 0x8b);
        
        // If it's gzip, decompress
        if (buf[0] === 0x1f && buf[1] === 0x8b) {
            console.log('\n=== GZIP compressed! Decompressing ===');
            const zlib = require('zlib');
            try {
                const decompressed = zlib.gunzipSync(buf);
                console.log('Decompressed size:', decompressed.length);
                const decompStr = decompressed.toString('utf8');
                console.log('Decompressed string length:', decompStr.length);
                
                // Check bracket balance of decompressed
                b=0; br=0; p=0;
                for (let i = 0; i < decompStr.length; i++) {
                    const c = decompStr[i];
                    if (c === '{') b++;
                    else if (c === '}') b--;
                    else if (c === '[') br++;
                    else if (c === ']') br--;
                    else if (c === '(') p++;
                    else if (c === ')') p--;
                }
                console.log('Decompressed brackets: b=' + b + ' br=' + br + ' p=' + p);
                
                console.log('\nChar at pos 16675:', JSON.stringify(decompStr.charAt(16675)));
                console.log('Context:', JSON.stringify(decompStr.slice(16650, 16700)));
                console.log('Last 20:', JSON.stringify(decompStr.slice(-20)));
            } catch(e2) {
                console.log('Decompress failed:', e2.message);
            }
        }
    });
});

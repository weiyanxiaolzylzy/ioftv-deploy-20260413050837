var fs = require('fs');
var cp = require('child_process');
var path = require('path');

// Get git log for this file
console.log('=== Git History for project-ifc.3deb2a0f ===');
try {
    var log = cp.execSync('git log --oneline -10 -- dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log(log);
} catch(e) {
    console.log('Git log error:', e.message);
}

// Check git show for HEAD version (without the M status changes)
console.log('=== Checking git HEAD (committed version) ===');
var tmpPath = path.join(process.env.TEMP || 'C:\\Users\\weiyanxiao\\AppData\\Local\\Temp', 'git_head.bin');
try {
    cp.execSync('git show HEAD:dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js > "' + tmpPath + '"', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'});
    var gitBuf = fs.readFileSync(tmpPath);
    console.log('Git HEAD size:', gitBuf.length, 'bytes');
    console.log('First 20 bytes hex:', gitBuf.slice(0, 20).toString('hex'));
    console.log('Null bytes:', (gitBuf.toString('binary').match(/\x00/g) || []).length);
} catch(e) {
    console.log('Git show error:', e.message);
}

// Check what commit the dist was built from
console.log('\n=== Last commit that modified dist/ ===');
try {
    var distLog = cp.execSync('git log --oneline -3 -- dist/', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log(distLog);
} catch(e) {
    console.log('Error:', e.message);
}

// Check the current disk file vs git HEAD
console.log('\n=== Current disk file ===');
var diskBuf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
console.log('Disk size:', diskBuf.length, 'bytes');
console.log('First 20 bytes hex:', diskBuf.slice(0, 20).toString('hex'));

if (fs.existsSync(tmpPath)) {
    var gitBuf = fs.readFileSync(tmpPath);
    console.log('\n=== Comparison ===');
    if (gitBuf.equals(diskBuf)) {
        console.log('Disk file MATCHES git HEAD: YES - perfect!');
    } else {
        console.log('Disk file MATCHES git HEAD: NO - different');
        console.log('Git HEAD size:', gitBuf.length, 'vs Disk:', diskBuf.length);
    }
}

// Check if disk file is valid JavaScript by looking for common issues
var str = diskBuf.toString('utf8');
console.log('\n=== JS Validity Checks ===');
console.log('String length:', str.length);

// Check for balanced quotes
var sq = 0, dq = 0, bt = 0;
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c === 39) sq++;
    else if (c === 34) dq++;
    else if (c === 96) bt++;
}
console.log('Single quotes:', sq, 'Double quotes:', dq, 'Backticks:', bt);

// Check for string escape issues (unclosed strings can cause SyntaxError)
// Look for long stretches without quotes that might indicate a broken string
var inString = false;
var stringChar = '';
var lastStringEnd = 0;
var problems = [];
for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
            lastStringEnd = i;
        }
    }
}
if (inString) {
    console.log('WARNING: Unclosed string detected at end of file!');
    console.log('String char:', stringChar);
    console.log('Started at ~', lastStringEnd);
    console.log('Context after last close:', JSON.stringify(str.slice(Math.max(0, lastStringEnd - 20), lastStringEnd + 50)));
}

// Check the specific area around position 16675 more carefully
console.log('\n=== Deep analysis at position 16675 ===');
console.log('Char at 16675:', JSON.stringify(str.charAt(16675)));
console.log('Char code:', str.charCodeAt(16675));

// Show broader context
console.log('Context 16600-16700:');
for (var i = 16600; i < Math.min(16700, str.length); i += 10) {
    var chunk = str.slice(i, i + 10);
    console.log('  ' + i + ':', JSON.stringify(chunk));
}

// Check if there are any control characters (other than \r \n \t)
var ctrlChars = [];
for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 32 && c !== 13 && c !== 10 && c !== 9) {
        ctrlChars.push({pos: i, code: c, char: str[i]});
    }
}
if (ctrlChars.length > 0) {
    console.log('\nWARNING: Found', ctrlChars.length, 'control characters:');
    ctrlChars.slice(0, 5).forEach(function(item) {
        console.log('  Pos', item.pos, ': code', item.code, '(0x' + item.code.toString(16) + ')');
    });
} else {
    console.log('\nNo control characters found (good!)');
}

// Also check position 16275
console.log('\n=== Analysis at position 16275 ===');
if (str.length > 16275) {
    console.log('Char:', JSON.stringify(str.charAt(16275)));
    console.log('Context 16250-16300:', JSON.stringify(str.slice(16250, 16300)));
}

// Try to find the actual syntax issue - look for patterns like unmatched parens/brackets in string literals
console.log('\n=== Bracket depth analysis ===');
var depth = 0, maxDepth = 0, maxPos = 0;
inString = false;
stringChar = '';
for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (!inString) {
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
        } else if (c === '{' || c === '[' || c === '(') {
            depth++;
            if (depth > maxDepth) {
                maxDepth = depth;
                maxPos = i;
            }
        } else if (c === '}' || c === ']' || c === ')') {
            depth--;
        }
    } else {
        if (c === stringChar && str[i-1] !== '\\') {
            inString = false;
        }
    }
}
console.log('Max depth:', maxDepth, 'at pos:', maxPos);
console.log('Final depth:', depth, '(should be 0)');
if (depth !== 0) {
    console.log('WARNING: Bracket mismatch! Check string literals.');
}

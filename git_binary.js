var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
var cp = require('child_process');
var path = require('path');

// Use git show with --no-pager and output to stdout, then pipe to node
// But on Windows, git show output might be encoded
// Let me try a different approach: use git cat-file

console.log("=== Direct git binary check ===");

// Check the git object directly
try {
    var result = cp.spawnSync("git", ["cat-file", "-p", "HEAD:dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"], {
        cwd: "d:/Roaming/ioftv-deploy-20260413050837",
        encoding: null, // binary output
        maxBuffer: 1024 * 1024
    });
    
    if (result.status === 0) {
        var buf = Buffer.from(result.stdout);
        console.log("git cat-file size:", buf.length, "bytes");
        console.log("First 10 bytes:", buf.slice(0, 10).toString("hex"));
        
        var str = buf.toString("utf8");
        console.log("As UTF-8 string length:", str.length);
        
        // Check for nulls
        var nullCount = 0;
        for (var i = 0; i < buf.length; i++) {
            if (buf[i] === 0) nullCount++;
        }
        console.log("Null bytes:", nullCount);
        
        // Bracket check
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 40) p++;
            else if (c === 41) p--;
        }
        console.log("Paren balance:", p);
        
        // Acorn
        try {
            acorn.parse(str, { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
            console.log("Acorn: SUCCESS!");
        } catch(e) {
            console.log("Acorn: FAILED at", e.pos, ":", e.message);
        }
    } else {
        console.log("git cat-file failed:", result.status);
        console.log("stderr:", result.stderr.toString());
    }
} catch(e) {
    console.log("Error:", e.message);
}

// Also check 1063e5d0
console.log("\n=== 1063e5d0 version ===");
try {
    var result2 = cp.spawnSync("git", ["cat-file", "-p", "HEAD:dist/static/js/project-ifc.1063e5d0b18f28247f69.js"], {
        cwd: "d:/Roaming/ioftv-deploy-20260413050837",
        encoding: null,
        maxBuffer: 1024 * 1024
    });
    
    if (result2.status === 0) {
        var buf2 = Buffer.from(result2.stdout);
        console.log("git cat-file size:", buf2.length, "bytes");
        console.log("First 10 bytes:", buf2.slice(0, 10).toString("hex"));
        
        var str2 = buf2.toString("utf8");
        console.log("As UTF-8 string length:", str2.length);
        
        var nullCount2 = 0;
        for (var i = 0; i < buf2.length; i++) {
            if (buf2[i] === 0) nullCount2++;
        }
        console.log("Null bytes:", nullCount2);
        
        var p2 = 0;
        for (var i = 0; i < str2.length; i++) {
            var c = str2.charCodeAt(i);
            if (c === 40) p2++;
            else if (c === 41) p2--;
        }
        console.log("Paren balance:", p2);
        
        try {
            acorn.parse(str2, { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
            console.log("Acorn: SUCCESS!");
        } catch(e) {
            console.log("Acorn: FAILED at", e.pos, ":", e.message);
        }
    }
} catch(e) {
    console.log("Error:", e.message);
}

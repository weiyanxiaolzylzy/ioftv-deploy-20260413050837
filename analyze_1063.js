var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
var cp = require('child_process');

// Get 1063e5d0 from git
try {
    var result = cp.spawnSync("git", ["cat-file", "-p", "HEAD:dist/static/js/project-ifc.1063e5d0b18f28247f69.js"], {
        cwd: "d:/Roaming/ioftv-deploy-20260413050837",
        encoding: null,
        maxBuffer: 1024 * 1024
    });
    
    if (result.status === 0) {
        var buf = Buffer.from(result.stdout);
        var str = buf.toString("utf8");
        console.log("1063e5d0 size:", buf.length, "bytes,", str.length, "chars");
        
        // Try acorn
        try {
            acorn.parse(str, { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
            console.log("Acorn: SUCCESS!");
        } catch(e) {
            console.log("Acorn: FAILED at", e.pos, ":", e.message);
            console.log("Line:", e.loc.line, "Col:", e.loc.column);
            
            // Show context
            console.log("\nContext at", e.pos + ":");
            console.log(JSON.stringify(str.slice(Math.max(0, e.pos - 50), e.pos + 50)));
            
            // Check what character
            console.log("\nChar at", e.pos + ":", JSON.stringify(str.charAt(e.pos)), "code:", str.charCodeAt(e.pos));
            
            // Check at position 16675 (the position from the user's error)
            console.log("\n=== Position 16675 analysis ===");
            if (str.length > 16675) {
                console.log("Char:", JSON.stringify(str.charAt(16675)), "code:", str.charCodeAt(16675));
                console.log("Context:", JSON.stringify(str.slice(16650, 16700)));
            } else {
                console.log("File only has", str.length, "chars. Position 16675 is OUT OF RANGE!");
                console.log("Last 50 chars:", JSON.stringify(str.slice(-50)));
            }
        }
        
        // Check for backticks (template literals)
        var bt = (str.match(/\x60/g) || []).length;
        console.log("\nBackticks:", bt);
        
        // Check the file structure
        console.log("\nFirst 50 chars:", str.slice(0, 50));
        console.log("Last 30 chars:", JSON.stringify(str.slice(-30)));
        
        // Check bracket balance
        var p=0, b2=0, br=0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 40) p++;
            else if (c === 41) p--;
            else if (c === 123) b2++;
            else if (c === 125) b2--;
            else if (c === 91) br++;
            else if (c === 93) br--;
        }
        console.log("Brackets: p=" + p + " b=" + b2 + " br=" + br);
        
        // Check if the disk version is the same
        var diskBuf = fs.readFileSync("d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js");
        console.log("\nDisk size:", diskBuf.length);
        console.log("Matches git:", diskBuf.equals(buf) ? "YES" : "NO");
        
        // Show file size comparison
        console.log("\nFile sizes:");
        console.log("3deb2a0f git:", 34406, "bytes, 32574 chars");
        console.log("1063e5d0 git:", buf.length, "bytes,", str.length, "chars");
        console.log("1063e5d0 disk:", diskBuf.length, "bytes");
        
        // The disk version of 1063e5d0 might be the working one
        if (!diskBuf.equals(buf)) {
            var diskStr = diskBuf.toString("utf8");
            console.log("\nDisk 1063e5d0 is DIFFERENT from git version!");
            var dp=0;
            for (var i = 0; i < diskStr.length; i++) {
                var c = diskStr.charCodeAt(i);
                if (c === 40) dp++;
                else if (c === 41) dp--;
            }
            console.log("Disk paren balance:", dp);
            
            try {
                acorn.parse(diskStr, { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
                console.log("Disk acorn: SUCCESS!");
            } catch(e2) {
                console.log("Disk acorn: FAILED at", e2.pos);
            }
            
            // Check at position 16675 in disk
            if (diskStr.length > 16675) {
                console.log("\nDisk char at 16675:", JSON.stringify(diskStr.charAt(16675)));
                console.log("Disk context:", JSON.stringify(diskStr.slice(16650, 16700)));
            }
        }
    }
} catch(e) {
    console.log("Error:", e.message);
}

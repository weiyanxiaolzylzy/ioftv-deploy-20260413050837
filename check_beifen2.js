var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
var cp = require('child_process');

// Check beifen directory
console.log("=== Beifen directory ===");
var beifenDir = "d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js";
var files = fs.readdirSync(beifenDir).filter(function(f) { return f.includes("project-ifc"); });
console.log("Files:", files);

files.forEach(function(f) {
    var fullPath = beifenDir + "/" + f;
    var buf = fs.readFileSync(fullPath);
    var str = buf.toString("utf8");
    
    var nullCount = 0;
    for (var i = 0; i < buf.length; i++) {
        if (buf[i] === 0) nullCount++;
    }
    
    var p = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c === 40) p++;
        else if (c === 41) p--;
    }
    
    var bt = (str.match(/\x60/g) || []).length;
    
    var ok = false;
    try {
        acorn.parse(str, { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
        ok = true;
    } catch(e) {}
    
    console.log("\n" + f + ":");
    console.log("  Size:", buf.length, "bytes,", str.length, "chars");
    console.log("  Null bytes:", nullCount, "(" + (nullCount/buf.length*100).toFixed(1) + "%)");
    console.log("  Paren balance:", p);
    console.log("  Backticks:", bt);
    console.log("  Acorn:", ok ? "OK" : "FAIL");
    
    if (ok) {
        console.log("  *** THIS VERSION IS CLEAN! ***");
    } else {
        // Try to get git version
        try {
            var result = cp.spawnSync("git", ["cat-file", "-p", "HEAD:dist/beifen/static/js/" + f], {
                cwd: "d:/Roaming/ioftv-deploy-20260413050837",
                encoding: null,
                maxBuffer: 1024 * 1024
            });
            
            if (result.status === 0) {
                var gitBuf = Buffer.from(result.stdout);
                var gitStr = gitBuf.toString("utf8");
                
                var gitNull = 0;
                for (var i = 0; i < gitBuf.length; i++) {
                    if (gitBuf[i] === 0) gitNull++;
                }
                
                var gitP = 0;
                for (var i = 0; i < gitStr.length; i++) {
                    var c = gitStr.charCodeAt(i);
                    if (c === 40) gitP++;
                    else if (c === 41) gitP--;
                }
                
                var gitBt = (gitStr.match(/\x60/g) || []).length;
                
                var gitOk = false;
                try {
                    acorn.parse(gitStr, { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
                    gitOk = true;
                } catch(e) {}
                
                console.log("  Git version:");
                console.log("    Size:", gitBuf.length, "bytes,", gitStr.length, "chars");
                console.log("    Null bytes:", gitNull);
                console.log("    Paren balance:", gitP);
                console.log("    Backticks:", gitBt);
                console.log("    Acorn:", gitOk ? "OK" : "FAIL");
                
                if (gitOk && !gitBuf.equals(buf)) {
                    console.log("  *** GIT VERSION IS CLEAN AND DIFFERENT! ***");
                }
            }
        } catch(e) {
            console.log("  Git error:", e.message);
        }
    }
});

// Check dist/original directory too
console.log("\n\n=== Original directory ===");
var origDir = "d:/Roaming/ioftv-deploy-20260413050837/dist/original/static/js";
if (fs.existsSync(origDir)) {
    var origFiles = fs.readdirSync(origDir).filter(function(f) { return f.includes("project-ifc"); });
    console.log("Files:", origFiles);
    
    origFiles.forEach(function(f) {
        var fullPath = origDir + "/" + f;
        var buf = fs.readFileSync(fullPath);
        var str = buf.toString("utf8");
        
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c === 40) p++;
            else if (c === 41) p--;
        }
        
        var ok = false;
        try {
            acorn.parse(str, { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
            ok = true;
        } catch(e) {}
        
        console.log("\n" + f + ":");
        console.log("  Size:", buf.length, "bytes,", str.length, "chars");
        console.log("  Paren balance:", p);
        console.log("  Acorn:", ok ? "OK" : "FAIL");
    });
}

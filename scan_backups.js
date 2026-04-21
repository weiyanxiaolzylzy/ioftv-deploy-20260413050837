var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');

console.log("=== Scanning ALL project-ifc backup files ===\n");

var searchDirs = [
    "d:/Roaming/ioftv-deploy-20260413050837/dist",
    "d:/Roaming/ioftv-deploy-20260413050837"
];

var results = [];

searchDirs.forEach(function(dir) {
    function scanDir(d) {
        try {
            var entries = fs.readdirSync(d);
            entries.forEach(function(entry) {
                var fullPath = d + "/" + entry;
                try {
                    var stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        scanDir(fullPath);
                    } else if (entry.includes("project-ifc") && entry.endsWith(".js")) {
                        var buf = fs.readFileSync(fullPath);
                        var str = buf.toString("utf8");
                        
                        var nullCount = 0;
                        for (var i = 0; i < Math.min(buf.length, 1000); i++) {
                            if (buf[i] === 0) nullCount++;
                        }
                        
                        var p = 0, b = 0, br = 0;
                        for (var i = 0; i < str.length; i++) {
                            var c = str.charCodeAt(i);
                            if (c === 40) p++;
                            else if (c === 41) p--;
                            else if (c === 123) b++;
                            else if (c === 125) b--;
                            else if (c === 91) br++;
                            else if (c === 93) br--;
                        }
                        
                        var bt = (str.match(/\x60/g) || []).length;
                        
                        var ok = false;
                        var acornError = "";
                        try {
                            acorn.parse(str, { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
                            ok = true;
                        } catch(e) {
                            acornError = e.pos + ": " + e.message;
                        }
                        
                        results.push({
                            path: fullPath.replace("d:/Roaming/ioftv-deploy-20260413050837/", ""),
                            size: buf.length,
                            nulls: nullCount,
                            p: p, b: b, br: br,
                            backticks: bt,
                            ok: ok,
                            error: acornError
                        });
                    }
                } catch(e) {}
            });
        } catch(e) {}
    }
    scanDir(dir);
});

// Sort: working first, then by size descending
results.sort(function(a, b) {
    if (a.ok !== b.ok) return b.ok - a.ok;
    if (a.size !== b.size) return b.size - a.size;
    return 0;
});

console.log("Found " + results.length + " files:\n");
results.forEach(function(r) {
    var status = r.ok ? "OK" : "FAIL";
    var nulls = r.nulls > 0 ? " NULLS=" + r.nulls : "";
    console.log("[" + status + "] " + r.path);
    console.log("  Size: " + r.size + " bytes | p=" + r.p + " b=" + r.b + " br=" + r.br + " bt=" + r.backticks + nulls);
    if (!r.ok) {
        console.log("  Error: " + r.error);
    }
    console.log("");
});

// Show the best working candidate
var working = results.find(function(r) { return r.ok; });
if (working) {
    console.log("=== BEST WORKING VERSION ===");
    console.log(working.path);
    console.log("Size: " + working.size + " bytes");
    
    // Copy to all locations
    var buf = fs.readFileSync("d:/Roaming/ioftv-deploy-20260413050837/" + working.path);
    
    var targets = [
        "d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js",
        "d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js",
        "d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
    ];
    
    targets.forEach(function(t) {
        fs.writeFileSync(t, buf);
        console.log("Restored to: " + t.replace("d:/Roaming/ioftv-deploy-20260413050837/", ""));
    });
    
    // Verify
    var verify = fs.readFileSync(targets[0]);
    try {
        acorn.parse(verify.toString("utf8"), { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
        console.log("\nVERIFIED: File parses successfully!");
    } catch(e) {
        console.log("\nVerify failed: " + e.pos);
    }
} else {
    console.log("NO WORKING VERSION FOUND!");
    console.log("\nLet me check if the error is only about p=-2 (which can be fixed)...");
    
    // Find the best candidate (smallest error)
    var candidates = results.filter(function(r) { return r.p === 0 && r.backticks === 0 && r.size > 30000; });
    if (candidates.length > 0) {
        console.log("Candidates with p=0 and no backticks:");
        candidates.forEach(function(c) {
            console.log("  " + c.path + " (" + c.size + " bytes) - " + c.error);
        });
    }
}

var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
var cp = require('child_process');

// Get git 1063e5d0
try {
    var result = cp.spawnSync("git", ["cat-file", "-p", "HEAD:dist/static/js/project-ifc.1063e5d0b18f28247f69.js"], {
        cwd: "d:/Roaming/ioftv-deploy-20260413050837",
        encoding: null,
        maxBuffer: 1024 * 1024
    });
    
    var buf = Buffer.from(result.stdout);
    var str = buf.toString("utf8");
    console.log("Git 1063e5d0 size:", buf.length, "bytes,", str.length, "chars");
    console.log("Starts:", str.slice(0, 70));
    console.log("Ends:", JSON.stringify(str.slice(-40)));
    console.log("Backticks:", (str.match(/\x60/g) || []).length);
    
    // Try acorn with different options
    var acornOpts = [
        {name: "script ES2020", opts: {ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true}},
        {name: "module ES2020", opts: {ecmaVersion: 2020, sourceType: "module"}},
        {name: "script ES2022", opts: {ecmaVersion: 2022, sourceType: "script", allowReturnOutsideFunction: true}},
        {name: "script ES6", opts: {ecmaVersion: 6, sourceType: "script", allowReturnOutsideFunction: true}},
    ];
    
    acornOpts.forEach(function(test) {
        try {
            acorn.parse(str, test.opts);
            console.log(test.name + ": SUCCESS!");
        } catch(e) {
            console.log(test.name + ": FAILED at " + e.pos + ": " + e.message);
        }
    });
    
    // Check if maybe the backticks are the issue
    console.log("\n=== Backtick analysis ===");
    var btPos = [];
    for (var i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) === 96) btPos.push(i);
    }
    console.log("Backtick positions:", btPos);
    btPos.forEach(function(pos) {
        console.log("  pos" + pos + ":", JSON.stringify(str.slice(Math.max(0, pos-20), pos+20)));
    });
    
    // Check: is the file actually complete?
    console.log("\n=== File completeness ===");
    console.log("Last char code:", str.charCodeAt(str.length - 1));
    console.log("Last 10 chars:", JSON.stringify(str.slice(-10)));
    
    // What if the file is MISSING the webpack push closing?
    // The webpack chunk format is: (window.webpackJsonp=...||[]).push([["name"],{...}])
    // Let me check: what comes AFTER the outer () grouping?
    // The outer () should close somewhere
    
    // Find where the outer ( at position 0 closes
    var depth = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c === 40) depth++;
        else if (c === 41) depth--;
    }
    console.log("Total paren balance:", depth);
    
    // So the git file has p=0 but is still broken
    // The error is at position 16675
    // Let me check: what if there are template literals that acorn doesn't handle?
    console.log("\n=== Error at 16675 ===");
    console.log("Char:", JSON.stringify(str.charAt(16675)));
    console.log("Context:", JSON.stringify(str.slice(16650, 16700)));
    
    // Check: maybe it's a different acorn issue
    // Let me try acorn's interpret function
    try {
        var Parser = require("d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn/dist/acorn.js").Parser;
        console.log("\nParser class found");
    } catch(e) {
        console.log("Parser not available:", e.message);
    }
    
    // Try: check if the issue is with the MODULE format
    // Maybe it's an ES module instead of script
    // Or maybe it uses dynamic import()?
    
    // Let me check: what if the file needs to be wrapped differently?
    // Try: webpackJsonp.push(...) without the outer ()
    console.log("\n=== Chunk format test ===");
    var idxPush = str.indexOf(".push(");
    console.log(".push( at:", idxPush);
    
    // The git file starts with: (window.webpackJsonp=...||[]).push(
    // Position 0: (
    // Position 40: ) -- this closes the outer grouping
    // Then: .push([["name"],{...}])
    // But the git file ends at 17682 bytes, which is roughly 16752 chars
    // And the error is at position 16675
    
    // What if the git file is just MISSING the closing?
    // Let me check: what's at the end?
    console.log("End content:", JSON.stringify(str.slice(-50)));
    
    // Find if the file has the closing }]); at the end
    var idxEnd = str.lastIndexOf("}];");
    console.log("}]; at:", idxEnd, "of", str.length);
    
    // The webpack chunk should end with }]); or }]);\n
    // If it doesn't have that, it's incomplete
    
    // Check if the git file has the proper webpack chunk closing
    if (str.slice(-10).indexOf("});") >= 0) {
        console.log("File ends with });");
    } else if (str.slice(-10).indexOf("}];") >= 0) {
        console.log("File ends with }];");
    } else {
        console.log("File does NOT end with standard webpack chunk closing!");
    }
    
} catch(e) {
    console.log("Error:", e.message);
}

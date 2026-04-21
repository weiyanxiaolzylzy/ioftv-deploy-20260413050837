var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
var cp = require('child_process');
var path = require('path');

console.log("=== Checking git for 1063e5d0 version ===");
try {
    var tmpPath = path.join(process.env.TEMP || "C:\\Users\\weiyanxiao\\AppData\\Local\\Temp", "git_1063.bin");
    cp.execSync('git show HEAD:dist/static/js/project-ifc.1063e5d0b18f28247f69.js > "' + tmpPath + '"', {cwd: "d:/Roaming/ioftv-deploy-20260413050837"});
    var buf = fs.readFileSync(tmpPath);
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
    console.log("1063e5d0 git: size=" + buf.length + " p=" + p + " acorn=" + (ok ? "OK" : "FAIL"));
    if (ok) {
        console.log("FOUND WORKING VERSION!");
        var targets = [
            "d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js",
            "d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js",
            "d:/Roaming/ioftv-deploy-20260413050837/dist/beifen/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
        ];
        targets.forEach(function(t) {
            fs.writeFileSync(t, buf);
            console.log("Saved to: " + t.split("/").pop());
        });
        var v = fs.readFileSync(targets[1]);
        try {
            acorn.parse(v.toString("utf8"), { ecmaVersion: 2020, sourceType: "script", allowReturnOutsideFunction: true });
            console.log("VERIFIED!");
        } catch(e2) {
            console.log("Verify failed: " + e2.pos);
        }
    }
} catch(e) {
    console.log("Error: " + e.message);
}

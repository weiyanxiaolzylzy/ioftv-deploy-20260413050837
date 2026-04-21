var fs = require('fs');
var vm = require('vm');

// Read the file
var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js');
var content = buf.toString('latin1');

console.log('File length:', content.length);

// Test if the file can be evaluated by Node's actual runtime (not --check)
try {
    var script = new vm.Script(content, {
        filename: 'project-ifc.js',
        produceCachedData: false,
        importModuleDynamically: undefined
    });

    // Try to create a context
    var context = {
        window: { webpackJsonp: [] },
        console: console
    };
    vm.createContext(context);

    script.runInContext(context, { timeout: 1000 });
    console.log('vm.Script evaluation: OK');
} catch(e) {
    console.log('vm.Script evaluation: FAIL');
    console.log('Error:', e.message.substring(0, 200));
    // Try to find position
    var m = e.message.match(/at position (\d+)/);
    if (m) {
        var pos = parseInt(m[1]);
        console.log('Position:', pos);
        console.log('Context:', JSON.stringify(content.substring(Math.max(0,pos-30), pos+30)));
    }
}

// Test if node -e can evaluate it
var subprocess = require('child_process');
var code = 'try{eval(require("fs").readFileSync("d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js","latin1"));console.log("eval: OK")}catch(e){console.log("eval FAIL:",e.message.substring(0,200))}';
var result = subprocess.spawnSync('node', ['-e', code], {encoding: 'utf8', timeout: 5000});
console.log('\nnode -e eval result:');
console.log('Exit:', result.status);
if (result.stdout) console.log('STDOUT:', result.stdout.substring(0, 200));
if (result.stderr) console.log('STDERR:', result.stderr.substring(0, 200));

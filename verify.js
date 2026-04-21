var subprocess = require('child_process');

var p = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';

var result = subprocess.spawnSync('node', ['--check', p], {encoding: 'utf8', timeout: 10000});
console.log('Exit:', result.status);
if (result.stdout) console.log('STDOUT:', result.stdout.substring(0, 300));
if (result.stderr) {
    var s = result.stderr;
    console.log('STDERR length:', s.length);
    // Show first 300 chars and last 100
    console.log('STDERR first 300:', s.substring(0, 300));
    console.log('STDERR last 100:', s.substring(Math.max(0, s.length - 100)));
}

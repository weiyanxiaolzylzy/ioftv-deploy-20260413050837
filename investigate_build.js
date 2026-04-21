var fs = require('fs');
var cp = require('child_process');

// Check how dist was built - look for build scripts or configs
console.log('=== Checking dist build process ===');

// Look for package.json with build scripts
var pkg;
try {
    pkg = JSON.parse(fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/package.json', 'utf8'));
    console.log('Root package.json scripts:', JSON.stringify(pkg.scripts, null, 2));
} catch(e) {}

// Check if there's a build script
console.log('\n=== Checking for build artifacts ===');
var distJs = fs.readdirSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js');
var chunks = distJs.filter(function(f) { return f.startsWith('project-ifc.') && f.endsWith('.js'); });
console.log('Project-ifc chunks:', chunks);

// Check the size of other chunks
chunks.forEach(function(f) {
    var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js/' + f);
    console.log(f + ':', buf.length, 'bytes');
});

// Check if there are other webpack chunks (app.js, chunk-vendors etc) that work
var jsFiles = fs.readdirSync('d:/Roaming/ioftv-deploy-20260413050837/dist/static/js');
console.log('\nAll JS files:', jsFiles.slice(0, 20));

// Check git log for dist changes
console.log('\n=== Git history for dist/ ===');
try {
    var log = cp.execSync('git log --oneline -10 -- dist/', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log(log);
} catch(e) {}

// Look for any other versions of project-ifc in git history
console.log('\n=== Git log for project-ifc chunk ===');
try {
    var log2 = cp.execSync('git log --all --oneline -10 -- "**/project-ifc*"', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log(log2);
} catch(e) {}

// Check the previous commit
console.log('\n=== Previous commit content ===');
try {
    var prevPath = process.env.TEMP + '/prev_commit.js';
    cp.execSync('git show HEAD~1:dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js > "' + prevPath + '"', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'});
    var prevBuf = fs.readFileSync(prevPath);
    console.log('Previous commit size:', prevBuf.length, 'bytes');
    console.log('First 20 bytes:', prevBuf.slice(0, 20).toString('hex'));
    
    var prevStr = prevBuf.toString('utf8');
    console.log('String length:', prevStr.length);
    
    // Check end
    console.log('Ends:', JSON.stringify(prevStr.slice(-20)));
    
    // Check at error position
    if (prevStr.length > 16274) {
        console.log('Char at 16274:', JSON.stringify(prevStr.charAt(16274)));
        console.log('Context:', JSON.stringify(prevStr.slice(16250, 16300)));
    }
    
    // Try acorn on previous version
    var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
    try {
        acorn.parse(prevStr, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        console.log('Previous version: Acorn SUCCESS');
    } catch(e2) {
        console.log('Previous version: Acorn FAILED at', e2.pos, ':', e2.message);
    }
} catch(e) {
    console.log('Error:', e.message);
}

// Check: maybe there's a source map or original source?
console.log('\n=== Checking for source files ===');
var srcFiles = [];
try {
    var srcDir = 'd:/Roaming/ioftv-deploy-20260413050837/src';
    srcFiles = fs.readdirSync(srcDir);
} catch(e) {
    console.log('No src/ directory');
}
console.log('Src files:', srcFiles);

// Look for Vue components that might generate the project-ifc chunk
console.log('\n=== Looking for project-ifc related code ===');
try {
    var src2 = cp.execSync('grep -r "project-ifc" --include="*.vue" --include="*.ts" --include="*.js" "d:/Roaming/ioftv-deploy-20260413050837/src" 2>/dev/null | head -10', {encoding: 'utf8'});
    console.log('Found in:', src2);
} catch(e) {}

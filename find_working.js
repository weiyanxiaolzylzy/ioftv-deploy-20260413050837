var fs = require('fs');
var acorn = require('d:/Roaming/ioftv-deploy-20260413050837/server/node_modules/acorn');
var cp = require('child_process');
var path = require('path');

// Check git for all versions of this file
console.log('=== Git versions of project-ifc chunk ===');
try {
    var gitLog = cp.execSync('git log --all --oneline -- dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log(gitLog);
} catch(e) { console.log('Error:', e.message); }

// Check git stash
try {
    var stash = cp.execSync('git stash list', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log('Git stash:', stash);
} catch(e) {}

// Check all branches
try {
    var branches = cp.execSync('git branch -a', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log('Branches:', branches);
} catch(e) {}

// Check git reflog
try {
    var reflog = cp.execSync('git reflog --all -20', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log('Reflog:', reflog);
} catch(e) {}

// Check if there's a file in git that is different from HEAD
console.log('\n=== Comparing git objects ===');
try {
    var tmpPath = path.join(process.env.TEMP || 'C:\\Users\\weiyanxiao\\AppData\\Local\\Temp', 'git_all.bin');
    
    // Try to get all commits that touched this file
    var commits = cp.execSync('git log --all --format=%H -- dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString().trim().split('\n');
    console.log('Found', commits.length, 'commits with this file');
    
    commits.forEach(function(commit) {
        if (commit) {
            try {
cp.execSync('git show ' + commit + ':dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js > "' + tmpPath + '"', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'});
                var buf = fs.readFileSync(tmpPath);
                var str = buf.toString('utf8');
                var p = 0;
                for (var i = 0; i < str.length; i++) {
                    var c = str.charCodeAt(i);
                    if (c === 40) p++;
                    else if (c === 41) p--;
                }
                var ok = false;
                try {
                    acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
                    ok = true;
                } catch(e) {}
                console.log('Commit', commit.slice(0, 7) + ': size=' + buf.length + ' p=' + p + ' acorn=' + (ok ? 'OK' : 'FAIL'));
            } catch(e2) {
                console.log('Commit', commit.slice(0, 7) + ': error - ' + e2.message);
            }
        }
    });
} catch(e) { console.log('Error:', e.message); }

// Check if there's a different hash version in git
console.log('\n=== All project-ifc files in git ===');
try {
    var lsTree = cp.execSync('git ls-tree -r HEAD -- dist/static/js/ | grep project-ifc', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log(lsTree);
} catch(e) {}

// Check git index (staged version)
console.log('\n=== Git index ===');
try {
    var diff = cp.execSync('git diff --cached -- dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    console.log('Staged diff length:', diff.length);
    if (diff.length > 0) {
        console.log('Staged diff preview:', diff.slice(0, 200));
    }
} catch(e) {}

// Check if there are any untracked files
console.log('\n=== Untracked files ===');
try {
    var untracked = cp.execSync('git ls-files --others --exclude-standard', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'}).toString();
    var pifcFiles = untracked.split('\n').filter(function(f) { return f && f.includes('project-ifc'); });
    console.log('Untracked project-ifc files:', pifcFiles.length);
    pifcFiles.forEach(function(f) {
        console.log('  ', f);
        try {
            var buf = fs.readFileSync('d:/Roaming/ioftv-deploy-20260413050837/' + f);
            var str = buf.toString('utf8');
            var p = 0;
            for (var i = 0; i < str.length; i++) {
                var c = str.charCodeAt(i);
                if (c === 40) p++;
                else if (c === 41) p--;
            }
            var ok = false;
            try {
                acorn.parse(str, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
                ok = true;
            } catch(e) {}
            console.log('    size=' + buf.length + ' p=' + p + ' acorn=' + (ok ? 'OK' : 'FAIL'));
        } catch(e2) {}
    });
} catch(e) {}

// Check if maybe the 1063e5d0 version is different from 3deb2a0f
console.log('\n=== Comparing hash versions ===');
try {
    var path1063 = path.join(process.env.TEMP || 'C:\\Users\\weiyanxiao\\AppData\\Local\\Temp', 'git_1063.bin');
    cp.execSync('git show HEAD:dist/static/js/project-ifc.1063e5d0b18f28247f69.js > "' + path1063 + '"', {cwd: 'd:/Roaming/ioftv-deploy-20260413050837'});
    var buf1063 = fs.readFileSync(path1063);
    var str1063 = buf1063.toString('utf8');
    var p1063 = 0;
    for (var i = 0; i < str1063.length; i++) {
        var c = str1063.charCodeAt(i);
        if (c === 40) p1063++;
        else if (c === 41) p1063--;
    }
    var ok1063 = false;
    try {
        acorn.parse(str1063, { ecmaVersion: 2020, sourceType: 'script', allowReturnOutsideFunction: true });
        ok1063 = true;
    } catch(e) {}
    console.log('1063e5d0 version: size=' + buf1063.length + ' p=' + p1063 + ' acorn=' + (ok1063 ? 'OK' : 'FAIL'));
} catch(e) { console.log('Error:', e.message); }

// The fundamental question: IS there any way to get a working version?
// Let me check: maybe we can use the webpack to rebuild
console.log('\n=== Webpack rebuild check ===');
var hasWebpack = fs.existsSync('d:/Roaming/ioftv-deploy-20260413050837/node_modules/.bin/webpack') || 
                fs.existsSync('d:/Roaming/ioftv-deploy-20260413050837/node_modules/.bin/webpack.cmd') ||
                fs.existsSync('d:/Roaming/ioftv-deploy-20260413050837/node_modules/webpack');
console.log('Has webpack:', hasWebpack);

// Check for webpack config
var webpackConfigs = fs.readdirSync('d:/Roaming/ioftv-deploy-20260413050837').filter(function(f) {
    return f.startsWith('webpack') && (f.endsWith('.js') || f.endsWith('.config.js'));
});
console.log('Webpack configs:', webpackConfigs);

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess, sys

filepath = r'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js'

# Use Node.js vm.Script to find exact error position
test_code = r'''
const fs = require('fs');
const vm = require('vm');

const content = fs.readFileSync('%s', 'latin1');
console.log('File read length:', content.length);
console.log('File bytes length:', fs.statSync('%s').size);

try {
    new vm.Script(content, { filename: 'project-ifc.js' });
    console.log('VALID');
} catch (e) {
    // Extract position from error
    const msg = e.message;
    console.log('ERROR:', msg);
    // Try to find position info
    const posMatch = msg.match(/at position (\d+)/);
    if (posMatch) {
        const pos = parseInt(posMatch[1]);
        console.log('Error at char pos:', pos);
        const start = Math.max(0, pos - 50);
        const end = Math.min(content.length, pos + 50);
        console.log('Context:', JSON.stringify(content.substring(start, end)));
        console.log('Char at pos:', content.charCodeAt(pos), '(char:', content[pos], ')');
        // Show surrounding chars
        for (var i = pos - 10; i < pos + 10; i++) {
            if (i < 0 || i >= content.length) continue;
            console.log('  pos', i, ':', content.charCodeAt(i), '(', JSON.stringify(content[i]), ')');
        }
    }
}
''' % (filepath, filepath)

result = subprocess.run(['node', '-e', test_code], capture_output=True, text=True, cwd='d:/Roaming/ioftv-deploy-20260413050837')
print(result.stdout)
if result.stderr:
    print('STDERR:', result.stderr)

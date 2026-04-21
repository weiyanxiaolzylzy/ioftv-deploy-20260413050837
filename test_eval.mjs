import fs from 'fs';

const filepath = 'd:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.1063e5d0b18f28247f69.js';
const content = fs.readFileSync(filepath, 'latin1');

console.log('File size:', content.length);
console.log('First 50 chars:', JSON.stringify(content.substring(0, 50)));
console.log('Last 50 chars:', JSON.stringify(content.substring(content.length - 50)));

// Count template literals
const backticks = (content.match(/`/g) || []).length;
console.log('Backticks:', backticks);

// Find template literal positions
let match;
const regex = /`/g;
const positions = [];
while ((match = regex.exec(content)) !== null) {
    const pos = match.index;
    const ctx = content.substring(Math.max(0, pos-30), pos+40);
    positions.push({pos, ctx: JSON.stringify(ctx)});
}
console.log('\nBacktick positions and contexts:');
for (const {pos, ctx} of positions) {
    console.log(`  pos ${pos}: ${ctx}`);
}

// Test eval
console.log('\nTrying to evaluate file...');
try {
    // eslint-disable-next-line no-eval
    eval(content);
    console.log('SUCCESS: File evaluates without error');
} catch (e) {
    console.log('ERROR:', e.message);
    // Try to find the position
    const match = e.message.match(/at position (\d+)/);
    if (match) {
        const pos = parseInt(match[1]);
        console.log('Error at position', pos);
        console.log('Context:', JSON.stringify(content.substring(Math.max(0, pos-50), pos+50)));
    } else {
        console.log('Could not extract position from error');
    }
}

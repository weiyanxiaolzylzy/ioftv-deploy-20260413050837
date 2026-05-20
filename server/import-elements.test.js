const test = require('node:test');
const assert = require('node:assert/strict');

const { buildImportElementsFromParse } = require('./index');

test('buildImportElementsFromParse keeps only assembly-level project components', () => {
    const result = buildImportElementsFromParse({
        elements: [
            {
                expressID: '100',
                globalId: 'assembly-gid',
                type: 'IFCELEMENTASSEMBLY',
                name: 'A-100',
                componentMark: '2509-3#JFGKL-15'
            },
            {
                expressID: '200',
                globalId: 'beam-gid',
                type: 'IFCBEAM',
                name: 'Beam child',
                componentMark: '2509-3#JFGKL-15',
                parentAssemblyExpressID: '100'
            }
        ],
        assemblySummaries: [
            {
                expressID: '100',
                globalId: 'assembly-gid',
                componentMark: '2509-3#JFGKL-15',
                mainSpec: 'HI300-8-10*160',
                positionCode: '7-8/H',
                childExpressIDs: ['200', '201']
            }
        ]
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].expressID, '100');
    assert.equal(result[0].type, 'IFCELEMENTASSEMBLY');
    assert.equal(result[0].componentMark, '2509-3#JFGKL-15');
    assert.equal(result[0].mainSpec, 'HI300-8-10*160');
    assert.equal(result[0].positionCode, '7-8/H');
    assert.deepEqual(result[0].childExpressIDs, ['200', '201']);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { parseIfcProducts } = require('./ifc-parser');

test('parseIfcProducts extracts assembly summary fields from single component IFC', async () => {
    const filePath = path.resolve(__dirname, '..', '3#JFGKL-15.ifc');
    const result = await parseIfcProducts(filePath, 200);

    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.assemblySummaries));
    assert.ok(result.assemblySummaries.length > 0);

    const summary = result.assemblySummaries.find((item) => item.componentMark === '2509-3#JFGKL-15');
    assert.ok(summary, 'expected assembly summary for 2509-3#JFGKL-15');

    assert.equal(summary.componentMark, '2509-3#JFGKL-15');
    assert.equal(summary.positionCode, '7-8/H');
    assert.equal(summary.bottomElevation, '+19.974');
    assert.equal(summary.topElevation, '+20.280');
    assert.equal(summary.length, 700);
    assert.equal(summary.width, 200);
    assert.equal(summary.area, 1.08355);
    assert.equal(summary.castUnitWeight, 35.1);
    assert.equal(summary.material, 'STEEL/Q355B');
    assert.equal(summary.mainSpec, 'HI300-8-10*160');
});

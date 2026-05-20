const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeQcStatus,
    mapRowToDefectType,
    computeQcActionState,
    canOutboundWithPendingReinspection
} = require('./qc-workflow');

test('normalizeQcStatus maps legacy statuses into qc workflow statuses', () => {
    assert.equal(normalizeQcStatus('合格'), '复检完成待出库');
    assert.equal(normalizeQcStatus('不合格'), '待复检');
    assert.equal(normalizeQcStatus('已出库'), '已出库');
    assert.equal(normalizeQcStatus(''), '待检测');
});

test('mapRowToDefectType maps form items into defect categories', () => {
    assert.equal(mapRowToDefectType({ itemName: '构件长度偏差' }), '构件长度');
    assert.equal(mapRowToDefectType({ itemName: '孔距检测' }), '孔距');
    assert.equal(mapRowToDefectType({ itemName: '节点连接板尺寸' }), '节点尺寸');
    assert.equal(mapRowToDefectType({ itemName: '未知项目' }), '未分类');
});

test('computeQcActionState blocks outbound when any row remains unqualified', () => {
    const state = computeQcActionState([
        { seq: 1, itemName: '构件长度偏差', verdict: '合格' },
        { seq: 2, itemName: '孔距检测', verdict: '不合格', toleranceText: '±3', designValue: '100', measuredValue: '104' }
    ]);

    assert.equal(state.hasNg, true);
    assert.equal(state.allPassed, false);
    assert.equal(state.ngRows.length, 1);
    assert.equal(state.defectStats.length, 1);
    assert.equal(state.defectStats[0].defectType, '孔距');
});

test('computeQcActionState allows outbound only when all rows are qualified', () => {
    const state = computeQcActionState([
        { seq: 1, itemName: '构件长度偏差', verdict: '合格' },
        { seq: 2, itemName: '孔距检测', verdict: '合格' }
    ]);

    assert.equal(state.hasNg, false);
    assert.equal(state.allPassed, true);
    assert.deepEqual(state.defectStats, []);
});

test('canOutboundWithPendingReinspection blocks outbound when pending task exists', () => {
    assert.equal(canOutboundWithPendingReinspection([{ status: '待复检' }]), false);
    assert.equal(canOutboundWithPendingReinspection([{ status: '已完成' }]), true);
    assert.equal(canOutboundWithPendingReinspection([]), true);
});

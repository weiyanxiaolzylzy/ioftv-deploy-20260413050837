const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeQcStatus,
    mapRowToDefectType,
    computeQcActionState,
    canOutboundWithPendingReinspection,
    summarizeDefectStatistics,
    buildQcRecordGroups,
    buildQcArchiveFileMeta
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

test('summarizeDefectStatistics aggregates fixed defect types and rates', () => {
    const summary = summarizeDefectStatistics({
        components: [
            { id: 'c1', qc_locked: true, first_pass_qualified: true },
            { id: 'c2', qc_result: '不合格', reinspection_count: 1 },
            { id: 'c3', qualified_at: '2026-05-20', first_pass_qualified: false }
        ],
        reinspectionTasks: [
            {
                component_id: 'c2',
                reinspection_date: '2026-05-21',
                defect_types_json: JSON.stringify([
                    { defectType: '孔距', count: 2 },
                    { defectType: '构件长度', count: 1 }
                ])
            },
            {
                component_id: 'c3',
                reinspection_date: '2026-05-22',
                defect_types_json: JSON.stringify([
                    { defectType: '孔距', count: 1 }
                ])
            }
        ]
    });

    assert.equal(summary.inspectedComponentCount, 3);
    assert.equal(summary.defectComponentCount, 2);
    assert.equal(summary.firstPassQualifiedCount, 1);
    assert.equal(summary.firstPassRate, 0.3333);

    const kongju = summary.defectTypes.find((item) => item.defectType === '孔距');
    const length = summary.defectTypes.find((item) => item.defectType === '构件长度');
    const jiban = summary.defectTypes.find((item) => item.defectType === '劲板尺寸');

    assert.ok(kongju);
    assert.equal(kongju.count, 3);
    assert.equal(kongju.componentCount, 2);
    assert.equal(kongju.componentRate, 0.6667);
    assert.equal(kongju.itemRate, 0.75);
    assert.equal(kongju.latestOccurredAt, '2026-05-22');

    assert.ok(length);
    assert.equal(length.count, 1);
    assert.equal(length.componentCount, 1);
    assert.equal(length.componentRate, 0.3333);
    assert.equal(length.itemRate, 0.25);

    assert.ok(jiban);
    assert.equal(jiban.count, 0);
    assert.equal(jiban.componentCount, 0);
    assert.equal(jiban.componentRate, 0);
    assert.equal(jiban.itemRate, 0);
});

test('buildQcRecordGroups deduplicates components and keeps latest record summary', () => {
    const groups = buildQcRecordGroups([
        {
            id: 'r1',
            project_id: 'p1',
            project_name: '项目A',
            component_id: 'c1',
            component_mark: 'GJ-001',
            inspection_date: '2026-05-19',
            qc_result: '不合格',
            is_outbound: false,
            reinspection_count: 0,
            created_at: '2026-05-19T10:00:00.000Z'
        },
        {
            id: 'r2',
            project_id: 'p1',
            project_name: '项目A',
            component_id: 'c1',
            component_mark: 'GJ-001',
            inspection_date: '2026-05-20',
            qc_result: '合格',
            is_outbound: true,
            outbound_date: '2026-05-20',
            reinspection_count: 1,
            report_file_name: 'GJ-001.pdf',
            created_at: '2026-05-20T12:00:00.000Z'
        },
        {
            id: 'r3',
            project_id: 'p2',
            project_name: '项目B',
            component_id: 'c2',
            component_mark: 'GJ-002',
            inspection_date: '2026-05-20',
            qc_result: '不合格',
            is_outbound: false,
            reinspection_count: 0,
            created_at: '2026-05-20T08:00:00.000Z'
        }
    ]);

    assert.equal(groups.outbound.length, 1);
    assert.equal(groups.pending.length, 1);
    assert.equal(groups.outbound[0].componentMark, 'GJ-001');
    assert.equal(groups.outbound[0].recordCount, 2);
    assert.equal(groups.outbound[0].hasReinspectionHistory, true);
    assert.equal(groups.outbound[0].latestRecordId, 'r2');
    assert.equal(groups.outbound[0].reportFileName, 'GJ-001.pdf');
    assert.equal(groups.pending[0].componentMark, 'GJ-002');
    assert.equal(groups.pending[0].statusLabel, '已检测未出库');
});

test('buildQcArchiveFileMeta creates stable archive path and safe file name', () => {
    const meta = buildQcArchiveFileMeta({
        projectId: 'p1',
        componentMark: '2509-2#1DGKL-1',
        recordId: 'qc-123',
        inspectionDate: '2026-05-20'
    });

    assert.equal(meta.directoryPath, 'storage/qc-reports/p1/2509-2_1DGKL-1');
    assert.equal(meta.fileName, '2509-2_1DGKL-1_2026-05-20_qc-123.pdf');
    assert.equal(meta.relativePath, 'storage/qc-reports/p1/2509-2_1DGKL-1/2509-2_1DGKL-1_2026-05-20_qc-123.pdf');
});

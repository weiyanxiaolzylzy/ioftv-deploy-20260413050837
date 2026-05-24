const DEFECT_TYPE_RULES = [
    { defectType: '扭曲旁弯', keywords: ['扭曲', '旁弯'] },
    { defectType: '构件长度', keywords: ['长度'] },
    { defectType: '构件截面', keywords: ['截面'] },
    { defectType: '孔距', keywords: ['孔距'] },
    { defectType: '节点尺寸', keywords: ['牛腿', '连接板', '节点'] },
    { defectType: '劲板尺寸', keywords: ['劲板'] }
];
const FIXED_DEFECT_TYPES = DEFECT_TYPE_RULES.map((item) => item.defectType);

function safeText(value) {
    return String(value || '').trim();
}

function safeComponentSegment(value, fallback = 'unknown-component') {
    const text = safeText(value);
    if (!text) return fallback;
    return text.replace(/[\\/:*?"<>|#\s]+/g, '_');
}

function normalizeQcStatus(raw) {
    const text = String(raw || '').trim();
    if (!text) return '待检测';
    if (['待检测', '检测中', '待复检', '复检完成待出库', '已出库'].includes(text)) return text;
    if (text === '合格') return '复检完成待出库';
    if (text === '不合格') return '待复检';
    return '待检测';
}

function buildDefectStats(rows) {
    const buckets = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
        if (!row || row.verdict !== '不合格') continue;
        const itemName = String(row.itemName || '').trim();
        const defectType = mapRowToDefectType(row);
        const key = defectType || '未分类';
        if (!buckets.has(key)) {
            buckets.set(key, {
                defectType: key,
                count: 0,
                items: []
            });
        }
        const bucket = buckets.get(key);
        bucket.count += 1;
        bucket.items.push({
            seq: row.seq || '',
            itemName,
            toleranceText: row.toleranceText || '',
            designValue: row.designValue || '',
            measuredValue: row.measuredValue || ''
        });
    }
    return Array.from(buckets.values());
}

function mapRowToDefectType(row) {
    const itemName = String((row && row.itemName) || '').trim();
    if (!itemName) return '未分类';
    const matched = DEFECT_TYPE_RULES.find((rule) =>
        rule.keywords.some((keyword) => itemName.includes(keyword))
    );
    return matched ? matched.defectType : '未分类';
}

function computeQcActionState(rows) {
    const allRows = Array.isArray(rows) ? rows : [];
    const ngRows = allRows.filter((row) => row && row.verdict === '不合格');
    const passRows = allRows.filter((row) => row && row.verdict === '合格');
    const hasRows = allRows.length > 0;
    const hasNg = ngRows.length > 0;
    const allPassed = hasRows && !hasNg && passRows.length === allRows.length;

    return {
        hasRows,
        hasNg,
        allPassed,
        ngRows,
        defectStats: buildDefectStats(ngRows)
    };
}

function canOutboundWithPendingReinspection(tasks) {
    const pending = (Array.isArray(tasks) ? tasks : []).some((task) => {
        const status = String(task && task.status || '').trim();
        return status === '待复检';
    });
    return !pending;
}

function safeDateValue(...values) {
    for (const value of values) {
        const text = String(value || '').trim();
        if (text) return text;
    }
    return '';
}

function createEmptyDefectBucket(defectType) {
    return {
        defectType,
        count: 0,
        componentCount: 0,
        componentRate: 0,
        itemRate: 0,
        latestOccurredAt: ''
    };
}

function sortRecordsDesc(a, b) {
    const left = safeDateValue(
        a && a.outbound_date,
        a && a.outboundDate,
        a && a.inspection_date,
        a && a.inspectionDate,
        a && a.created_at,
        a && a.createdAt
    );
    const right = safeDateValue(
        b && b.outbound_date,
        b && b.outboundDate,
        b && b.inspection_date,
        b && b.inspectionDate,
        b && b.created_at,
        b && b.createdAt
    );
    if (left === right) return 0;
    return left > right ? -1 : 1;
}

function mapQcRecordSummary(record) {
    return {
        id: safeText(record && record.id),
        projectId: safeText(record && (record.project_id || record.projectId)),
        projectName: safeText(record && (record.project_name || record.projectName)),
        componentId: safeText(record && (record.component_id || record.componentId)),
        componentMark: safeText(record && (record.component_mark || record.componentMark || record.component_name || record.componentName)),
        inspectionDate: safeText(record && (record.inspection_date || record.inspectionDate)),
        outboundDate: safeText(record && (record.outbound_date || record.outboundDate)),
        qcResult: safeText(record && (record.qc_result || record.qcResult)),
        isOutbound: !!(record && (record.is_outbound || record.isOutbound)),
        reportFileName: safeText(record && (record.report_file_name || record.reportFileName)),
        reportFilePath: safeText(record && (record.report_file_path || record.reportFilePath)),
        createdAt: safeText(record && (record.created_at || record.createdAt))
    };
}

function buildQcRecordGroups(records = []) {
    const buckets = new Map();
    for (const record of Array.isArray(records) ? records : []) {
        const componentId = safeText(record && (record.component_id || record.componentId));
        const componentMark = safeText(record && (record.component_mark || record.componentMark || record.component_name || record.componentName));
        const key = componentId || componentMark;
        if (!key) continue;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(record);
    }

    const grouped = Array.from(buckets.values()).map((list) => {
        const sorted = [...list].sort(sortRecordsDesc);
        const latest = sorted[0] || {};
        const latestSummary = mapQcRecordSummary(latest);
        const hasReinspectionHistory = sorted.length > 1 || Number(latest.reinspection_count || latest.reinspectionCount || 0) > 0;
        return {
            projectId: latestSummary.projectId,
            projectName: latestSummary.projectName,
            componentId: latestSummary.componentId,
            componentMark: latestSummary.componentMark,
            latestRecordId: latestSummary.id,
            latestInspectionDate: latestSummary.inspectionDate,
            latestOutboundDate: latestSummary.outboundDate,
            latestResult: latestSummary.qcResult,
            reportFileName: latestSummary.reportFileName,
            reportFilePath: latestSummary.reportFilePath,
            recordCount: sorted.length,
            hasReinspectionHistory,
            statusLabel: latestSummary.isOutbound ? '已出库' : '已检测未出库',
            records: sorted.map(mapQcRecordSummary)
        };
    });

    const outbound = grouped.filter((item) => item.statusLabel === '已出库').sort((a, b) => sortRecordsDesc(a.records[0], b.records[0]));
    const pending = grouped.filter((item) => item.statusLabel !== '已出库').sort((a, b) => sortRecordsDesc(a.records[0], b.records[0]));

    return { outbound, pending };
}

function buildQcArchiveFileMeta({ projectId, componentMark, recordId, inspectionDate }) {
    const safeMark = safeComponentSegment(componentMark);
    const safeProjectId = safeComponentSegment(projectId, 'unknown-project');
    const safeRecordId = safeComponentSegment(recordId, 'record');
    const safeInspectionDate = safeText(inspectionDate) || 'unknown-date';
    const directoryPath = `storage/qc-reports/${safeProjectId}/${safeMark}`;
    const fileName = `${safeMark}_${safeInspectionDate}_${safeRecordId}.pdf`;
    return {
        directoryPath,
        fileName,
        relativePath: `${directoryPath}/${fileName}`
    };
}

function summarizeDefectStatistics({ components = [], reinspectionTasks = [] } = {}) {
    const inspectedComponents = (Array.isArray(components) ? components : []).filter((component) => {
        if (!component) return false;
        return !!(
            component.qc_locked ||
            String(component.qc_result || '').trim() ||
            String(component.qualified_at || '').trim() ||
            String(component.outbound_at || '').trim() ||
            Number(component.reinspection_count || 0) > 0
        );
    });

    const inspectedComponentCount = inspectedComponents.length;
    const defectComponentSet = new Set();
    const firstPassQualifiedCount = inspectedComponents.filter((component) => !!component.first_pass_qualified).length;
    const buckets = new Map(FIXED_DEFECT_TYPES.map((defectType) => [defectType, {
        ...createEmptyDefectBucket(defectType),
        _componentIds: new Set()
    }]));

    let totalDefectItemCount = 0;
    for (const task of (Array.isArray(reinspectionTasks) ? reinspectionTasks : [])) {
        if (!task) continue;
        const componentId = String(task.component_id || task.componentId || '').trim();
        if (componentId) defectComponentSet.add(componentId);
        let defectTypes = [];
        if (Array.isArray(task.defect_types)) defectTypes = task.defect_types;
        else {
            try {
                defectTypes = JSON.parse(task.defect_types_json || '[]');
            } catch (e) {
                defectTypes = [];
            }
        }
        for (const item of defectTypes) {
            const defectType = FIXED_DEFECT_TYPES.includes(String(item && item.defectType || '').trim())
                ? String(item.defectType).trim()
                : null;
            if (!defectType) continue;
            const count = Number(item && item.count || 0);
            if (count <= 0) continue;
            totalDefectItemCount += count;
            const bucket = buckets.get(defectType);
            bucket.count += count;
            if (componentId) bucket._componentIds.add(componentId);
            const latestOccurredAt = safeDateValue(
                task.reinspection_date,
                task.reinspectionDate,
                task.inspection_date,
                task.inspectionDate,
                task.created_at,
                task.createdAt
            );
            if (latestOccurredAt && (!bucket.latestOccurredAt || latestOccurredAt > bucket.latestOccurredAt)) {
                bucket.latestOccurredAt = latestOccurredAt;
            }
        }
    }

    const defectTypes = FIXED_DEFECT_TYPES.map((defectType) => {
        const bucket = buckets.get(defectType);
        const componentCount = bucket._componentIds.size;
        return {
            defectType,
            count: bucket.count,
            componentCount,
            componentRate: inspectedComponentCount ? Number((componentCount / inspectedComponentCount).toFixed(4)) : 0,
            itemRate: totalDefectItemCount ? Number((bucket.count / totalDefectItemCount).toFixed(4)) : 0,
            latestOccurredAt: bucket.latestOccurredAt || ''
        };
    });

    return {
        inspectedComponentCount,
        defectComponentCount: defectComponentSet.size,
        firstPassQualifiedCount,
        firstPassRate: inspectedComponentCount ? Number((firstPassQualifiedCount / inspectedComponentCount).toFixed(4)) : 0,
        defectTypes
    };
}

module.exports = {
    DEFECT_TYPE_RULES,
    FIXED_DEFECT_TYPES,
    normalizeQcStatus,
    mapRowToDefectType,
    buildDefectStats,
    computeQcActionState,
    canOutboundWithPendingReinspection,
    summarizeDefectStatistics,
    buildQcRecordGroups,
    buildQcArchiveFileMeta
};

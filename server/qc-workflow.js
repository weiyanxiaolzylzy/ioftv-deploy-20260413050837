const DEFECT_TYPE_RULES = [
    { defectType: '扭曲旁弯', keywords: ['扭曲', '旁弯'] },
    { defectType: '构件长度', keywords: ['长度'] },
    { defectType: '构件截面', keywords: ['截面'] },
    { defectType: '孔距', keywords: ['孔距'] },
    { defectType: '节点尺寸', keywords: ['牛腿', '连接板', '节点'] },
    { defectType: '劲板尺寸', keywords: ['劲板'] }
];

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

module.exports = {
    DEFECT_TYPE_RULES,
    normalizeQcStatus,
    mapRowToDefectType,
    buildDefectStats,
    computeQcActionState,
    canOutboundWithPendingReinspection
};

function buildStableIfcComponentId(projectId, element) {
    const rawProjectId = String(projectId || '').trim();
    const globalId = element && element.globalId ? String(element.globalId).trim() : '';
    const expressId = element && element.expressID != null ? String(element.expressID).trim() : '';
    const stableKey = globalId || expressId;
    if (!rawProjectId || !stableKey) return '';
    return `ifc_${rawProjectId}_${stableKey}`;
}

function findStaleImportedComponentIds(projectId, existingComponents = [], latestElements = []) {
    const latestExpressIds = new Set(
        latestElements
            .map((el) => (el && el.expressID != null ? String(el.expressID).trim() : ''))
            .filter(Boolean)
    );

    return existingComponents
        .filter((component) => {
            const id = String(component && component.id ? component.id : '').trim();
            if (!id || !id.startsWith(`ifc_${projectId}_`)) return false;

            const ifcElementId = String(component && component.ifcElementId != null ? component.ifcElementId : '').trim();
            if (!ifcElementId) return false;

            return !latestExpressIds.has(ifcElementId);
        })
        .map((component) => String(component.id).trim());
}

module.exports = {
    buildStableIfcComponentId,
    findStaleImportedComponentIds
};

const fs = require('fs');
const WebIFC = require('web-ifc');

async function parseIfcProducts(filePath, limit = 8000) {
    const buf = await fs.promises.readFile(filePath);
    const api = new WebIFC.IfcAPI();
    await api.Init();
    const modelID = api.OpenModel(new Uint8Array(buf));

    const reverseTypeName = {};
    for (const k of Object.keys(WebIFC)) {
        const v = WebIFC[k];
        if (typeof v === 'number') reverseTypeName[v] = k;
    }

    const excludedTypes = new Set([
        WebIFC.IFCPROJECT,
        WebIFC.IFCSITE,
        WebIFC.IFCBUILDING,
        WebIFC.IFCBUILDINGSTOREY,
        WebIFC.IFCSPACE
    ]);

    const relDefines = api.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES) || null;
    const relDefinesSize = relDefines ? relDefines.size() : 0;
    const relDefinesMap = {};

    for (let i = 0; i < relDefinesSize; i++) {
        const relId = relDefines.get(i);
        if (relId == null) continue;
        try {
            const relLine = api.GetLine(modelID, relId, true);
            if (!relLine) continue;

            const propDef = relLine.RelatingPropertyDefinition;
            if (!propDef || !propDef.HasProperties) continue;

            const hasProps = propDef.HasProperties;
            const propSize = hasProps.length || 0;
            const propList = [];

            for (let j = 0; j < propSize; j++) {
                const prop = hasProps[j];
                if (!prop) continue;
                const propName = prop.Name && prop.Name.value ? String(prop.Name.value) : '';
                let propValue = '';
                if (prop.NominalValue) {
                    if (prop.NominalValue._internalValue !== undefined && prop.NominalValue._internalValue !== null) {
                        propValue = String(prop.NominalValue._internalValue);
                    } else if (prop.NominalValue.value !== undefined && prop.NominalValue.value !== null) {
                        propValue = String(prop.NominalValue.value);
                    }
                }
                if (propName) propList.push({ name: propName, value: propValue });
            }

            const relatedEntities = relLine.RelatedObjects;
            if (!relatedEntities) continue;
            const relSize = relatedEntities.length || 0;
            for (let j = 0; j < relSize; j++) {
                const ent = relatedEntities[j];
                if (!ent) continue;
                const numId = Number(ent.expressID);
                if (!Number.isNaN(numId) && propList.length > 0) {
                    if (!relDefinesMap[numId]) relDefinesMap[numId] = [];
                    for (const p of propList) {
                        if (!relDefinesMap[numId].some(existing => existing.name === p.name)) {
                            relDefinesMap[numId].push(p);
                        }
                    }
                }
            }
        } catch {}
    }

    const getComponentMark = (expressID) => {
        const props = relDefinesMap[expressID];
        if (!props) return '';
        const mark = props.find(p => p.name === 'Assembly/Cast unit Mark');
        return mark && mark.value ? mark.value : '';
    };

    const ELEMENT_TYPES = [
        WebIFC.IFCELEMENTASSEMBLY,
        WebIFC.IFCBEAM,
        WebIFC.IFCCOLUMN,
        WebIFC.IFCSLAB,
        WebIFC.IFCWALL,
        WebIFC.IFCMEMBER,
        WebIFC.IFCPLATE,
        WebIFC.IFCCURTAINWALL,
        WebIFC.IFCSTAIR,
        WebIFC.IFCRAMP,
        WebIFC.IFCDOOR,
        WebIFC.IFCWINDOW,
        WebIFC.IFCFURNISHINGELEMENT,
        WebIFC.IFCBUILDINGELEMENTPROXY,
    ].filter(Boolean);

    const allIds = [];
    for (const typeCode of ELEMENT_TYPES) {
        const ids = api.GetLineIDsWithType(modelID, typeCode);
        if (!ids) continue;
        const size = typeof ids.size === 'function' ? ids.size() : (ids.length || 0);
        for (let i = 0; i < size; i++) {
            const id = typeof ids.get === 'function' ? ids.get(i) : ids[i];
            if (id != null) allIds.push(id);
        }
    }

    const elements = [];
    for (const expressID of allIds) {
        if (elements.length >= limit) break;
        const line = api.GetLine(modelID, expressID, true);
        if (!line || excludedTypes.has(line.type)) continue;
        const typeName = reverseTypeName[line.type] || String(line.type);
        const globalId = line.GlobalId && line.GlobalId.value ? String(line.GlobalId.value) : '';
        const componentMark = getComponentMark(expressID);
        const lineName = (line.Name && line.Name.value ? String(line.Name.value) : '') ||
            (line.Tag && line.Tag.value ? String(line.Tag.value) : '') ||
            (line.ObjectType && line.ObjectType.value ? String(line.ObjectType.value) : '');
        const name = componentMark || lineName || globalId || `${typeName}-${expressID}`;

        elements.push({
            expressID: String(expressID),
            globalId,
            type: typeName,
            name,
            componentMark: componentMark || null
        });
    }

    const total = allIds.length;
    if (api.CloseModel) api.CloseModel(modelID);
    return {
        success: true,
        elements,
        total,
        truncated: elements.length < total
    };
}

module.exports = {
    parseIfcProducts
};

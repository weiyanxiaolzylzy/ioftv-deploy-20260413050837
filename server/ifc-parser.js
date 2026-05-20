const fs = require('fs');
const WebIFC = require('web-ifc');

function unwrapIfcValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'object') return value;
    if (value._internalValue !== undefined && value._internalValue !== null) return value._internalValue;
    if (value.value !== undefined && value.value !== null) return value.value;
    return null;
}

function normalizeString(value) {
    const raw = unwrapIfcValue(value);
    if (raw === null || raw === undefined) return '';
    return String(raw).trim();
}

function normalizeNumber(value) {
    const raw = unwrapIfcValue(value);
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    if (typeof raw === 'string') {
        const num = Number(String(raw).trim());
        return Number.isFinite(num) ? num : null;
    }
    return null;
}

function normalizeElevation(value) {
    const text = normalizeString(value);
    return text ? text.replace(/\s+/g, '') : '';
}

function firstNonEmptyString(values) {
    for (const value of values) {
        const text = normalizeString(value);
        if (text) return text;
    }
    return '';
}

function firstFiniteNumber(values) {
    for (const value of values) {
        const num = normalizeNumber(value);
        if (num != null) return num;
    }
    return null;
}

async function parseIfcProducts(filePath, limit = 8000) {
    const buf = await fs.promises.readFile(filePath);
    const api = new WebIFC.IfcAPI();
    await api.Init();
    const modelID = api.OpenModel(new Uint8Array(buf));

    try {
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

        const relDefinesMap = {};
        const relDefinesByTypeMap = {};
        const assemblyChildrenMap = {};
        const childParentAssemblyMap = {};
        const materialMap = {};

        const pushUniqueProp = (bucket, prop) => {
            if (!bucket.some((existing) => existing.name === prop.name && existing.value === prop.value)) {
                bucket.push(prop);
            }
        };

        const relDefines = api.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES) || null;
        const relDefinesSize = relDefines ? relDefines.size() : 0;
        for (let i = 0; i < relDefinesSize; i++) {
            const relId = relDefines.get(i);
            if (relId == null) continue;
            try {
                const relLine = api.GetLine(modelID, relId, true);
                if (!relLine) continue;

                const propDef = relLine.RelatingPropertyDefinition;
                if (!propDef) continue;

                const propList = [];

                if (Array.isArray(propDef.HasProperties)) {
                    for (const prop of propDef.HasProperties) {
                        if (!prop) continue;
                        const propName = normalizeString(prop.Name);
                        const propValue = unwrapIfcValue(prop.NominalValue);
                        if (propName) {
                            propList.push({
                                name: propName,
                                value: propValue == null ? '' : String(propValue).trim()
                            });
                        }
                    }
                }

                if (Array.isArray(propDef.Quantities)) {
                    for (const quantity of propDef.Quantities) {
                        if (!quantity) continue;
                        const quantityName = normalizeString(quantity.Name);
                        if (!quantityName) continue;

                        const quantityValue = firstFiniteNumber([
                            quantity.LengthValue,
                            quantity.AreaValue,
                            quantity.VolumeValue,
                            quantity.WeightValue,
                            quantity.CountValue,
                            quantity.TimeValue
                        ]);

                        if (quantityValue != null) {
                            propList.push({ name: quantityName, value: String(quantityValue) });
                        }
                    }
                }

                if (propList.length === 0 || !Array.isArray(relLine.RelatedObjects)) continue;

                for (const ent of relLine.RelatedObjects) {
                    if (!ent) continue;
                    const numId = Number(ent.expressID);
                    if (Number.isNaN(numId)) continue;
                    if (!relDefinesMap[numId]) relDefinesMap[numId] = [];
                    for (const prop of propList) pushUniqueProp(relDefinesMap[numId], prop);
                }
            } catch {}
        }

        const relDefinesByType = api.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYTYPE) || null;
        const relDefinesByTypeSize = relDefinesByType ? relDefinesByType.size() : 0;
        for (let i = 0; i < relDefinesByTypeSize; i++) {
            const relId = relDefinesByType.get(i);
            if (relId == null) continue;
            try {
                const relLine = api.GetLine(modelID, relId, true);
                if (!relLine || !Array.isArray(relLine.RelatedObjects) || !relLine.RelatingType) continue;
                const typeLine = relLine.RelatingType;
                const typeInfo = {
                    expressID: Number(typeLine.expressID),
                    name: firstNonEmptyString([typeLine.Name, typeLine.ObjectType]),
                    tag: normalizeString(typeLine.Tag)
                };
                for (const ent of relLine.RelatedObjects) {
                    if (!ent) continue;
                    const numId = Number(ent.expressID);
                    if (!Number.isNaN(numId) && !relDefinesByTypeMap[numId]) {
                        relDefinesByTypeMap[numId] = typeInfo;
                    }
                }
            } catch {}
        }

        const relAggregates = api.GetLineIDsWithType(modelID, WebIFC.IFCRELAGGREGATES) || null;
        const relAggregatesSize = relAggregates ? relAggregates.size() : 0;
        for (let i = 0; i < relAggregatesSize; i++) {
            const relId = relAggregates.get(i);
            if (relId == null) continue;
            try {
                const relLine = api.GetLine(modelID, relId, true);
                if (!relLine || !relLine.RelatingObject || !Array.isArray(relLine.RelatedObjects)) continue;

                const parentId = Number(relLine.RelatingObject.expressID);
                if (Number.isNaN(parentId)) continue;

                const parentLine = api.GetLine(modelID, parentId, false);
                if (!parentLine || parentLine.type !== WebIFC.IFCELEMENTASSEMBLY) continue;

                const childIds = [];
                for (const ent of relLine.RelatedObjects) {
                    if (!ent) continue;
                    const childId = Number(ent.expressID);
                    if (Number.isNaN(childId)) continue;
                    childIds.push(childId);
                    if (!childParentAssemblyMap[childId]) childParentAssemblyMap[childId] = parentId;
                }

                if (childIds.length > 0) assemblyChildrenMap[parentId] = childIds;
            } catch {}
        }

        const relAssociatesMaterial = api.GetLineIDsWithType(modelID, WebIFC.IFCRELASSOCIATESMATERIAL) || null;
        const relAssociatesMaterialSize = relAssociatesMaterial ? relAssociatesMaterial.size() : 0;
        for (let i = 0; i < relAssociatesMaterialSize; i++) {
            const relId = relAssociatesMaterial.get(i);
            if (relId == null) continue;
            try {
                const relLine = api.GetLine(modelID, relId, true);
                if (!relLine || !Array.isArray(relLine.RelatedObjects)) continue;
                const materialName = firstNonEmptyString([
                    relLine.RelatingMaterial && relLine.RelatingMaterial.Name,
                    relLine.RelatingMaterial && relLine.RelatingMaterial.Material && relLine.RelatingMaterial.Material.Name
                ]);
                if (!materialName) continue;
                for (const ent of relLine.RelatedObjects) {
                    if (!ent) continue;
                    const numId = Number(ent.expressID);
                    if (!Number.isNaN(numId) && !materialMap[numId]) {
                        materialMap[numId] = materialName;
                    }
                }
            } catch {}
        }

        const getProps = (expressID) => relDefinesMap[expressID] || [];
        const getPropValue = (expressID, ...names) => {
            const props = getProps(expressID);
            for (const name of names) {
                const prop = props.find((item) => String(item.name).toLowerCase() === String(name).toLowerCase());
                if (prop && prop.value !== undefined && prop.value !== null && String(prop.value).trim()) {
                    return String(prop.value).trim();
                }
            }
            return '';
        };

        const childAssemblyMarkMap = {};
        for (const [assemblyIdStr, childIds] of Object.entries(assemblyChildrenMap)) {
            const assemblyId = Number(assemblyIdStr);
            if (Number.isNaN(assemblyId)) continue;
            const assemblyLine = api.GetLine(modelID, assemblyId, false);
            const assemblyTag = normalizeString(assemblyLine && assemblyLine.Tag);
            const markValue = assemblyTag || getPropValue(assemblyId, 'Assembly/Cast unit Mark', 'Assembly/Cast unit mark');
            if (!markValue) continue;
            for (const childId of childIds) {
                if (!childAssemblyMarkMap[childId]) childAssemblyMarkMap[childId] = markValue;
            }
        }

        const getComponentMark = (expressID) => {
            const line = api.GetLine(modelID, expressID, false);
            const tagMark = normalizeString(line && line.Tag);
            if (line && line.type === WebIFC.IFCELEMENTASSEMBLY && tagMark) return tagMark;
            if (childAssemblyMarkMap[expressID]) return childAssemblyMarkMap[expressID];
            return getPropValue(expressID, 'Assembly/Cast unit Mark', 'Assembly/Cast unit mark');
        };

        const getAssemblySummary = (assemblyId) => {
            const assemblyLine = api.GetLine(modelID, assemblyId, false);
            if (!assemblyLine || assemblyLine.type !== WebIFC.IFCELEMENTASSEMBLY) return null;

            const childIds = assemblyChildrenMap[assemblyId] || [];
            const childLines = childIds
                .map((childId) => ({ id: childId, line: api.GetLine(modelID, childId, false) }))
                .filter((item) => item.line);

            const mainChild = childLines.find((item) => item.line.type === WebIFC.IFCBEAM)
                || childLines.find((item) => item.line.type === WebIFC.IFCMEMBER)
                || childLines[0]
                || null;

            const material = firstNonEmptyString([
                materialMap[assemblyId],
                mainChild && materialMap[mainChild.id]
            ]);

            const mainSpec = firstNonEmptyString([
                mainChild && mainChild.line.ObjectType,
                mainChild && mainChild.line.Name,
                mainChild && relDefinesByTypeMap[mainChild.id] && relDefinesByTypeMap[mainChild.id].name
            ]);

            const childReference = firstNonEmptyString([
                mainChild && normalizeString(mainChild.line.Tag),
                mainChild && getPropValue(mainChild.id, 'Reference')
            ]);

            return {
                expressID: String(assemblyId),
                globalId: normalizeString(assemblyLine.GlobalId),
                type: reverseTypeName[assemblyLine.type] || String(assemblyLine.type),
                componentMark: getComponentMark(assemblyId) || null,
                childExpressIDs: childIds.map((id) => String(id)),
                positionCode: getPropValue(assemblyId, 'Assembly/Cast unit position code'),
                bottomElevation: normalizeElevation(getPropValue(assemblyId, 'Assembly/Cast unit bottom elevation')),
                topElevation: normalizeElevation(getPropValue(assemblyId, 'Assembly/Cast unit top elevation')),
                length: firstFiniteNumber([
                    getPropValue(assemblyId, 'LENGTH_GROSS'),
                    getPropValue(assemblyId, 'LENGTH')
                ]),
                width: firstFiniteNumber([
                    getPropValue(assemblyId, 'Width'),
                    mainChild && getPropValue(mainChild.id, 'Width')
                ]),
                area: firstFiniteNumber([
                    getPropValue(assemblyId, 'AREA'),
                    mainChild && getPropValue(mainChild.id, 'OuterSurfaceArea'),
                    mainChild && getPropValue(mainChild.id, 'NetArea')
                ]),
                castUnitWeight: firstFiniteNumber([
                    getPropValue(assemblyId, 'Assembly/Cast unit weight'),
                    getPropValue(assemblyId, 'WEIGHT')
                ]),
                weightNet: firstFiniteNumber([
                    getPropValue(assemblyId, 'WEIGHT_NET'),
                    mainChild && getPropValue(mainChild.id, 'NetWeight')
                ]),
                weightGross: firstFiniteNumber([
                    getPropValue(assemblyId, 'WEIGHT_GROSS')
                ]),
                material: material || '',
                mainSpec: mainSpec || '',
                mainReference: childReference || '',
                childCount: childIds.length
            };
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
            const globalId = normalizeString(line.GlobalId);
            const componentMark = getComponentMark(expressID);
            const lineName = firstNonEmptyString([line.Name, line.Tag, line.ObjectType]);
            const name = componentMark || lineName || globalId || `${typeName}-${expressID}`;

            elements.push({
                expressID: String(expressID),
                globalId,
                type: typeName,
                name,
                componentMark: componentMark || null,
                parentAssemblyExpressID: childParentAssemblyMap[expressID] != null
                    ? String(childParentAssemblyMap[expressID])
                    : null
            });
        }

        const assemblyIds = Object.keys(assemblyChildrenMap)
            .map((value) => Number(value))
            .filter((value) => !Number.isNaN(value));
        const assemblySummaries = assemblyIds
            .map((assemblyId) => getAssemblySummary(assemblyId))
            .filter(Boolean);

        const total = allIds.length;
        return {
            success: true,
            elements,
            assemblySummaries,
            total,
            truncated: elements.length < total
        };
    } finally {
        if (api.CloseModel) api.CloseModel(modelID);
    }
}

module.exports = {
    parseIfcProducts
};

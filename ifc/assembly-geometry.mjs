export function buildAssemblyChildrenMap(rows = []) {
  const map = new Map();

  for (const row of rows) {
    const assemblyId = Number(row && row.expressID);
    const explicitChildren = Array.isArray(row && row.childExpressIDs) ? row.childExpressIDs : [];
    if (Number.isFinite(assemblyId) && explicitChildren.length) {
      if (!map.has(assemblyId)) map.set(assemblyId, []);
      const assemblyBucket = map.get(assemblyId);
      for (const childId of explicitChildren) {
        const numericChildId = Number(childId);
        if (!Number.isFinite(numericChildId) || numericChildId === assemblyId || assemblyBucket.includes(numericChildId)) continue;
        assemblyBucket.push(numericChildId);
      }
    }

    const parentId = Number(row && row.parentAssemblyExpressID);
    const childId = Number(row && row.expressID);
    if (!Number.isFinite(parentId) || !Number.isFinite(childId)) continue;
    if (parentId === childId) continue;
    if (!map.has(parentId)) map.set(parentId, []);
    const bucket = map.get(parentId);
    if (!bucket.includes(childId)) bucket.push(childId);
  }

  return map;
}

export function resolveExpressIdsForGeometry(expressID, assemblyChildrenMap) {
  const rootId = Number(expressID);
  if (!Number.isFinite(rootId)) return [];

  const result = [];
  const seen = new Set();
  const queue = [rootId];

  while (queue.length) {
    const current = queue.shift();
    if (!Number.isFinite(current) || seen.has(current)) continue;
    seen.add(current);
    result.push(current);

    const children = assemblyChildrenMap instanceof Map
      ? (assemblyChildrenMap.get(current) || [])
      : [];

    for (const childId of children) {
      const numericChildId = Number(childId);
      if (Number.isFinite(numericChildId) && !seen.has(numericChildId)) {
        queue.push(numericChildId);
      }
    }
  }

  return result;
}

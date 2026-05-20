import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAssemblyChildrenMap,
  resolveExpressIdsForGeometry
} from './assembly-geometry.mjs';

test('resolveExpressIdsForGeometry expands assembly expressID to child geometry ids', () => {
  const rows = [
    { expressID: 205727, type: 'IFCELEMENTASSEMBLY' },
    { expressID: 205728, type: 'IFCBEAM', parentAssemblyExpressID: 205727 },
    { expressID: 205729, type: 'IFCMEMBER', parentAssemblyExpressID: 205727 },
    { expressID: 205730, type: 'IFCPLATE', parentAssemblyExpressID: 205729 }
  ];

  const map = buildAssemblyChildrenMap(rows);
  const ids = resolveExpressIdsForGeometry(205727, map);

  assert.deepEqual(ids, [205727, 205728, 205729, 205730]);
});

test('resolveExpressIdsForGeometry returns the expressID itself when no child mapping exists', () => {
  const ids = resolveExpressIdsForGeometry(364885, new Map());
  assert.deepEqual(ids, [364885]);
});

test('resolveExpressIdsForGeometry expands assembly expressID from stored childExpressIDs when database has no child rows', () => {
  const rows = [
    { expressID: 205727, type: 'IFCELEMENTASSEMBLY', childExpressIDs: [205728, 205729] }
  ];

  const map = buildAssemblyChildrenMap(rows);
  const ids = resolveExpressIdsForGeometry(205727, map);

  assert.deepEqual(ids, [205727, 205728, 205729]);
});

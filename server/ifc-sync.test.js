const test = require('node:test');
const assert = require('node:assert/strict');

const { findStaleImportedComponentIds } = require('./ifc-sync');

test('findStaleImportedComponentIds only prunes auto-imported IFC components missing from latest model', () => {
    const projectId = 'p1';
    const existingComponents = [
        { id: 'ifc_p1_gid-a', ifcElementId: '100', ifcGlobalId: 'gid-a' },
        { id: 'ifc_p1_gid-b', ifcElementId: '101', ifcGlobalId: 'gid-b' },
        { id: 'ifc_p1_gid-c', ifcElementId: '102', ifcGlobalId: 'gid-c' },
        { id: 'manual-1', ifcElementId: '999', ifcGlobalId: 'gid-manual' },
        { id: 'manual-2', ifcElementId: '', ifcGlobalId: '' }
    ];
    const latestElements = [
        { expressID: '100', globalId: 'gid-a' },
        { expressID: '102', globalId: 'gid-c' },
        { expressID: '103', globalId: 'gid-d' }
    ];

    const staleIds = findStaleImportedComponentIds(projectId, existingComponents, latestElements);

    assert.deepEqual(staleIds, ['ifc_p1_gid-b']);
});

test('findStaleImportedComponentIds keeps components when latest model still contains the expressID', () => {
    const projectId = 'p1778747987463';
    const existingComponents = [
        { id: 'ifc_p1778747987463_3L_J0FRpfEMAaXocRDSrPd', ifcElementId: '161341', ifcGlobalId: '3L_J0FRpfEMAaXocRDSrPd' },
        { id: 'ifc_p1778747987463_3N8Y0mO2XA8uNRqKka$8DM', ifcElementId: '161319', ifcGlobalId: '3N8Y0mO2XA8uNRqKka$8DM' },
        { id: 'ifc_p1778747987463_legacy', ifcElementId: '100746', ifcGlobalId: 'legacy' }
    ];
    const latestElements = [
        { expressID: '161341', globalId: '3L_J0FRpfEMAaXocRDSrPd' },
        { expressID: '161319', globalId: '3N8Y0mO2XA8uNRqKka$8DM' }
    ];

    const staleIds = findStaleImportedComponentIds(projectId, existingComponents, latestElements);

    assert.deepEqual(staleIds, ['ifc_p1778747987463_legacy']);
});

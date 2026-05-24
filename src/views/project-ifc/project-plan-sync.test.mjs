import test from 'node:test'
import assert from 'node:assert/strict'

import { buildTodayPlanItemsFromSelection } from './project-plan-sync.mjs'

test('buildTodayPlanItemsFromSelection maps selected IFC rows to today-plan payload items', () => {
  const project = {
    id: 'p1',
    components: [
      {
        id: 'c1',
        name: '构件A',
        componentMark: 'GJ-001',
        spec: 'H300',
        teamId: 't1',
        teamName: '一班',
        teamLeader: '张三',
        selfInspector: '李四',
        qualityInspector: '王五',
        qualityManager: '赵六',
        planDate: '2026-05-20',
        status: '待检测',
        ifcElementId: '101',
        ifcGlobalId: 'gid-101',
        ifcType: 'IFCELEMENTASSEMBLY'
      },
      {
        id: 'c2',
        name: '构件B',
        componentMark: 'GJ-002',
        spec: 'H350',
        ifcElementId: '102'
      }
    ]
  }

  const selectedRows = [
    { expressID: '101' },
    { expressID: '999' }
  ]

  assert.deepEqual(buildTodayPlanItemsFromSelection(project, selectedRows), [
    {
      projectId: 'p1',
      componentId: 'c1',
      componentName: '构件A',
      componentMark: 'GJ-001',
      spec: 'H300',
      teamId: 't1',
      teamName: '一班',
      teamLeader: '张三',
      selfInspector: '李四',
      qualityInspector: '王五',
      qualityManager: '赵六',
      planDate: '2026-05-20',
      status: '待检测',
      ifcElementId: '101',
      ifcGlobalId: 'gid-101',
      type: 'IFCELEMENTASSEMBLY'
    }
  ])
})

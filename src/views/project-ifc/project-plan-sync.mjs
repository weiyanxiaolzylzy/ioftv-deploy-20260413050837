export function buildTodayPlanItemsFromSelection(project, selectedRows = []) {
  const projectId = project && project.id ? String(project.id) : ''
  const components = Array.isArray(project && project.components) ? project.components : []
  const selectedExpressIds = new Set((Array.isArray(selectedRows) ? selectedRows : []).map((row) => String(row && row.expressID != null ? row.expressID : '')).filter(Boolean))

  if (!projectId || !selectedExpressIds.size) return []

  return components
    .filter((component) => selectedExpressIds.has(String(component && component.ifcElementId != null ? component.ifcElementId : '')))
    .map((component) => ({
      projectId,
      componentId: component.id || '',
      componentName: component.name || component.componentMark || '',
      componentMark: component.componentMark || component.name || '',
      spec: component.spec || '',
      teamId: component.teamId || '',
      teamName: component.teamName || '',
      teamLeader: component.teamLeader || '',
      selfInspector: component.selfInspector || '',
      qualityInspector: component.qualityInspector || '',
      qualityManager: component.qualityManager || '',
      planDate: component.planDate || '',
      status: component.status || '待检测',
      ifcElementId: component.ifcElementId != null ? String(component.ifcElementId) : '',
      ifcGlobalId: component.ifcGlobalId || '',
      type: component.ifcType || ''
    }))
    .filter((item) => item.componentId)
}

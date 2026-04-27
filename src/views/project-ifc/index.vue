<template>
  <div class="project-ifc-page">
    <header class="pifc-header">
      <button type="button" class="pifc-back" @click="goHome">← 返回大屏</button>
      <div class="pifc-title">
        <span class="pifc-name" v-if="currentProject">项目构件管理 — {{ currentProject.name }}</span>
        <span class="pifc-name" v-else>项目构件管理</span>
        <span v-if="currentProject" class="pifc-sub">{{ (currentProject.province || '') + (currentProject.city || '') }}</span>
        <span v-else class="pifc-sub warn">{{ gateHint }}</span>
      </div>
    </header>

    <main class="pifc-main">
      <div v-if="currentProject && currentIfcUrl" class="pifc-body">
        <div class="pifc-viewer-pane">
          <AdvancedIfcViewer
            ref="ifcViewer"
            :ifcUrl="currentIfcUrl"
            :enablePick="true"
            :showElementList="false"
            :showHints="true"
            :backgroundColor="0x051020"
            :useIframeMode="true"
            :multiSelectMode="false"
            @element-click="onIfcElementClick"
            @element-dblclick="onIfcElementDblClick"
            @model-loaded="onIfcModelLoaded"
            @list-checkbox-selection="onListCheckboxSelection"
          />
        </div>
        <aside class="pifc-assign-panel">
          <div class="pifc-panel-title">批量指派</div>
          <p class="pifc-count">已选 <strong>{{ listSelectedCount }}</strong> 个构件</p>

          <hr class="pifc-divider" />

          <div class="pifc-field" v-for="fd in personFields" :key="fd.key">
            <label>{{ fd.label }}</label>
            <div class="pifc-dd" @click.stop>
              <div class="pifc-dd-trigger" @click="toggleDD(fd.key)">
                <span :class="{ 'pifc-dd-ph': !assignForm[fd.key] }">{{ assignForm[fd.key] || fd.placeholder }}</span>
                <span class="pifc-dd-arrow" :class="{ open: ddOpen[fd.key] }">▾</span>
              </div>
              <div v-show="ddOpen[fd.key]" class="pifc-dd-menu">
                <div v-for="(item, i) in personPresets[fd.key]" :key="i" class="pifc-dd-item" @click="pickPreset(fd.key, item)">
                  <span>{{ item }}</span>
                  <span class="pifc-dd-del" @click.stop="delPreset(fd.key, i)">×</span>
                </div>
                <div v-if="!ddAdding[fd.key]" class="pifc-dd-item pifc-dd-add" @click.stop="startAdd(fd.key)">+ 添加</div>
                <div v-else class="pifc-dd-add-row" @click.stop>
                  <input v-model="ddNewVal" class="pifc-dd-add-input" placeholder="输入" @keyup.enter="confirmAdd(fd.key)" />
                  <button class="pifc-dd-add-btn" @click="confirmAdd(fd.key)">✓</button>
                </div>
              </div>
            </div>
          </div>
          <div class="pifc-field">
            <label>计划检测日期</label>
            <input v-model="assignForm.planDate" type="date" class="pifc-input" />
          </div>
          <div class="pifc-field">
            <label>状态</label>
            <div class="pifc-dd" @click.stop>
              <div class="pifc-dd-trigger" @click="toggleDD('status')">
                <span :class="{ 'pifc-dd-ph': !assignForm.status }">{{ statusLabel }}</span>
                <span class="pifc-dd-arrow" :class="{ open: ddOpen.status }">▾</span>
              </div>
              <div v-show="ddOpen.status" class="pifc-dd-menu">
                <div v-for="(item, i) in personPresets.status" :key="i" class="pifc-dd-item" @click="pickPreset('status', item.value)">
                  <span>{{ item.label }}</span>
                  <span class="pifc-dd-del" @click.stop="delPreset('status', i)">×</span>
                </div>
                <div v-if="!ddAdding.status" class="pifc-dd-item pifc-dd-add" @click.stop="startAdd('status')">+ 添加</div>
                <div v-else class="pifc-dd-add-row" @click.stop>
                  <input v-model="ddNewVal" class="pifc-dd-add-input" placeholder="输入" @keyup.enter="confirmAddStatus" />
                  <button class="pifc-dd-add-btn" @click="confirmAddStatus">✓</button>
                </div>
              </div>
            </div>
          </div>

          <hr class="pifc-divider" />

          <button type="button" class="pifc-apply" :disabled="applyBusy" @click="applyAssignForm">
            {{ applyBusy ? '保存中…' : '应用' }}
          </button>
        </aside>
      </div>
      <div v-else-if="currentProject && !currentIfcUrl" class="pifc-no-ifc">
        <p>该项目尚未关联 IFC 模型。</p>
        <p class="hint">请返回大屏，在「管理项目」中为该项目上传或指定 IFC 后，再从该项目的「项目构件管理」进入。</p>
      </div>
      <div v-else class="pifc-no-ifc">
        <p>未指定项目。</p>
        <p class="hint">请在大屏点击「管理项目」，展开某一项目后，再点该行内的「项目构件管理」。</p>
      </div>
    </main>
  </div>
</template>

<script>
import AdvancedIfcViewer from '@/components/AdvancedIfcViewer.vue'
import { getAuthHeaders } from '@/utils'

const PIFC_PRESETS_KEY = 'pifc_assign_presets_v1'

export default {
  name: 'ProjectIfcPage',
  components: { AdvancedIfcViewer },
  data() {
    return {
      routeProjectId: '',
      currentProject: null,
      currentIfcUrl: '',
      listSelectedRows: [],
      assignForm: {
        teamName: '',
        teamLeader: '',
        qualityInspector: '',
        qualityManager: '',
        planDate: '',
        status: ''
      },
      applyBusy: false,
      combinations: [],
      selectedComboId: '',
      newComboLabel: '',
      personPresets: {
        teamName: [], teamLeader: [], qualityInspector: [], qualityManager: [],
        status: [
          { label: '不修改', value: '' },
          { label: '待检测', value: '待检测' },
          { label: '检测中', value: '检测中' },
          { label: '已完成', value: '已完成' },
          { label: '不合格', value: '不合格' }
        ]
      },
      // 班组列表（从后端 /api/groups 获取）
      groups: [],
      ddOpen: { teamName: false, teamLeader: false, qualityInspector: false, qualityManager: false, status: false },
      ddAdding: { teamName: false, teamLeader: false, qualityInspector: false, qualityManager: false, status: false },
      ddNewVal: ''
    }
  },
  computed: {
    gateHint() {
      if (!this.routeProjectId) return '请从大屏「管理项目」→ 展开项目 →「项目构件管理」进入（勿从地址栏单独打开本页）'
      return '未找到该项目，请返回大屏核对后重试'
    },
    listSelectedCount() {
      return (this.listSelectedRows && this.listSelectedRows.length) || 0
    },
    personFields() {
      return [
        { key: 'teamName', label: '制作班组', placeholder: '选择' },
        { key: 'teamLeader', label: '班组长', placeholder: '选择' },
        { key: 'qualityInspector', label: '质检员', placeholder: '选择' },
        { key: 'qualityManager', label: '质量员', placeholder: '选择' }
      ]
    },
    statusLabel() {
      const found = (this.personPresets.status || []).find(s => s.value === this.assignForm.status)
      return found ? found.label : (this.assignForm.status || '选择或添加')
    }
  },
  watch: {
    '$route.query': {
      deep: true,
      handler() {
        this.bootstrapFromRoute()
      }
    }
  },
  mounted() {
    this.assignForm.planDate = this.getTodayStr()
    this.loadAssignPresets()
    this.fetchGroups()        // 从后端获取班组列表
    this.loadPersonPresets()
    this.bootstrapFromRoute()
    document.addEventListener('click', this.closeAllDD)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeAllDD)
  },
  methods: {
    async fetchGroups() {
      try {
        const res = await fetch('/api/groups', { headers: getAuthHeaders() })
        const json = await res.json()
        // 后端返回数组或 { data: [...] } 两种格式兼容
        const list = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : [])
        this.groups = list
        // 同步到 personPresets.teamName
        this.personPresets.teamName = list.map(g => g.name).filter(Boolean)
      } catch (e) {
        console.warn('fetchGroups failed:', e)
        this.groups = []
        this.personPresets.teamName = []
      }
    },
    loadAssignPresets() {
      try {
        const raw = JSON.parse(localStorage.getItem(PIFC_PRESETS_KEY) || '{}')
        this.combinations = Array.isArray(raw.combinations) ? raw.combinations : []
      } catch (e) {
        this.combinations = []
      }
    },
    saveAssignPresets() {
      localStorage.setItem(PIFC_PRESETS_KEY, JSON.stringify({ combinations: this.combinations }))
    },
    applySelectedCombo() {
      const c = this.combinations.find((x) => x.id === this.selectedComboId)
      if (!c) return
      this.assignForm.teamName = c.teamName || ''
      this.assignForm.teamLeader = c.teamLeader || ''
      this.assignForm.qualityInspector = c.qualityInspector || ''
      this.assignForm.qualityManager = c.qualityManager || ''
      this.$Message && this.$Message.success('已套用固定配置（班组 + 班组长 + 质检员 + 质量员）')
    },
    deleteSelectedCombo() {
      if (!this.selectedComboId) return
      this.combinations = this.combinations.filter((c) => c.id !== this.selectedComboId)
      this.selectedComboId = ''
      this.saveAssignPresets()
      this.$Message && this.$Message.success('已删除该套固定配置')
    },
    saveCurrentCombination() {
      const label = (this.newComboLabel || '').trim()
      if (!label) {
        this.$Message && this.$Message.warning('请填写配置名称')
        return
      }
      const team = (this.assignForm.teamName || '').trim()
      const leader = (this.assignForm.teamLeader || '').trim()
      const inspector = (this.assignForm.qualityInspector || '').trim()
      const manager = (this.assignForm.qualityManager || '').trim()
      if (!team || !leader || !inspector || !manager) {
        this.$Message && this.$Message.warning('固定配置须四项齐全：班组、班组长、质检员、质量员均填写后再保存')
        return
      }
      if (this.combinations.length >= 50) {
        this.$Message && this.$Message.warning('固定配置已达上限 50 套，请先删除部分')
        return
      }
      this.combinations.push({
        id: 'c_' + Date.now(),
        label,
        teamName: team,
        teamLeader: leader,
        qualityInspector: inspector,
        qualityManager: manager
      })
      this.newComboLabel = ''
      this.saveAssignPresets()
      this.$Message && this.$Message.success('已保存为一套固定配置')
    },
    loadPersonPresets() {
      // teamLeader / qualityInspector / qualityManager / status 从 localStorage 恢复
      ['teamLeader', 'qualityInspector', 'qualityManager'].forEach(k => {
        try {
          const v = JSON.parse(localStorage.getItem('pifc_pp_' + k) || '[]')
          if (Array.isArray(v)) this.personPresets[k] = v
        } catch (e) { /* ignore */ }
      })
      // 状态从 localStorage 恢复，保留内置选项
      try {
        const saved = JSON.parse(localStorage.getItem('pifc_pp_status') || '[]')
        if (Array.isArray(saved) && saved.length) {
          const defaults = [
            { label: '不修改', value: '' },
            { label: '待检测', value: '待检测' },
            { label: '检测中', value: '检测中' },
            { label: '已完成', value: '已完成' },
            { label: '不合格', value: '不合格' }
          ]
          this.personPresets.status = [...defaults, ...saved]
        }
      } catch (e) { /* ignore */ }
    },
    savePersonPreset(field) {
      localStorage.setItem('pifc_pp_' + field, JSON.stringify(this.personPresets[field]))
    },
    toggleDD(key) {
      const was = this.ddOpen[key]
      this.closeAllDD()
      if (!was) this.$set(this.ddOpen, key, true)
    },
    closeAllDD() {
      Object.keys(this.ddOpen).forEach(k => { this.$set(this.ddOpen, k, false) })
      Object.keys(this.ddAdding).forEach(k => { this.$set(this.ddAdding, k, false) })
      this.ddNewVal = ''
    },
    pickPreset(field, val) {
      if (field === 'status') {
        this.assignForm.status = val
      } else {
        this.assignForm[field] = val
      }
      this.closeAllDD()
    },
    startAdd(key) {
      this.$set(this.ddAdding, key, true)
      this.ddNewVal = ''
    },
    confirmAdd(field) {
      const val = this.ddNewVal.trim()
      if (!val) return
      if (field === 'status') {
        if (!this.personPresets[field].some(s => s.value === val)) {
          this.personPresets[field].push({ label: val, value: val })
          this.savePersonPreset(field)
        }
        this.assignForm.status = val
      } else {
        if (!this.personPresets[field].includes(val)) {
          this.personPresets[field].push(val)
          this.savePersonPreset(field)
        }
        this.assignForm[field] = val
      }
      this.closeAllDD()
    },
    confirmAddStatus() {
      this.confirmAdd('status')
    },
    delPreset(field, idx) {
      if (field === 'status') {
        this.personPresets[field].splice(idx, 1)
      } else {
        this.personPresets[field].splice(idx, 1)
      }
      this.savePersonPreset(field)
    },
    getTodayStr() {
      const d = new Date()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${d.getFullYear()}-${m}-${day}`
    },
    goHome() {
      this.$router.push('/home/index').catch(() => {})
    },
    resolveIfcAbsUrl(u) {
      if (!u) return ''
      if (/^https?:\/\//i.test(u)) return u
      const origin = window.location.origin
      const path = u.startsWith('/') ? u : `/${u}`
      return `${origin}${path}`
    },
    readLocalProjects() {
      try {
        return JSON.parse(localStorage.getItem('cm_projects') || '[]')
      } catch (e) {
        return []
      }
    },
    writeLocalProjects(list) {
      localStorage.setItem('cm_projects', JSON.stringify(list))
    },
    persistLocalCmProjects(updated) {
      if (!updated || !updated.id) return
      const list = this.readLocalProjects()
      const i = list.findIndex(p => String(p.id) === String(updated.id))
      if (i >= 0) list[i] = { ...list[i], ...updated, components: updated.components || list[i].components }
      else list.push({ ...updated })
      this.writeLocalProjects(list)
      localStorage.setItem('cm_activeId', String(updated.id))
      if (this.$bus) {
        this.$bus.$emit('project-list-update', list)
        this.$bus.$emit('project-change', updated)
        this.$bus.$emit('project-ifc-change', updated.ifcUrl || '')
      }
    },
    async bootstrapFromRoute() {
      const q = this.$route.query || {}
      const projectId = q.projectId != null ? String(q.projectId) : ''
      this.routeProjectId = projectId

      if (!projectId) {
        this.currentProject = null
        this.currentIfcUrl = ''
        return
      }

      // 和 center-map.vue 保持一致：直接读 localStorage（同源）
      const list = this.readLocalProjects()
      let project = list.find(p => String(p.id) === projectId) || null

      // 若本地没有，尝试从服务器同步一次再读
      if (!project) {
        try {
          const res = await fetch('/api/projects', { headers: getAuthHeaders() })
          const data = await res.json()
          if (data && data.success && Array.isArray(data.data)) {
            project = data.data.find(p => String(p.id) === projectId) || null
          }
        } catch (e) {
          console.warn('project-ifc: api projects fallback error', e)
        }
      }

      this.currentProject = project
      const rawUrl = (project && project.ifcUrl) ? project.ifcUrl : ''
      this.currentIfcUrl = rawUrl ? this.resolveIfcAbsUrl(rawUrl) : ''
    },
    onListCheckboxSelection({ rows }) {
      this.listSelectedRows = Array.isArray(rows) ? rows.slice() : []
    },
    onIfcElementClick(element) {
      if (!element || !element.expressID || !this.currentProject) return
      localStorage.setItem('cm_selected_component', JSON.stringify({
        projectId: this.currentProject.id,
        ifcUrl: this.currentIfcUrl,
        expressID: element.expressID,
        name: element.componentMark || element.name || element.globalId || '',
        globalId: element.globalId || '',
        timestamp: Date.now()
      }))
    },
    onIfcElementDblClick(element) {
      if (this.$bus) {
        this.$bus.$emit('detection-element-selected', { element, ifcUrl: this.currentIfcUrl, source: 'project-ifc' })
        this.$bus.$emit('component-ifc-sync', {
          projectId: this.currentProject && this.currentProject.id,
          ifcUrl: this.currentIfcUrl,
          expressID: element.expressID,
          element
        })
      }
    },
    onIfcModelLoaded() {},
    async loadFreshProject() {
      if (!this.currentProject || !this.currentProject.id) return this.currentProject
      const targetId = String(this.currentProject.id)
      // 优先从 localStorage 读取（与 center-map.vue 一致）
      const list = this.readLocalProjects()
      let local = list.find(p => String(p.id) === targetId)
      if (local) {
        this.currentProject = local
        return local
      }
      // 回退到服务器
      try {
        const res = await fetch(`/api/projects/${targetId}`, { headers: getAuthHeaders() })
        const data = await res.json()
        if (data && data.success && data.data) {
          this.currentProject = data.data
          return data.data
        }
      } catch (e) {}
      return this.currentProject
    },
    ensureComponentsOnServer(project) {
      let p = project
      const planDate = this.assignForm.planDate || this.getTodayStr()
      const comps = JSON.parse(JSON.stringify(p.components || []))
      const projIfcUrl = this.currentIfcUrl || p.ifcUrl || ''
      for (const row of this.listSelectedRows) {
        const eid = String(row.expressID)
        if (comps.some(c => String(c.ifcElementId) === eid)) continue
        const c = {
          id: 'L' + Date.now() + '_' + eid,
          name: row.name || `构件-${eid}`,
          ifcElementId: eid,
          ifcGlobalId: row.globalId || '',
          ifcType: row.type || '',
          ifcUrl: projIfcUrl,
          spec: '',
          status: '待检测',
          planDate: planDate,
        }
        comps.push(c)
      }
      const updated = { ...p, components: comps, beamColumnCount: comps.length }
      if (projIfcUrl && !updated.ifcUrl) updated.ifcUrl = projIfcUrl
      this.currentProject = updated
      this.persistLocalCmProjects(updated)
      return Promise.resolve(updated)
    },
    applyAssignLocalMerge(project) {
      const planDate = this.assignForm.planDate || this.getTodayStr()
      const comps = JSON.parse(JSON.stringify(project.components || []))
      const sel = new Set(this.listSelectedRows.map(r => String(r.expressID)))
      const projIfcUrl = this.currentIfcUrl || project.ifcUrl || ''
      for (const row of this.listSelectedRows) {
        const eid = String(row.expressID)
        let c = comps.find(x => String(x.ifcElementId) === eid)
        if (!c) {
          c = {
            id: 'L' + Date.now() + '_' + eid,
            name: row.componentMark || row.name || `构件-${eid}`,
            ifcElementId: eid,
            ifcGlobalId: row.globalId || '',
            ifcType: row.type || '',
            ifcUrl: projIfcUrl,
            spec: '',
            status: '待检测'
          }
          comps.push(c)
        } else {
          // 已有构件若缺少 ifcUrl，补充进来（确保大屏能关联到模型）
          if (!c.ifcUrl) c.ifcUrl = projIfcUrl
        }
        if (this.assignForm.teamName.trim()) c.teamName = this.assignForm.teamName.trim()
        if (this.assignForm.teamLeader.trim()) c.teamLeader = this.assignForm.teamLeader.trim()
        if (this.assignForm.qualityInspector.trim()) c.qualityInspector = this.assignForm.qualityInspector.trim()
        if (this.assignForm.qualityManager.trim()) c.qualityManager = this.assignForm.qualityManager.trim()
        c.planDate = planDate
        if (this.assignForm.status) c.status = this.assignForm.status
      }
      const updated = { ...project, components: comps, beamColumnCount: comps.length }
      // 显式合并 ifcUrl，避免浅展开时丢失
      if (projIfcUrl && !updated.ifcUrl) updated.ifcUrl = projIfcUrl
      this.currentProject = updated
      this.persistLocalCmProjects(updated)
    },
    async applyAssignForm() {
      if (!this.currentProject || !this.currentProject.id) return
      if (!this.listSelectedRows.length) {
        this.$Message && this.$Message.warning('请先在左侧构件列表中勾选要指派的构件')
        return
      }
      const hasPerson =
        this.assignForm.teamName.trim() ||
        this.assignForm.teamLeader.trim() ||
        this.assignForm.qualityInspector.trim() ||
        this.assignForm.qualityManager.trim()
      if (!hasPerson && !this.assignForm.planDate) {
        this.$Message && this.$Message.warning('请至少填写计划日期或一项人员/班组信息')
        return
      }

      this.applyBusy = true
      try {
        const project = this.currentProject
        this.applyAssignLocalMerge(project)
        this.$Message && this.$Message.success(`已更新 ${this.listSelectedRows.length} 个构件`)
        if (this.$bus) this.$bus.$emit('project-list-update')
        if (this.$bus) this.$bus.$emit('project-change', this.currentProject)
        // 后台尝试同步到服务器
        this._syncBatchAssignToServer()
      } catch (e) {
        console.error(e)
        this.$Message && this.$Message.error('保存失败')
      } finally {
        this.applyBusy = false
      }
    },
    async _syncBatchAssignToServer() {
      const project = this.currentProject
      if (!project || !project.id) return
      try {
        const checkRes = await fetch(`/api/projects`, { headers: getAuthHeaders() })
        const checkData = await checkRes.json()
        const serverProjects = (checkData && checkData.success && Array.isArray(checkData.data)) ? checkData.data : []
        const existsOnServer = serverProjects.some(p => String(p.id) === String(project.id))
        if (!existsOnServer) {
          console.log('项目不在服务器上，跳过远程同步，本地数据已保存')
          return
        }
        const ids = (project.components || [])
          .filter(c => this.listSelectedRows.some(r => String(r.expressID) === String(c.ifcElementId)))
          .map(c => c.id)
        if (!ids.length) return
        const body = { ids }
        if (this.assignForm.teamName.trim()) body.teamName = this.assignForm.teamName.trim()
        if (this.assignForm.teamLeader.trim()) body.teamLeader = this.assignForm.teamLeader.trim()
        if (this.assignForm.qualityInspector.trim()) body.qualityInspector = this.assignForm.qualityInspector.trim()
        if (this.assignForm.qualityManager.trim()) body.qualityManager = this.assignForm.qualityManager.trim()
        body.planDate = this.assignForm.planDate || this.getTodayStr()
        if (this.assignForm.status) body.status = this.assignForm.status
        const res = await fetch(`/api/projects/${project.id}/components/batch-assign`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (data && data.success && data.project) {
          this.currentProject = data.project
          this.persistLocalCmProjects(data.project)
          console.log('batch-assign synced to server')
        }
      } catch (e) {
        console.warn('batch-assign server sync skipped:', e.message || e)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.project-ifc-page {
  width: 100vw;
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}
.pifc-header {
  flex-shrink: 0;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.pifc-back {
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  color: #333;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  &:hover {
    background: #e0e0e0;
    border-color: #b0b0b0;
  }
}
.pifc-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.pifc-name {
  color: #222;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.pifc-sub {
  color: #666;
  font-size: 12px;
  margin-top: 2px;
  &.warn {
    color: #e6a23c;
  }
}
.pifc-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pifc-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.pifc-viewer-pane {
  flex: 1;
  min-width: 0;
  position: relative;
  background: #e8e8e8;
}
/* 与左侧 ifc #ui-panel 一致：浅色卡片、圆角、阴影 */
.pifc-assign-panel {
  width: 420px;
  flex-shrink: 0;
  margin: 20px 20px 20px 0;
  align-self: stretch;
  box-sizing: border-box;
  padding: 28px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  gap: 0;
}
.pifc-divider {
  border: 0;
  border-top: 1px solid #e0e0e0;
  margin: 20px 0;
}
.pifc-panel-title {
  color: #111;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 6px;
  letter-spacing: 0.02em;
}
.pifc-count {
  color: #333;
  font-size: 13px;
  margin: 0 0 8px;
  padding: 10px 12px;
  background: #f5f6f8;
  border-radius: 6px;
  border: 1px solid #d0d5dd;
  strong {
    color: #0056b3;
    font-weight: 700;
  }
}
.pifc-panel-tip {
  font-size: 12px;
  color: #888;
  line-height: 1.45;
  margin: 0;
}
.pifc-preset-block {
  margin-bottom: 0;
  padding: 12px 12px 10px;
  border-radius: 6px;
  border: 1px solid #e6e8eb;
  background: #f8f9fa;
}
.pifc-preset-title {
  font-size: 14px;
  font-weight: 700;
  color: #222;
  margin-bottom: 8px;
}
.pifc-preset-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  .pifc-btn-secondary,
  .pifc-btn-danger {
    flex: 1;
  }
}
.pifc-btn-secondary,
.pifc-btn-danger {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #d9dde3;
  background: #eef0f3;
  color: #333;
  transition: background 0.15s, border-color 0.15s;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    border-color: #c5cad3;
    background: #e4e7ec;
  }
}
.pifc-btn-danger {
  border-color: #e8b4b4;
  color: #a61b1b;
  background: #fff5f5;
  &:hover:not(:disabled) {
    border-color: #e08080;
    background: #ffe8e8;
  }
}
.pifc-preset-save {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.pifc-preset-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: #888;
  line-height: 1.45;
}
.pifc-preset-lead {
  margin: 0 0 10px;
  font-size: 12px;
  color: #555;
  line-height: 1.45;
}
.pifc-bundle {
  margin-bottom: 12px;
  padding: 12px 12px 6px;
  border-radius: 6px;
  border: 1px solid #e6e8eb;
  border-left: 3px solid #0056b3;
  background: #fff;
}
.pifc-bundle-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.pifc-bundle-title {
  font-size: 14px;
  font-weight: 700;
  color: #222;
}
.pifc-bundle-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #e8f0ff;
  color: #0056b3;
  border: 1px solid #cfe0ff;
  font-weight: 600;
}
.pifc-bundle-tip {
  margin: 0 0 8px;
  font-size: 11px;
  color: #666;
  line-height: 1.45;
}
.pifc-field {
  margin-bottom: 16px;
  label {
    display: block;
    font-size: 13px;
    color: #444;
    font-weight: 600;
    margin-bottom: 6px;
  }
}
.pifc-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #d0d5dd;
  background: #fff;
  color: #222;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus {
    border-color: #86b7fe;
    box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.12);
  }
}
.pifc-apply {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #4a90e2;
  border-radius: 6px;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #5a9ff0, #4a8ec0);
    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}
.pifc-footnote {
  margin-top: 12px;
  font-size: 11px;
  color: #888;
  line-height: 1.45;
  strong {
    color: #333;
    font-weight: 600;
  }
}
.pifc-dd {
  position: relative;
}
.pifc-dd-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #d0d5dd;
  background: #fff;
  color: #222;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.15s;
  &:hover { border-color: #86b7fe; }
}
.pifc-dd-ph { color: #aaa; }
.pifc-dd-arrow {
  font-size: 11px;
  color: #999;
  transition: transform 0.2s;
  &.open { transform: rotate(180deg); }
}
.pifc-dd-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 2px;
  background: #fff;
  border: 1px solid #d9dde3;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  z-index: 120;
  max-height: 180px;
  overflow-y: auto;
}
.pifc-dd-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: #f0f5ff; }
}
.pifc-dd-del {
  font-size: 14px;
  color: #ccc;
  cursor: pointer;
  padding: 0 2px;
  &:hover { color: #e04040; }
}
.pifc-dd-add {
  color: #0d6efd;
  font-weight: 600;
  border-top: 1px solid #eee;
}
.pifc-dd-add-row {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-top: 1px solid #eee;
}
.pifc-dd-add-input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #d9dde3;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  &:focus { border-color: #86b7fe; }
}
.pifc-dd-add-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: #0d6efd;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  &:hover { background: #0b5ed7; }
}
.pifc-no-ifc {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  padding: 24px;
  text-align: center;
  .hint {
    margin-top: 8px;
    font-size: 12px;
    color: rgba(0, 212, 255, 0.5);
    max-width: 520px;
  }
}
</style>

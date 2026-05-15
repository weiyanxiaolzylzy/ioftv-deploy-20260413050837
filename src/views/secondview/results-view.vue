<template>
  <div class="results-page">
    <!-- ==================== 上部两栏布局 ==================== -->
    <div class="top-row">
      <!-- 左侧：质检报表简表（核心数据展示） -->
      <div class="panel panel-report-mini">
        <div class="panel-head-simple">
          <div class="head-title">
            <span class="title-text">质检数据</span>
            <span class="title-sep">|</span>
            <span class="component-name">{{ componentNo || '未选择构件' }}</span>
          </div>
          <div class="head-stats">
            <span class="stat-chip stat-chip--total">共 {{ totalItems }} 项</span>
            <span class="stat-chip stat-chip--ok">合格 {{ passItems }} 项</span>
            <span class="stat-chip stat-chip--ng">不合格 {{ ngItems }} 项</span>
          </div>
        </div>

        <!-- 原模板样式表格（可编辑） -->
        <div class="report-mini-body">
          <table class="report-table" ref="reportTable">
            <thead>
              <tr>
                <th class="col-seq">序号</th>
                <th class="col-item">检测项目</th>
                <th class="col-design">设计尺寸</th>
                <th class="col-tolerance">允许偏差</th>
                <th class="col-factory">出厂尺寸</th>
                <th class="col-factory2">出厂尺寸2</th>
                <th class="col-selfcheck">自检<br/>(实测值)</th>
                <th class="col-leader">班组长复核<br/>(偏差)</th>
                <th class="col-remark">备注</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in visibleRows"
                :key="row.key"
                :class="{ 'row-ng': row.verdict === '不合格' }"
              >
                <td class="col-seq">{{ row.seq }}</td>
                <td class="col-item">{{ row.itemName }}</td>
                <td class="col-design">{{ row.designValue }}</td>
                <td class="col-tolerance">{{ row.toleranceText }}</td>
                <td class="col-factory editable-cell">
                  <input
                    type="text"
                    class="table-input"
                    v-model="row.factoryValue"
                    @change="markDirty(row)"
                    placeholder="—"
                  />
                </td>
                <td class="col-factory2 editable-cell">
                  <input
                    type="text"
                    class="table-input"
                    v-model="row.factoryValue2"
                    @change="markDirty(row)"
                    placeholder="—"
                  />
                </td>
                <td class="col-selfcheck editable-cell">
                  <input
                    type="text"
                    class="table-input"
                    :class="{'input-error': row.verdict === '不合格'}"
                    v-model="row.measuredValue"
                    @input="recalcRow(row)"
                    placeholder="输入实测值"
                  />
                </td>
                <td class="col-leader" :class="row.deviationClass">
                  {{ formatSigned(row.deviation) }}
                </td>
                <td class="col-remark">
                  <span v-if="row.verdict === '不合格'" class="verdict-badge badge-ng">不合格</span>
                  <span v-else-if="row.verdict === '合格'" class="verdict-badge badge-ok">合格</span>
                  <span v-else class="verdict-badge badge-wait">待测</span>
                </td>
              </tr>
              <tr v-if="!visibleRows.length">
                <td colspan="9" class="empty-cell">暂无数据，请先选择模板</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 底部操作 -->
        <div class="report-mini-actions">
          <select v-model="selectedPresetId" class="preset-select" @change="loadPresetToEditor">
            <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.groupName }}</option>
          </select>
          <button class="btn btn-preset" @click="openPresetModal">预设管理</button>
          <div class="action-btns">
            <button class="btn btn-pdf" @click="exportPDF" :disabled="!canEdit || !selectedTemplateId || exporting">
              导出 PDF
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧：模型预览 -->
      <div class="panel panel-model" :class="{ 'is-fullscreen': modelFullscreen }">
        <div class="panel-head">
          <div class="model-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <span>3D 模型预览</span>
          </div>
          <div class="head-right">
            <select v-model="selectedIfcUrl" class="model-select" :disabled="loadingIfc || ifcFiles.length === 0">
              <option value="" disabled>选择模型</option>
              <option v-for="f in ifcFiles" :key="f.filename" :value="f.url">{{ f.originalName }}</option>
            </select>
            <select v-model="selectedTemplateId" class="model-select" @change="buildRows" :disabled="loadingTemplates">
              <option value="" disabled>选择模板</option>
              <option v-for="t in qcTemplates" :key="t.id" :value="t.id">{{ t.title }}</option>
            </select>
            <button class="head-btn" @click="toggleModelFullscreen">
              <svg v-if="!modelFullscreen" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="model-body" @click="handleModelClick">
          <div v-if="!selectedIfcUrl" class="model-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <div class="placeholder-text">选择 IFC 模型开始质检</div>
          </div>
          <div v-else class="model-content">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <div class="model-ready-text">模型已加载</div>
            <div class="model-hint">点击构件查看质检数据</div>
          </div>
        </div>
      </div>
    </div>


    <!-- 班组预设弹窗 -->
    <div v-if="showPresetModal" class="modal-mask" @click.self="closePresetModal">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">班组预设管理</div>
          <button class="modal-close" @click="closePresetModal">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-row">
            <div class="modal-k">选择预设</div>
            <select v-model="editPresetId" class="select" @change="loadPresetToEditor">
              <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.groupName }}</option>
            </select>
          </div>
          <div class="modal-row">
            <div class="modal-k">班组名称</div>
            <input v-model="presetEditor.groupName" class="modal-input" />
          </div>
          <div class="modal-grid">
            <div class="modal-field">
              <div class="modal-k">自检员</div>
              <input v-model="presetEditor.selfInspectorName" class="modal-input" />
            </div>
            <div class="modal-field">
              <div class="modal-k">班组长</div>
              <input v-model="presetEditor.teamLeaderName" class="modal-input" />
            </div>
            <div class="modal-field">
              <div class="modal-k">质检员</div>
              <input v-model="presetEditor.qualityInspectorName" class="modal-input" />
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" @click="resetPresetEditor">恢复默认</button>
          <div class="spacer"></div>
          <button class="btn" @click="closePresetModal">取消</button>
          <button class="btn btn-primary" @click="savePresetEditor">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { canEditFeature, getAuthHeaders } from '@/utils'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// 预设默认值（后端班组数据加载前使用，加载后会被覆盖）
const FALLBACK_GROUP_PRESETS = [
  { id: 'g1', groupName: '一班组', selfInspectorName: '', teamLeaderName: '', qualityInspectorName: '' },
  { id: 'g2', groupName: '二班组', selfInspectorName: '', teamLeaderName: '', qualityInspectorName: '' },
  { id: 'g3', groupName: '三班组', selfInspectorName: '', teamLeaderName: '', qualityInspectorName: '' },
  { id: 'g4', groupName: '四班组', selfInspectorName: '', teamLeaderName: '', qualityInspectorName: '' },
  { id: 'g5', groupName: '五班组', selfInspectorName: '', teamLeaderName: '', qualityInspectorName: '' }
]

const parseNumericTolerance = (text) => {
  if (!text) return null
  const s = String(text).trim()
  const pm = s.match(/±\s*([0-9]+(?:\.[0-9]+)?)/)
  if (pm) return Number(pm[1])
  const only = s.match(/^([0-9]+(?:\.[0-9]+)?)$/)
  if (only) return Number(only[1])
  const tail = s.match(/([0-9]+(?:\.[0-9]+)?)\s*$/)
  if (tail) return Number(tail[1])
  return null
}

const parseConditionalRule = (text) => {
  if (!text) return null
  const s = String(text).replace(/\s+/g, '')

  const range = s.match(/^([0-9]+(?:\.[0-9]+)?)≤[a-zA-Z]\w*≤([0-9]+(?:\.[0-9]+)?)[，,]?(?:±)?([0-9]+(?:\.[0-9]+)?)$/)
  if (range) return { type: 'range', min: Number(range[1]), max: Number(range[2]), tol: Number(range[3]) }

  const lt = s.match(/^[a-zA-Z]\w*[＜<]([0-9]+(?:\.[0-9]+)?)[，,]?(?:±)?([0-9]+(?:\.[0-9]+)?)$/)
  if (lt) return { type: 'lt', max: Number(lt[1]), tol: Number(lt[2]) }

  const gt = s.match(/^[a-zA-Z]\w*[＞>]([0-9]+(?:\.[0-9]+)?)[，,]?(?:±)?([0-9]+(?:\.[0-9]+)?)$/)
  if (gt) return { type: 'gt', min: Number(gt[1]), tol: Number(gt[2]) }

  return null
}

const computeCappedRatioTolerance = (text, designValue) => {
  if (!text || designValue == null) return null
  const s = String(text).replace(/\s+/g, '')
  const m = s.match(/^([a-zA-Z]\w*)\/([0-9]+(?:\.[0-9]+)?)(?:且|，|,)?不大于([0-9]+(?:\.[0-9]+)?)$/)
  if (!m) return null
  const divisor = Number(m[2])
  const cap = Number(m[3])
  if (!divisor || Number.isNaN(divisor) || Number.isNaN(cap)) return null
  return Math.min(Math.abs(Number(designValue)) / divisor, cap)
}

const chooseTolerance = (toleranceTexts, designValue) => {
  const texts = Array.isArray(toleranceTexts) ? toleranceTexts : []

  for (const t of texts) {
    const rule = parseConditionalRule(t)
    if (!rule) continue
    if (rule.type === 'range' && designValue >= rule.min && designValue <= rule.max) return { tol: rule.tol, text: t }
    if (rule.type === 'lt' && designValue < rule.max) return { tol: rule.tol, text: t }
    if (rule.type === 'gt' && designValue > rule.min) return { tol: rule.tol, text: t }
  }

  for (const t of texts) {
    const ratioTol = computeCappedRatioTolerance(t, designValue)
    if (ratioTol != null && !Number.isNaN(ratioTol)) return { tol: ratioTol, text: t }
  }

  for (const t of texts) {
    const tol = parseNumericTolerance(t)
    if (tol != null && !Number.isNaN(tol)) return { tol, text: t }
  }

  return { tol: null, text: texts[0] || '' }
}

const seededNumber = (seed) => {
  let x = 0
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0
  return x / 0xffffffff
}

// 与主页面班组设置保持一致，以 /api/groups 为准；加载前使用默认占位
const DEFAULT_GROUP_PRESETS = FALLBACK_GROUP_PRESETS

export default {
  name: 'ResultsView',
  data() {
    return {
      modelFullscreen: false,
      loadingTemplates: false,
      loadingIfc: false,
      exporting: false,
      qcTemplates: [],
      selectedTemplateId: '',
      ifcFiles: [],
      selectedIfcUrl: '',
      componentNo: '',
      selectedComponentDetail: null,
      rowFilter: 'all',
      rows: [],
      activeProjectName: '',
      cameraNow: '',
      cameraTimer: null,
      presets: DEFAULT_GROUP_PRESETS.slice(),
      selectedPresetId: 'g1',
      showPresetModal: false,
      editPresetId: 'g1',
      presetEditor: {
        groupName: '',
        selfInspectorName: '',
        teamLeaderName: '',
        qualityInspectorName: ''
      },
      // 班组列表（从后端 /api/groups 获取，作为 presets 的权威数据源）
      groups: [],
      filterOptions: [
        { label: '全部', value: 'all' },
        { label: '不合格', value: 'ng' },
        { label: '待测', value: 'todo' }
      ]
    }
  },
  computed: {
    canEdit() {
      return canEditFeature('qa_only')
    },
    selectedTemplate() {
      return this.qcTemplates.find((t) => t.id === this.selectedTemplateId) || null
    },
    selectedPreset() {
      return this.presets.find((p) => p.id === this.selectedPresetId) || this.presets[0] || {
        id: '', groupName: '', selfInspectorName: '', teamLeaderName: '', qualityInspectorName: ''
      }
    },
    activeAssignment() {
      const detail = this.selectedComponentDetail || {}
      return {
        groupName: detail.teamName || detail.teamLeader || this.selectedPreset.groupName || '',
        selfInspectorName: detail.selfInspector || this.selectedPreset.selfInspectorName || '',
        teamLeaderName: detail.teamLeader || this.selectedPreset.teamLeaderName || '',
        qualityInspectorName: detail.qualityInspector || this.selectedPreset.qualityInspectorName || '',
        qualityManagerName: detail.qualityManager || ''
      }
    },
    visibleRows() {
      const all = this.rows || []
      if (this.rowFilter === 'ng') return all.filter((r) => r.verdict === '不合格')
      if (this.rowFilter === 'todo') return all.filter((r) => r.verdict === '待测')
      return all
    },
    totalItems() { return (this.rows || []).length },
    passItems() { return (this.rows || []).filter((r) => r.verdict === '合格').length },
    ngItems() { return (this.rows || []).filter((r) => r.verdict === '不合格').length },
    passRate() {
      const total = this.totalItems
      if (!total) return '—'
      return Math.round((this.passItems / total) * 100)
    }
  },
  mounted() {
    this.loadComponentNo()
    this.fetchActiveProject()
    this.fetchSelectedComponentDetail()
    this.fetchQcTemplates()
    this.loadGroupPresets()
    this.fetchGroups()  // 从后端获取班组列表，同步到 presets
  },
  beforeDestroy() {
    if (this.cameraTimer) clearInterval(this.cameraTimer)
  },
  methods: {
    async fetchGroups() {
      try {
        const res = await axios.get('/api/groups', { headers: getAuthHeaders() })
        const payload = this.normalizeAxiosPayload(res)
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : [])
        if (!list.length) return

        this.groups = list
        // 从后端班组列表构建 presets，保留 localStorage 中已保存的人员信息
        const saved = this.loadGroupPresetsFromStorage()

        this.presets = list.map((g, i) => {
          const existing = saved.find(p => p.groupName === g.name)
          return {
            id: String(g.id),
            groupName: g.name || `班组${i + 1}`,
            selfInspectorName: existing ? existing.selfInspectorName : '',
            teamLeaderName: existing ? existing.teamLeaderName : '',
            qualityInspectorName: existing ? existing.qualityInspectorName : ''
          }
        })

        // 如果当前选中ID不在新列表中，自动选第一个
        if (!this.presets.find(p => String(p.id) === String(this.selectedPresetId))) {
          this.selectedPresetId = this.presets[0] ? this.presets[0].id : 'g1'
        }
      } catch (e) {
        console.warn('fetchGroups failed:', e)
      }
    },
    loadGroupPresetsFromStorage() {
      try {
        const raw = localStorage.getItem('steelQcGroupPresetsV1')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.presets)) return parsed.presets
        }
      } catch (e) {}
      return []
    },
    loadComponentNo() {
      const q = this.$route && this.$route.query
      if (q && q.componentNo) {
        this.componentNo = q.componentNo
      } else {
        const stored = localStorage.getItem('current_component_mark')
        if (stored) this.componentNo = stored
      }
    },
    async fetchSelectedComponentDetail() {
      try {
        const activeRes = await axios.get('/api/active-project')
        const activePayload = this.normalizeAxiosPayload(activeRes)
        const projectId = activePayload && activePayload.data ? activePayload.data.id : ''
        if (!projectId || !this.componentNo) return
        const res = await axios.get(`/api/projects/${projectId}/components/detail`, {
          params: { componentMark: this.componentNo },
          headers: getAuthHeaders()
        })
        const payload = this.normalizeAxiosPayload(res)
        if (payload && payload.success && payload.data) {
          this.selectedComponentDetail = payload.data
        }
      } catch (e) {
        console.warn('获取当前构件班组信息失败', e)
      }
    },
    notifyNoPermission() {
      if (this.$Message && this.$Message.warning) this.$Message.warning('当前账号仅支持查看')
      else alert('当前账号仅支持查看')
    },
    normalizeAxiosPayload(res) {
      if (res && typeof res === 'object' && 'status' in res && 'headers' in res && 'config' in res) return res.data
      return res
    },
    formatSigned(v) {
      if (v == null || Number.isNaN(v)) return '—'
      const n = Number(v)
      if (Number.isNaN(n)) return '—'
      const s = n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
      return s
    },
    formatBytes(bytes) {
      if (!bytes || Number.isNaN(bytes)) return '-'
      const kb = bytes / 1024
      if (kb < 1024) return `${kb.toFixed(1)}KB`
      return `${(kb / 1024).toFixed(1)}MB`
    },
    getDeviationClass(deviation, tol) {
      if (deviation == null || tol == null || Number.isNaN(Number(deviation)) || Number.isNaN(Number(tol))) return 'deviation-muted'
      const d = Math.abs(Number(deviation))
      const t = Number(tol)
      if (d > t) return 'deviation-danger'
      if (d > t * 0.7) return 'deviation-warn'
      return 'deviation-ok'
    },
    getVerdictClass(verdict) {
      if (verdict === '合格') return 'badge-ok'
      if (verdict === '不合格') return 'badge-ng'
      return 'badge-wait'
    },
    async fetchActiveProject() {
      try {
        const res = await axios.get('/api/active-project')
        const payload = this.normalizeAxiosPayload(res)
        if (payload && payload.data) {
          this.activeProjectName = payload.data.name || ''
        }
      } catch (e) {}
    },
    async fetchIfcList() {
      this.loadingIfc = true
      try {
        const res = await axios.get('/api/ifc/list')
        const payload = this.normalizeAxiosPayload(res)
        if (payload && payload.success) {
          this.ifcFiles = (payload.data || []).map((f) => ({ ...f }))
          if (!this.selectedIfcUrl && this.ifcFiles.length) this.selectedIfcUrl = this.ifcFiles[0].url
        }
      } catch (e) {
        this.ifcFiles = []
      } finally {
        this.loadingIfc = false
      }
    },
    async fetchQcTemplates() {
      this.loadingTemplates = true
      try {
        const res = await axios.get('/api/qc-templates')
        const payload = this.normalizeAxiosPayload(res)
        if (payload && payload.success) {
          this.qcTemplates = payload.data || []
          if (!this.selectedTemplateId && this.qcTemplates.length) {
            this.selectedTemplateId = this.qcTemplates[0].id
          }
          this.buildRows()
        }
      } catch (err) {
        this.$Message.warning('模板加载失败')
      } finally {
        this.loadingTemplates = false
      }
    },
    buildRows() {
      if (!this.selectedTemplate) { this.rows = []; return }
      const rows = []
      this.selectedTemplate.items.forEach((item, idx) => {
        const seed = `${this.componentNo}::${this.selectedTemplateId}::${idx}`
        const r1 = seededNumber(seed)
        const r2 = seededNumber(seed + '|m')
        const designValue = Math.round((200 + r1 * 9800) * 10) / 10
        const chosen = chooseTolerance(item.toleranceTexts, designValue)
        const tol = chosen && chosen.tol != null && !Number.isNaN(chosen.tol) ? chosen.tol : null
        const willFail = r2 > 0.82
        const deviation = tol
          ? Math.round(((willFail ? tol * (1.2 + r2) : tol * 0.4 * r2) * (r1 > 0.5 ? 1 : -1)) * 10) / 10
          : 0
        const measuredValue = Math.round((designValue + deviation) * 10) / 10
        const verdict = tol ? (Math.abs(deviation) > tol ? '不合格' : '合格') : '待测'
        rows.push({
          key: `${this.selectedTemplateId}:${item.seq || idx}`,
          seq: item.seq || idx + 1,
          itemName: item.name || `项目${item.seq || idx + 1}`,
          designValue: designValue.toFixed(1),
          factoryValue: '',  // 出厂尺寸1 - 可编辑
          factoryValue2: '', // 出厂尺寸2 - 可编辑
          measuredValue: verdict === '待测' ? '' : measuredValue.toFixed(1), // 实测值 - 可编辑
          deviation: verdict === '待测' ? null : deviation,
          toleranceText: chosen && chosen.text ? chosen.text : (item.toleranceTexts && item.toleranceTexts[0]) || '',
          tol,
          verdict,
          deviationClass: this.getDeviationClass(deviation, tol),
          verdictClass: this.getVerdictClass(verdict),
          _dirty: false  // 标记是否被手动修改
        })
      })
      this.rows = rows
    },
    markDirty(row) {
      this.$set(row, '_dirty', true)
    },
    recalcRow(row) {
      if (!this.canEdit) return
      const d = Number(row.designValue)
      const m = Number(row.measuredValue)
      if (Number.isNaN(d) || Number.isNaN(m) || row.tol == null || Number.isNaN(row.tol)) {
        row.deviation = null
        row.verdict = row.measuredValue ? '待测' : '待测'
        return
      }
      const deviation = Math.round((m - d) * 10) / 10
      row.deviation = deviation
      row.verdict = Math.abs(deviation) > Number(row.tol) ? '不合格' : '合格'
      row.deviationClass = this.getDeviationClass(deviation, row.tol)
      row.verdictClass = this.getVerdictClass(row.verdict)
    },
    toggleModelFullscreen() {
      this.modelFullscreen = !this.modelFullscreen
      this.$nextTick(() => {
        if (this.modelFullscreen) {
          document.addEventListener('keydown', this.handleEscKey)
        } else {
          document.removeEventListener('keydown', this.handleEscKey)
        }
      })
    },
    handleEscKey(e) {
      if (e.key === 'Escape') this.toggleModelFullscreen()
    },
    handleModelClick() {
      // TODO: IFC 模型点击 → 高亮构件 + 联动质检表行
    },
    scrollToRow(row) {
      const el = this.$refs['reportTable']
      if (el) {
        const rowEl = el.querySelector(`tbody tr[key="${row.key}"]`)
        if (rowEl) rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    },
    async exportPDF() {
      if (!this.canEdit) { this.notifyNoPermission(); return }
      if (!this.selectedTemplateId) return

      this.exporting = true
      try {
        const tableEl = this.$refs.reportTable
        if (!tableEl) {
          this.$Message.warning('表格不存在')
          this.exporting = false
          return
        }

        // 创建临时容器用于 PDF 渲染
        const container = document.createElement('div')
        container.style.cssText = `
          position: fixed;
          left: -9999px;
          top: 0;
          width: 1200px;
          background: white;
          padding: 30px;
          font-family: "Microsoft YaHei", "SimHei", Arial, sans-serif;
        `

        // 添加标题
        const title = document.createElement('div')
        title.style.cssText = `
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          color: #333;
        `
        title.textContent = `${this.selectedTemplate?.title || 'H型钢柱质检表'} - ${this.componentNo}`
        container.appendChild(title)

        // 添加人员信息
        const meta = document.createElement('div')
        meta.style.cssText = `
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          font-size: 14px;
          color: #555;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        `
        meta.innerHTML = `
          <span>班组: ${this.activeAssignment.groupName || '—'}</span>
          <span>自检员: ${this.activeAssignment.selfInspectorName || '—'}</span>
          <span>班组长: ${this.activeAssignment.teamLeaderName || '—'}</span>
          <span>质检员: ${this.activeAssignment.qualityInspectorName || '—'}</span>
          <span>日期: ${new Date().toLocaleDateString('zh-CN')}</span>
        `
        container.appendChild(meta)

        // 克隆表格并优化样式
        const tableClone = tableEl.cloneNode(true)
        tableClone.style.cssText = `
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        `

        // 移除不需要的元素
        const inputs = tableClone.querySelectorAll('input')
        inputs.forEach(input => {
          const td = input.parentElement
          td.textContent = input.value || '-'
        })

        // 设置表格样式
        const cells = tableClone.querySelectorAll('td, th')
        cells.forEach(cell => {
          cell.style.cssText = `
            border: 1px solid #333;
            padding: 8px 10px;
            text-align: center;
            color: #333;
            background: white !important;
          `
        })

        // 表头样式
        const headers = tableClone.querySelectorAll('th')
        headers.forEach(th => {
          th.style.cssText = `
            background: #4472C4 !important;
            color: white !important;
            font-weight: bold;
            border: 1px solid #333;
          `
        })

        // 不合格行高亮
        const ngRows = tableClone.querySelectorAll('.row-ng')
        ngRows.forEach(row => {
          row.style.background = '#FFE0E0'
        })

        container.appendChild(tableClone)
        document.body.appendChild(container)

        // 等待渲染完成
        await new Promise(resolve => setTimeout(resolve, 100))

        // 使用 html2canvas 截图
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        })

        // 清理临时容器
        document.body.removeChild(container)

        // 创建 PDF
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        })

        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        const imgWidth = canvas.width
        const imgHeight = canvas.height
        const ratio = Math.min((pageWidth - 20) / imgWidth, (pageHeight - 20) / imgHeight)

        const pdfWidth = imgWidth * ratio
        const pdfHeight = imgHeight * ratio

        pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight)
        pdf.save(`${this.componentNo}_质检表.pdf`)
        this.$Message.success('PDF 导出成功')
      } catch (e) {
        console.error('PDF export error:', e)
        this.$Message.warning('PDF 导出失败')
      } finally {
        this.exporting = false
      }
    },
    defaultGroupPresets() { return DEFAULT_GROUP_PRESETS.slice() },
    loadGroupPresets() {
      // 仅从 localStorage 恢复用户已保存的人员预设
      try {
        const raw = localStorage.getItem('steelQcGroupPresetsV1')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.presets) && parsed.presets.length) this.presets = parsed.presets
            if (parsed.selectedPresetId) this.selectedPresetId = parsed.selectedPresetId
          }
        }
      } catch (e) {}
      // 无 localStorage 数据时用默认占位
      if (!Array.isArray(this.presets) || this.presets.length === 0) this.presets = this.defaultGroupPresets()
      if (!this.selectedPresetId) this.selectedPresetId = this.presets[0] ? this.presets[0].id : 'g1'
      if (!this.presets.find((p) => String(p.id) === String(this.selectedPresetId))) {
        this.selectedPresetId = this.presets[0] ? this.presets[0].id : 'g1'
      }
    },
    persistGroupPresets() {
      try {
        localStorage.setItem('steelQcGroupPresetsV1', JSON.stringify({
          presets: this.presets, selectedPresetId: this.selectedPresetId
        }))
      } catch (e) {}
    },
    openPresetModal() {
      if (!this.canEdit) { this.notifyNoPermission(); return }
      this.showPresetModal = true
      this.editPresetId = this.selectedPresetId
      this.loadPresetToEditor()
    },
    closePresetModal() { this.showPresetModal = false },
    loadPresetToEditor() {
      const preset = this.presets.find((p) => p.id === this.editPresetId) || this.presets[0]
      this.presetEditor = {
        groupName: preset.groupName || '',
        selfInspectorName: preset.selfInspectorName || '',
        teamLeaderName: preset.teamLeaderName || '',
        qualityInspectorName: preset.qualityInspectorName || ''
      }
    },
    resetPresetEditor() {
      const defaults = this.defaultGroupPresets()
      const d = defaults.find((p) => p.id === this.editPresetId) || defaults[0]
      this.presetEditor = {
        groupName: d.groupName || '',
        selfInspectorName: d.selfInspectorName || '',
        teamLeaderName: d.teamLeaderName || '',
        qualityInspectorName: d.qualityInspectorName || ''
      }
    },
    savePresetEditor() {
      if (!this.canEdit) { this.notifyNoPermission(); return }
      const idx = this.presets.findIndex((p) => p.id === this.editPresetId)
      if (idx === -1) return
      const next = {
        ...this.presets[idx],
        groupName: (this.presetEditor.groupName || '').trim() || this.presets[idx].groupName,
        selfInspectorName: (this.presetEditor.selfInspectorName || '').trim(),
        teamLeaderName: (this.presetEditor.teamLeaderName || '').trim(),
        qualityInspectorName: (this.presetEditor.qualityInspectorName || '').trim()
      }
      this.$set(this.presets, idx, next)
      this.selectedPresetId = this.editPresetId
      this.persistGroupPresets()
      this.$Message.success('预设已保存')
      this.closePresetModal()
    }
  }
}
</script>
<style lang="scss" scoped>
.results-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  overflow: hidden;
  background: linear-gradient(145deg, #0c2248 0%, #0f2d5e 40%, #0a1e40 70%, #0d2040 100%);
}
.panel {
  position: relative;
  background: linear-gradient(145deg, rgba(16, 52, 110, 0.55) 0%, rgba(12, 40, 90, 0.6) 100%);
  border-radius: 14px;
  border: 1px solid rgba(0, 190, 255, 0.25);
  box-shadow: 0 4px 32px rgba(15, 60, 130, 0.45);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 1;
}
.panel::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 190, 255, 0.4) 30%, rgba(0, 220, 255, 0.5) 50%, rgba(0, 190, 255, 0.4) 70%, transparent 100%);
  pointer-events: none;
}
.top-row { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; min-height: 0; }
.panel-report-mini { display: flex; flex-direction: column; min-height: 0; }
.panel-head-simple {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 190, 255, 0.15);
  background: linear-gradient(180deg, rgba(0, 190, 255, 0.06) 0%, transparent 100%);
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}
.head-title { display: flex; align-items: center; gap: 10px; }
.title-text { font-size: 16px; font-weight: 800; color: #7dd8ff; letter-spacing: 1px; }
.title-sep { color: rgba(255, 255, 255, 0.3); }
.component-name { font-size: 14px; font-weight: 700; color: #ffd166; text-shadow: 0 0 10px rgba(255, 209, 102, 0.4); }
.head-stats { display: flex; gap: 8px; }
.stat-chip { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid; }
.stat-chip--total { background: rgba(0, 190, 255, 0.1); border-color: rgba(0, 190, 255, 0.3); color: rgba(255, 255, 255, 0.8); }
.stat-chip--ok { background: rgba(0, 255, 163, 0.1); border-color: rgba(0, 255, 163, 0.3); color: #00ffa3; }
.stat-chip--ng { background: rgba(255, 77, 109, 0.1); border-color: rgba(255, 77, 109, 0.3); color: #ff4d6d; }
.report-mini-body { flex: 1; overflow-y: auto; padding: 8px; }
.report-mini-body::-webkit-scrollbar { width: 6px; }
.report-mini-body::-webkit-scrollbar-track { background: rgba(15, 60, 130, 0.2); }
.report-mini-body::-webkit-scrollbar-thumb { background: rgba(0, 190, 255, 0.3); border-radius: 3px; }

/* 原模板样式表格 */
.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}
.report-table thead th {
  position: sticky; top: 0; z-index: 5; padding: 8px 4px;
  background: linear-gradient(180deg, #4472C4 0%, #3657A8 100%);
  border: 1px solid #2a4080;
  font-weight: bold;
  text-align: center;
  font-size: 11px;
  color: #fff;
  letter-spacing: 0.5px;
  white-space: pre-wrap;
}
.report-table tbody td {
  padding: 6px 4px;
  border: 1px solid rgba(68, 114, 196, 0.3);
  text-align: center;
  color: #333;
  vertical-align: middle;
  background: #fff;
}
.report-table tbody tr:hover td { background: rgba(68, 114, 196, 0.05); }
.report-table tbody tr.row-ng td { background: #FFEBEE; }

/* 表格列宽 */
.col-seq { width: 40px; }
.col-item { width: 120px; text-align: left !important; padding-left: 8px !important; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-design { width: 70px; }
.col-tolerance { width: 100px; font-size: 10px; text-align: left !important; padding-left: 4px !important; white-space: pre-wrap; }
.col-factory { width: 70px; }
.col-factory2 { width: 70px; }
.col-selfcheck { width: 80px; }
.col-leader { width: 70px; font-weight: bold; }
.col-remark { width: 60px; }
.col-remark .verdict-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }

/* 可编辑单元格 */
.editable-cell { padding: 2px !important; }
.table-input {
  width: 100%;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 3px;
  text-align: center;
  font-size: 12px;
  padding: 0 4px;
  background: transparent;
  color: #333;
  transition: all 0.2s;
}
.table-input:hover {
  border-color: #4472C4;
  background: rgba(68, 114, 196, 0.08);
}
.table-input:focus {
  outline: none;
  border-color: #2052A0;
  background: #fff;
  box-shadow: 0 0 4px rgba(68, 114, 196, 0.4);
}
.table-input.input-error {
  background: rgba(255, 77, 109, 0.15);
  border-color: #ff4d6d;
  color: #D50000;
  font-weight: bold;
}
.table-input::placeholder {
  color: #ccc;
  font-size: 10px;
}

/* 偏差列样式 */
.deviation-ok { color: #00A650; }
.deviation-warn { color: #FF8C00; }
.deviation-danger { color: #D50000; }
.deviation-muted { color: #999; }

/* 判定徽章 */
.verdict-badge.badge-ok { background: #E8F5E9; color: #00A650; border: 1px solid #A5D6A7; }
.verdict-badge.badge-ng { background: #FFEBEE; color: #D50000; border: 1px solid #FFCDD2; }
.verdict-badge.badge-wait { background: #FFF8E1; color: #FF8C00; border: 1px solid #FFE082; }

.status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; border: 1px solid; }
.badge-ok { background: rgba(0, 255, 163, 0.12); color: #00ffa3; border-color: rgba(0, 255, 163, 0.3); }
.badge-ng { background: rgba(255, 77, 109, 0.12); color: #ff4d6d; border-color: rgba(255, 77, 109, 0.3); }
.badge-wait { background: rgba(255, 209, 102, 0.12); color: #ffd166; border-color: rgba(255, 209, 102, 0.3); }
.empty-cell { text-align: center; color: #666; padding: 40px !important; background: #fafafa; font-size: 14px; }
.report-mini-actions {
  padding: 10px 16px; border-top: 1px solid rgba(0, 190, 255, 0.15);
  background: rgba(0, 0, 0, 0.15); display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0;
}
.preset-select { height: 34px; min-width: 120px; background: rgba(15, 60, 130, 0.4); border: 1px solid rgba(0, 190, 255, 0.3); border-radius: 8px; color: #e8fbff; padding: 0 10px; font-size: 13px; font-weight: 700; outline: none; }
.action-btns { display: flex; gap: 8px; }
.btn { height: 34px; padding: 0 14px; border-radius: 8px; border: 1px solid; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-outline { background: rgba(15, 60, 130, 0.3); border-color: rgba(0, 190, 255, 0.25); color: rgba(255, 255, 255, 0.8); }
.btn-outline:hover:not(:disabled) { background: rgba(0, 190, 255, 0.1); border-color: rgba(0, 190, 255, 0.5); color: #7dd8ff; }
.btn-preset { background: rgba(255, 193, 7, 0.15); border-color: rgba(255, 193, 7, 0.4); color: #FFD166; }
.btn-preset:hover:not(:disabled) { background: rgba(255, 193, 7, 0.25); border-color: rgba(255, 193, 7, 0.6); }
.btn-primary { background: linear-gradient(180deg, rgba(0, 190, 255, 0.9) 0%, rgba(0, 110, 240, 0.85) 100%); border-color: rgba(0, 190, 255, 0.9); color: #04121f; }
.btn-primary:hover:not(:disabled) { background: linear-gradient(180deg, rgba(51, 225, 255, 0.95) 0%, rgba(0, 110, 240, 0.9) 100%); color: #04121f; }
.btn-pdf { background: linear-gradient(180deg, rgba(220, 53, 69, 0.9) 0%, rgba(180, 30, 50, 0.85) 100%); border-color: rgba(220, 53, 69, 0.9); color: #fff; }
.btn-pdf:hover:not(:disabled) { background: linear-gradient(180deg, rgba(250, 80, 100, 0.95) 0%, rgba(200, 40, 60, 0.9) 100%); color: #fff; }
.panel-model .panel-head { padding: 10px 14px; border-bottom: 1px solid rgba(0, 190, 255, 0.12); background: rgba(15, 60, 130, 0.2); display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0; }
.panel-model.is-fullscreen { position: fixed; inset: 0; z-index: 9999; border-radius: 0; }
.model-title { display: flex; align-items: center; gap: 8px; color: #7dd8ff; font-size: 14px; font-weight: 700; }
.head-right { display: flex; align-items: center; gap: 8px; }
.model-select { height: 32px; min-width: 130px; background: rgba(15, 60, 130, 0.4); border: 1px solid rgba(0, 190, 255, 0.25); border-radius: 6px; color: #e8fbff; padding: 0 8px; font-size: 12px; outline: none; }
.model-select:disabled { opacity: 0.5; }
.head-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid rgba(0, 190, 255, 0.25); background: rgba(15, 60, 130, 0.3); color: rgba(255, 255, 255, 0.8); cursor: pointer; transition: all 0.2s; }
.head-btn:hover { background: rgba(0, 190, 255, 0.12); border-color: rgba(0, 190, 255, 0.5); color: #7dd8ff; }
.model-body { flex: 1; display: flex; align-items: center; justify-content: center; background: rgba(15, 60, 130, 0.3); cursor: pointer; min-height: 0; }
.model-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; color: rgba(255, 255, 255, 0.4); }
.model-placeholder svg { color: rgba(0, 190, 255, 0.25); }
.placeholder-text { font-size: 14px; font-weight: 600; }
.model-content { display: flex; flex-direction: column; align-items: center; gap: 10px; color: rgba(0, 190, 255, 0.5); }
.model-ready-text { font-size: 15px; font-weight: 700; color: rgba(255, 255, 255, 0.6); }
.model-hint { font-size: 12px; color: rgba(255, 255, 255, 0.4); }
.modal-mask { position: fixed; inset: 0; background: rgba(15, 60, 130, 0.6); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; }
.modal { width: 760px; max-width: 100%; border-radius: 16px; background: linear-gradient(145deg, rgba(12, 30, 58, 0.98) 0%, rgba(8, 20, 42, 0.98) 100%); border: 1px solid rgba(0, 190, 255, 0.3); box-shadow: 0 24px 80px rgba(15, 60, 130, 0.6); overflow: hidden; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(0, 190, 255, 0.18); background: linear-gradient(180deg, rgba(0, 190, 255, 0.07) 0%, rgba(0, 0, 0, 0) 100%); }
.modal-title { font-size: 17px; font-weight: 900; color: #7dd8ff; letter-spacing: 1px; }
.modal-close { width: 34px; height: 34px; border-radius: 9px; border: 1px solid rgba(0, 190, 255, 0.25); background: rgba(15, 60, 130, 0.3); color: rgba(255, 255, 255, 0.8); font-size: 18px; cursor: pointer; }
.modal-close:hover { background: rgba(0, 190, 255, 0.12); border-color: rgba(0, 190, 255, 0.5); color: #7dd8ff; }
.modal-body { padding: 14px 18px; }
.modal-row { display: grid; grid-template-columns: 100px 1fr; gap: 12px; align-items: center; margin-bottom: 12px; }
.modal-k { color: rgba(255, 255, 255, 0.7); font-size: 13px; font-weight: 700; }
.modal-grid { margin-top: 6px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.modal-field { background: rgba(15, 60, 130, 0.25); border: 1px solid rgba(0, 190, 255, 0.12); border-radius: 10px; padding: 10px 12px; }
.modal-input { margin-top: 6px; height: 36px; width: 100%; border-radius: 8px; border: 1px solid rgba(0, 190, 255, 0.2); background: rgba(15, 60, 130, 0.35); color: #e8fbff; outline: none; padding: 0 10px; font-weight: 800; font-size: 13px; }
.modal-input:focus { border-color: rgba(0, 190, 255, 0.55); }
.modal-foot { padding: 12px 18px 14px; display: flex; gap: 8px; align-items: center; border-top: 1px solid rgba(0, 190, 255, 0.12); background: rgba(0, 0, 0, 0.15); }
.spacer { flex: 1; }
.select { height: 36px; background: rgba(15, 60, 130, 0.4); border: 1px solid rgba(0, 190, 255, 0.3); border-radius: 8px; color: #e8fbff; padding: 0 10px; font-size: 13px; font-weight: 700; outline: none; }
</style>

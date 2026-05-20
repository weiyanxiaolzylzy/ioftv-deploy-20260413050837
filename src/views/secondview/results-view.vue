<template>
  <div class="results-page">
    <template v-if="defectMode">
      <div class="panel panel-report-mini defect-panel">
        <div class="panel-head-simple">
          <div class="head-title">
            <span class="title-text">缺陷类型统计</span>
          </div>
        </div>
        <div class="report-mini-body">
          <div v-if="defectTaskList.length" class="defect-stats-grid">
            <div v-for="task in defectTaskList" :key="task.id" class="defect-task-card">
              <div class="defect-task-card__title">{{ task.componentMark || '未命名构件' }}</div>
              <div class="defect-task-card__meta">复检日期：{{ task.reinspectionDate || '—' }}</div>
              <div class="defect-task-card__meta">班组：{{ task.teamName || '—' }}</div>
              <div class="defect-task-card__block">
                <div class="defect-task-card__label">缺陷类型</div>
                <div v-for="item in task.defectTypes" :key="task.id + '-' + item.defectType" class="defect-pill">
                  {{ item.defectType }}（{{ item.count }}项）
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-cell">暂无复检缺陷统计数据</div>
        </div>
      </div>
    </template>
    <template v-else>
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
            <span class="stat-chip stat-chip--total" :class="{ 'stat-chip--active': rowFilter === 'all' }" @click="setRowFilter('all')">共 {{ totalItems }} 项</span>
            <span class="stat-chip stat-chip--ok" :class="{ 'stat-chip--active': rowFilter === 'ok' }" @click="setRowFilter('ok')">合格 {{ passItems }} 项</span>
            <span class="stat-chip stat-chip--ng" :class="{ 'stat-chip--active': rowFilter === 'ng' }" @click="setRowFilter('ng')">不合格 {{ ngItems }} 项</span>
          </div>
        </div>

        <!-- 原模板样式表格（可编辑） -->
        <div class="report-mini-body">
          <table class="report-table" ref="reportTable">
            <thead>
              <tr>
                <th class="col-seq">序号</th>
                <th class="col-item">检测项目</th>
                <th class="col-tolerance">允许偏差</th>
                <th class="col-design">设计尺寸</th>
                <th class="col-selfcheck">实测值</th>
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
                <td class="col-tolerance">{{ row.toleranceText }}</td>
                <td class="col-design">{{ row.designValue }}</td>
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
                <td class="col-remark">{{ autoRemark(row) || row.remark || '' }}</td>
              </tr>
              <tr v-if="!visibleRows.length">
                <td colspan="6" class="empty-cell">暂无数据，请先选择模板</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 底部操作 -->
        <div class="report-mini-actions">
          <div class="action-btns">
            <button
              class="btn btn-outline"
              type="button"
              :disabled="!fixableRows.length"
              @click="showJudgementDrawer = true"
            >
              修改判定
            </button>
            <button
              class="btn btn-outline"
              type="button"
              :disabled="!canScheduleReinspection"
              @click="openReinspectionConfirm"
            >
              安排复检
            </button>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="!canOutbound"
              @click="openOutboundConfirm"
            >
              出库
            </button>
            <button class="btn btn-pdf" @click="exportPDF" :disabled="!canExportPdf">
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
            <select v-model="selectedTemplateId" class="model-select" @change="handleTemplateChange" :disabled="loadingTemplates">
              <option value="" disabled>选择模板</option>
              <option v-for="t in qcTemplates" :key="t.id" :value="t.id">{{ t.title }}</option>
              <option value="__create__">+ 新建模板</option>
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

        <div class="model-body model-body--empty"></div>
      </div>
    </div>

    <div v-if="showTemplateModal" class="template-modal" @click.self="closeTemplateModal">
      <div class="template-modal__panel">
        <div class="template-modal__head">
          <span>新建模板</span>
          <button type="button" class="template-modal__close" @click="closeTemplateModal">×</button>
        </div>
        <div class="template-modal__body">
          <div class="template-form-row">
            <span class="template-form-label">模板名称</span>
            <input v-model="customTemplateForm.title" class="template-input template-input--title" placeholder="输入模板名称" />
          </div>
          <div class="template-editor-head">
            <span>序号</span>
            <span>检测项目</span>
            <span>设计尺寸</span>
            <span>允许偏差</span>
            <span>备注</span>
            <span>操作</span>
          </div>
          <div class="template-editor-body">
            <div v-for="(item, idx) in customTemplateForm.items" :key="'custom-row-' + idx" class="template-editor-row">
              <input v-model="item.seq" class="template-input template-input--seq" />
              <input v-model="item.name" class="template-input" placeholder="检测项目" />
              <input v-model="item.designValue" class="template-input" placeholder="设计尺寸" />
              <input v-model="item.toleranceText" class="template-input" placeholder="如 ±3.0" />
              <input v-model="item.remark" class="template-input" placeholder="备注" />
              <button type="button" class="template-row-btn template-row-btn--del" @click="removeCustomTemplateRow(idx)">删</button>
            </div>
          </div>
          <button type="button" class="template-row-btn template-row-btn--add" @click="addCustomTemplateRow">+ 添加检测项</button>
        </div>
        <div class="template-modal__foot">
          <button type="button" class="template-action template-action--ghost" @click="closeTemplateModal">取消</button>
          <button type="button" class="template-action template-action--primary" @click="saveCustomTemplate" :disabled="savingCustomTemplate">
            {{ savingCustomTemplate ? '保存中…' : '保存并使用' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showJudgementDrawer" class="judgement-drawer-mask" @click.self="showJudgementDrawer = false">
      <div class="judgement-drawer">
        <div class="judgement-drawer__head">
          <div>
            <div class="judgement-drawer__title">修改判定</div>
            <div class="judgement-drawer__sub">仅对当前构件当前报表生效</div>
          </div>
          <button type="button" class="judgement-drawer__close" @click="showJudgementDrawer = false">×</button>
        </div>
        <div class="judgement-drawer__body">
          <div v-if="fixableRows.length" class="judgement-list">
            <button
              v-for="row in fixableRows"
              :key="'drawer-fix-' + row.key"
              type="button"
              class="judgement-item"
              @click="handleDrawerForcePass(row)"
            >
              <span class="judgement-item__seq">{{ row.seq }}</span>
              <span class="judgement-item__name">{{ row.itemName }}</span>
            </button>
          </div>
          <div v-else class="judgement-empty">当前没有可修改的不合格项</div>
        </div>
      </div>
    </div>

    <div v-if="judgementConfirmRow" class="judgement-confirm-mask" @click.self="cancelJudgementConfirm">
      <div class="judgement-confirm">
        <div class="judgement-confirm__head">
          <span>确认修改判定</span>
          <button type="button" class="template-modal__close" @click="cancelJudgementConfirm">×</button>
        </div>
        <div class="judgement-confirm__body">
          确认将“{{ judgementConfirmRow.itemName || `第${judgementConfirmRow.seq}项` }}”修改为合格吗？
        </div>
        <div class="judgement-confirm__foot">
          <button type="button" class="template-action template-action--ghost" @click="cancelJudgementConfirm">取消</button>
          <button type="button" class="template-action template-action--primary" @click="confirmForceRowPass">确认</button>
        </div>
      </div>
    </div>

    <div v-if="showReinspectionConfirm" class="judgement-confirm-mask" @click.self="closeReinspectionConfirm">
      <div class="judgement-confirm judgement-confirm--wide">
        <div class="judgement-confirm__head">
          <span>安排复检确认</span>
          <button type="button" class="template-modal__close" @click="closeReinspectionConfirm">×</button>
        </div>
        <div class="judgement-confirm__body">
          <div class="confirm-line">构件编号：{{ componentNo || '—' }}</div>
          <div class="confirm-line">当前不合格项：</div>
          <ul class="confirm-list">
            <li v-for="row in currentNgRows" :key="'reinspect-row-' + row.key">{{ row.seq }}. {{ row.itemName }}</li>
          </ul>
          <div class="confirm-line">缺陷类型汇总：</div>
          <ul class="confirm-list">
            <li v-for="item in defectStats" :key="'defect-' + item.defectType">{{ item.defectType }}（{{ item.count }}项）</li>
          </ul>
          <div class="confirm-form-row">
            <span>复检日期</span>
            <input v-model="reinspectionDate" type="date" class="confirm-date-input" />
          </div>
        </div>
        <div class="judgement-confirm__foot">
          <button type="button" class="template-action template-action--ghost" @click="closeReinspectionConfirm">取消</button>
          <button type="button" class="template-action template-action--primary" @click="confirmScheduleReinspection">确认</button>
        </div>
      </div>
    </div>

    <div v-if="showOutboundConfirm" class="judgement-confirm-mask" @click.self="closeOutboundConfirm">
      <div class="judgement-confirm">
        <div class="judgement-confirm__head">
          <span>出库确认</span>
          <button type="button" class="template-modal__close" @click="closeOutboundConfirm">×</button>
        </div>
        <div class="judgement-confirm__body">
          <div class="confirm-line">项目名称：{{ activeProjectName || '—' }}</div>
          <div class="confirm-line">构件编号：{{ componentNo || '—' }}</div>
          <div class="confirm-line">班组：{{ activeAssignment.groupName || '—' }}</div>
          <div class="confirm-line">确认出库后，将记录最终检测日期并开放 PDF 导出。</div>
        </div>
        <div class="judgement-confirm__foot">
          <button type="button" class="template-action template-action--ghost" @click="closeOutboundConfirm">取消</button>
          <button type="button" class="template-action template-action--primary" @click="confirmOutbound">确认出库</button>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios'
import { canEditFeature, getAuthHeaders } from '@/utils'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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

export default {
  name: 'ResultsView',
  props: {
    defectMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      modelFullscreen: false,
      loadingTemplates: false,
      loadingIfc: false,
      exporting: false,
      loadingViewportContext: false,
      showTemplateModal: false,
      savingCustomTemplate: false,
      selectedComponentContext: null,
      qcTemplates: [],
      selectedTemplateId: '',
      ifcFiles: [],
      selectedIfcUrl: '',
      componentNo: '',
      selectedComponentDetail: null,
      rowFilter: 'all',
      rows: [],
      customTemplateForm: {
        title: '',
        items: []
      },
      showJudgementDrawer: false,
      judgementConfirmRow: null,
      showReinspectionConfirm: false,
      showOutboundConfirm: false,
      activeProjectName: '',
      activeProjectId: '',
      selectedComponentId: '',
      componentStatus: '待检测',
      componentQualifiedAt: '',
      componentOutboundAt: '',
      reinspectionDate: '',
      defectTaskList: [],
      cameraNow: '',
      cameraTimer: null,
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
    activeAssignment() {
      const detail = this.selectedComponentDetail || {}
      return {
        groupName: detail.teamName || '',
        selfInspectorName: detail.selfInspector || '',
        teamLeaderName: detail.teamLeader || '',
        qualityInspectorName: detail.qualityInspector || '',
        qualityManagerName: detail.qualityManager || ''
      }
    },
    visibleRows() {
      const all = this.rows || []
      if (this.rowFilter === 'ok') return all.filter((r) => r.verdict === '合格')
      if (this.rowFilter === 'ng') return all.filter((r) => r.verdict === '不合格')
      if (this.rowFilter === 'todo') return all.filter((r) => r.verdict === '待测')
      return all
    },
    fixableRows() {
      return (this.rows || []).filter((r) => r.verdict === '不合格')
    },
    totalItems() { return (this.rows || []).length },
    passItems() { return (this.rows || []).filter((r) => r.verdict === '合格').length },
    ngItems() { return (this.rows || []).filter((r) => r.verdict === '不合格').length },
    passRate() {
      const total = this.totalItems
      if (!total) return '—'
      return Math.round((this.passItems / total) * 100)
    },
    currentNgRows() {
      return (this.rows || []).filter((r) => r.verdict === '不合格')
    },
    defectStats() {
      const buckets = new Map()
      this.currentNgRows.forEach((row) => {
        const name = String(row.itemName || '')
        let defectType = '未分类'
        if (name.includes('扭曲') || name.includes('旁弯')) defectType = '扭曲旁弯'
        else if (name.includes('长度')) defectType = '构件长度'
        else if (name.includes('截面')) defectType = '构件截面'
        else if (name.includes('孔距')) defectType = '孔距'
        else if (name.includes('牛腿') || name.includes('连接板') || name.includes('节点')) defectType = '节点尺寸'
        else if (name.includes('劲板')) defectType = '劲板尺寸'

        if (!buckets.has(defectType)) buckets.set(defectType, { defectType, count: 0 })
        buckets.get(defectType).count += 1
      })
      return Array.from(buckets.values())
    },
    canScheduleReinspection() {
      return this.canEdit && !!this.selectedTemplateId && this.currentNgRows.length > 0 && !this.defectMode
    },
    canOutbound() {
      return this.canEdit && !!this.selectedTemplateId && !this.currentNgRows.length && !this.defectMode && this.rows.length > 0 && this.componentStatus !== '已出库'
    },
    canExportPdf() {
      return this.canEdit && !!this.selectedTemplateId && !this.exporting && this.componentStatus === '已出库'
    }
  },
  mounted() {
    this.loadComponentNo()
    this.fetchActiveProject()
    this.fetchSelectedComponentDetail()
    this.fetchQcTemplates()
    if (this.defectMode) this.fetchReinspectionTasks()
    window.addEventListener('storage', this.onSharedStorageChange)
    if (this.$bus) {
      this.$bus.$on('component-ifc-sync', this.onComponentIfcSync)
      this.$bus.$on('detection-element-selected', this.onDetectionElementSelected)
    }
  },
  beforeDestroy() {
    if (this.cameraTimer) clearInterval(this.cameraTimer)
    window.removeEventListener('storage', this.onSharedStorageChange)
    if (this.$bus) {
      this.$bus.$off('component-ifc-sync', this.onComponentIfcSync)
      this.$bus.$off('detection-element-selected', this.onDetectionElementSelected)
    }
  },
  methods: {
    loadComponentNo() {
      const q = this.$route && this.$route.query
      if (q && q.componentNo) {
        this.componentNo = q.componentNo
      } else {
        const stored = localStorage.getItem('current_component_mark')
        if (stored) this.componentNo = stored
      }
    },
    syncComponentFromStorage() {
      const storedMark = localStorage.getItem('current_component_mark') || ''
      let nextMark = String(storedMark || '').trim()
      try {
        const raw = localStorage.getItem('cm_selected_component')
        if (raw) {
          const parsed = JSON.parse(raw)
          const candidate = parsed && (parsed.componentMark || parsed.componentName || parsed.name)
          if (candidate) nextMark = String(candidate).trim()
        }
      } catch (e) {}

      if (!nextMark || nextMark === String(this.componentNo || '').trim()) return
      this.componentNo = nextMark
      this.selectedComponentContext = null
      this.selectedComponentDetail = null
      this.selectedComponentId = ''
      this.componentStatus = '待检测'
      this.componentQualifiedAt = ''
      this.componentOutboundAt = ''
      this.fetchSelectedComponentDetail()
      if (this.selectedTemplateId) this.buildRows()
    },
    onSharedStorageChange(e) {
      if (!e || e.key === 'current_component_mark' || e.key === 'cm_selected_component') {
        this.syncComponentFromStorage()
      }
    },
    onComponentIfcSync(payload) {
      if (!payload) return
      this.syncComponentFromStorage()
    },
    onDetectionElementSelected(payload) {
      if (!payload) return
      this.syncComponentFromStorage()
    },
    async fetchSelectedComponentDetail() {
      try {
        const activeRes = await axios.get('/api/active-project')
        const activePayload = this.normalizeAxiosPayload(activeRes)
        const projectId = activePayload && activePayload.data ? activePayload.data.id : ''
        if (!projectId || !this.componentNo) return
        const selected = this.loadSelectedComponentContext(projectId)
        if (!selected) {
          await this.loadViewportContextFromTodayPlan()
        }
        const currentSelected = this.selectedComponentContext || selected
        if (currentSelected && currentSelected.detail) {
          this.selectedComponentDetail = currentSelected.detail
          this.selectedComponentId = currentSelected.detail.id || ''
          this.componentStatus = currentSelected.detail.status || '待检测'
          this.componentQualifiedAt = currentSelected.detail.qualifiedAt || ''
          this.componentOutboundAt = currentSelected.detail.outboundAt || ''
          return
        }
        if (!currentSelected || !currentSelected.expressID) return
        const res = await axios.get(`/api/projects/${projectId}/components/detail`, {
          params: { expressID: currentSelected.expressID },
          headers: getAuthHeaders()
        })
        const payload = this.normalizeAxiosPayload(res)
        if (payload && payload.success && payload.data) {
          this.selectedComponentDetail = payload.data
          this.selectedComponentId = payload.data.id || ''
          this.componentStatus = payload.data.status || '待检测'
          this.componentQualifiedAt = payload.data.qualifiedAt || ''
          this.componentOutboundAt = payload.data.outboundAt || ''
          this.selectedComponentContext = {
            ...(this.selectedComponentContext || {}),
            detail: payload.data
          }
          if (!this.defectMode && this.componentStatus === '已出库') {
            this.moveToNextPlanComponent()
          }
        }
      } catch (e) {
        console.warn('获取当前构件班组信息失败', e)
      }
    },
    async loadViewportContextFromTodayPlan() {
      if (this.loadingViewportContext || !this.componentNo) return
      this.loadingViewportContext = true
      try {
        const res = await axios.get('/api/today-plan', { headers: getAuthHeaders() })
        const payload = this.normalizeAxiosPayload(res)
        const list = payload && payload.success && Array.isArray(payload.data) ? payload.data : []
        const target = list.find((item) => {
          const mark = String(item.componentMark || item.componentName || '').trim()
          return mark === String(this.componentNo || '').trim()
        })
        if (!target) return
        this.selectedComponentContext = {
          projectId: target.projectId || '',
          ifcUrl: target.ifcUrl || '',
          expressID: target.ifcElementId || '',
          componentMark: target.componentMark || target.componentName || this.componentNo || '',
          componentName: target.componentName || target.componentMark || this.componentNo || '',
          name: target.componentName || target.componentMark || this.componentNo || '',
          globalId: target.ifcGlobalId || '',
          detail: null,
          timestamp: Date.now()
        }
      } catch (e) {
        console.warn('从今日计划读取构件 IFC 上下文失败', e)
      } finally {
        this.loadingViewportContext = false
      }
    },
    loadSelectedComponentContext(projectId) {
      try {
        const raw = localStorage.getItem('cm_selected_component')
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || String(parsed.projectId || '') !== String(projectId)) return null
        const sameMark = String(parsed.componentMark || '').trim() === String(this.componentNo || '').trim()
        const sameName = String(parsed.componentName || parsed.name || '').trim() === String(this.componentNo || '').trim()
        if (!sameMark && !sameName) return null
        this.selectedComponentContext = parsed
        return parsed
      } catch (e) {
        return null
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
      const abs = Math.abs(n)
      const digits = abs >= 1 ? 1 : 4
      const formatted = n >= 0 ? `+${n.toFixed(digits)}` : n.toFixed(digits)
      const normalized = formatted.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
      const zeroNormalized = normalized === '+0' || normalized === '-0' ? '+0' : normalized
      return zeroNormalized
    },
    setRowFilter(filter) {
      this.rowFilter = filter || 'all'
    },
    defaultRemarkByVerdict(verdict) {
      if (verdict === '不合格') return '不合格'
      if (verdict === '合格') return '合格'
      return ''
    },
    autoRemark(row) {
      if (!row) return ''
      if (row.verdict === '不合格') return '不合格'
      if (row.verdict === '合格') return '合格'
      return ''
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
          this.activeProjectId = payload.data.id || ''
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
        const parsedDesign = Number(String(item.designValue || '').replace(/[^0-9.+-]/g, ''))
        const designValue = Number.isFinite(parsedDesign) ? parsedDesign : Math.round((200 + r1 * 9800) * 10) / 10
        const chosen = chooseTolerance(item.toleranceTexts, designValue)
        const tol = chosen && chosen.tol != null && !Number.isNaN(chosen.tol) ? chosen.tol : null
        const willFail = r2 > 0.82
        const deviation = tol
          ? (willFail ? tol * (1.2 + r2) : tol * 0.4 * r2) * (r1 > 0.5 ? 1 : -1)
          : 0
        const measuredValue = designValue + deviation
        const verdict = tol ? (Math.abs(deviation) > tol ? '不合格' : '合格') : '待测'
        rows.push({
          key: `${this.selectedTemplateId}:${idx}:${item.seq || idx}:${item.name || ''}`,
          seq: item.seq || idx + 1,
          itemName: item.name || `项目${item.seq || idx + 1}`,
          designValue: item.designValue || String(Number(designValue.toFixed(4))),
          measuredValue: verdict === '待测' ? '' : String(Number(measuredValue.toFixed(4))), // 实测值 - 可编辑
          deviation: verdict === '待测' ? null : deviation,
          toleranceText: chosen && chosen.text ? chosen.text : (item.toleranceTexts && item.toleranceTexts[0]) || '',
          tol,
          verdict,
          remark: item.remark || '',
          deviationClass: this.getDeviationClass(deviation, tol),
          verdictClass: this.getVerdictClass(verdict),
          forcedPass: false,
          _dirty: false  // 标记是否被手动修改
        })
      })
      this.rows = rows
    },
    handleTemplateChange() {
      if (this.selectedTemplateId === '__create__') {
        this.openTemplateModal()
        return
      }
      this.buildRows()
    },
    openTemplateModal() {
      this.showTemplateModal = true
      this.customTemplateForm = {
        title: '',
        items: [
          { seq: 1, name: '', designValue: '', toleranceText: '', remark: '' }
        ]
      }
    },
    closeTemplateModal() {
      this.showTemplateModal = false
      if (this.selectedTemplateId === '__create__') {
        this.selectedTemplateId = this.qcTemplates.length ? this.qcTemplates[0].id : ''
      }
    },
    addCustomTemplateRow() {
      this.customTemplateForm.items.push({
        seq: this.customTemplateForm.items.length + 1,
        name: '',
        designValue: '',
        toleranceText: '',
        remark: ''
      })
    },
    removeCustomTemplateRow(idx) {
      this.customTemplateForm.items.splice(idx, 1)
      this.customTemplateForm.items.forEach((item, index) => {
        if (!item.seq) item.seq = index + 1
      })
      if (!this.customTemplateForm.items.length) this.addCustomTemplateRow()
    },
    async saveCustomTemplate() {
      const title = String(this.customTemplateForm.title || '').trim()
      const items = (this.customTemplateForm.items || []).map((item, idx) => ({
        seq: item.seq || idx + 1,
        name: String(item.name || '').trim(),
        designValue: String(item.designValue || '').trim(),
        toleranceText: String(item.toleranceText || '').trim(),
        remark: String(item.remark || '').trim()
      })).filter((item) => item.name)
      if (!title) {
        this.$Message.warning('请输入模板名称')
        return
      }
      if (!items.length) {
        this.$Message.warning('至少填写一条检测项')
        return
      }
      this.savingCustomTemplate = true
      try {
        const res = await axios.post('/api/qc-templates/custom', {
          title,
          items: items.map((item) => ({
            ...item,
            toleranceTexts: item.toleranceText ? [item.toleranceText] : []
          }))
        }, { headers: getAuthHeaders() })
        const payload = this.normalizeAxiosPayload(res)
        if (!payload || !payload.success || !payload.data) {
          throw new Error((payload && payload.message) || '保存模板失败')
        }
        this.qcTemplates = [...this.qcTemplates, payload.data]
        this.selectedTemplateId = payload.data.id
        this.showTemplateModal = false
        this.buildRows()
      } catch (e) {
        this.$Message.warning(e && e.message ? e.message : '保存模板失败')
      } finally {
        this.savingCustomTemplate = false
      }
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
        row.forcedPass = false
        return
      }
      const deviation = m - d
      row.deviation = deviation
      row.verdict = Math.abs(deviation) > Number(row.tol) ? '不合格' : '合格'
      row.deviationClass = this.getDeviationClass(deviation, row.tol)
      row.verdictClass = this.getVerdictClass(row.verdict)
      row.forcedPass = false
    },
    forceRowPass(row) {
      if (!this.canEdit || !row) return
      const d = Number(row.designValue)
      const tol = Number(row.tol)
      if (Number.isNaN(d) || Number.isNaN(tol) || tol <= 0) return

      const currentDeviation = Number(row.deviation)
      const direction = Number.isNaN(currentDeviation) || currentDeviation === 0 ? 1 : (currentDeviation > 0 ? 1 : -1)
      const safeDeviation = direction * tol * 0.6
      const safeMeasuredValue = d + safeDeviation

      row.measuredValue = String(Number(safeMeasuredValue.toFixed(4)))
      row.deviation = safeDeviation
      row.verdict = '合格'
      row.deviationClass = this.getDeviationClass(safeDeviation, tol)
      row.verdictClass = this.getVerdictClass('合格')
      row.forcedPass = true
      row._dirty = true
    },
    handleDrawerForcePass(row) {
      if (!row) return
      this.judgementConfirmRow = row
    },
    cancelJudgementConfirm() {
      this.judgementConfirmRow = null
    },
    confirmForceRowPass() {
      if (!this.judgementConfirmRow) return
      this.forceRowPass(this.judgementConfirmRow)
      this.judgementConfirmRow = null
      if (!this.fixableRows.length) this.showJudgementDrawer = false
    },
    openReinspectionConfirm() {
      if (!this.canScheduleReinspection) return
      this.reinspectionDate = new Date().toISOString().slice(0, 10)
      this.showReinspectionConfirm = true
    },
    closeReinspectionConfirm() {
      this.showReinspectionConfirm = false
    },
    openOutboundConfirm() {
      if (!this.canOutbound) return
      this.showOutboundConfirm = true
    },
    closeOutboundConfirm() {
      this.showOutboundConfirm = false
    },
    buildReportSnapshot() {
      return {
        templateId: this.selectedTemplateId,
        templateTitle: this.selectedTemplate && this.selectedTemplate.title ? this.selectedTemplate.title : '',
        projectName: this.activeProjectName || '',
        componentNo: this.componentNo || '',
        assignment: this.activeAssignment,
        rows: (this.rows || []).map((row) => ({
          seq: row.seq,
          itemName: row.itemName,
          designValue: row.designValue,
          toleranceText: row.toleranceText,
          measuredValue: row.measuredValue,
          verdict: row.verdict,
          remark: this.autoRemark(row) || row.remark || ''
        }))
      }
    },
    async confirmScheduleReinspection() {
      if (!this.reinspectionDate) {
        this.$Message.warning('请选择复检日期')
        return
      }
      try {
        const res = await axios.post('/api/qc/reinspection', {
          projectId: this.activeProjectId,
          componentId: this.selectedComponentId,
          reinspectionDate: this.reinspectionDate,
          inspectionDate: new Date().toISOString().slice(0, 10),
          rows: this.rows
        }, { headers: getAuthHeaders() })
        const payload = this.normalizeAxiosPayload(res)
        if (!payload || !payload.success) throw new Error((payload && payload.message) || '安排复检失败')
        this.componentStatus = '待复检'
        this.showReinspectionConfirm = false
        this.$Message.success('已安排复检')
        this.fetchReinspectionTasks()
        if (this.$bus) this.$bus.$emit('project-list-update')
      } catch (e) {
        this.$Message.warning(e && e.message ? e.message : '安排复检失败')
      }
    },
    async confirmOutbound() {
      try {
        const inspectionDate = new Date().toISOString().slice(0, 10)
        const res = await axios.post('/api/qc/outbound', {
          projectId: this.activeProjectId,
          componentId: this.selectedComponentId,
          inspectionDate,
          rows: this.rows,
          reportSnapshot: this.buildReportSnapshot()
        }, { headers: getAuthHeaders() })
        const payload = this.normalizeAxiosPayload(res)
        if (!payload || !payload.success) throw new Error((payload && payload.message) || '出库失败')
        this.componentStatus = '已出库'
        this.componentQualifiedAt = payload.inspectionDate || inspectionDate
        this.componentOutboundAt = payload.outboundDate || inspectionDate
        this.showOutboundConfirm = false
        this.$Message.success('出库成功')
        if (this.$bus) this.$bus.$emit('project-list-update')
        this.moveToNextPlanComponent()
      } catch (e) {
        this.$Message.warning(e && e.message ? e.message : '出库失败')
      }
    },
    async fetchReinspectionTasks() {
      try {
        const res = await axios.get('/api/qc/reinspection-tasks', {
          params: this.activeProjectId ? { projectId: this.activeProjectId } : {}
        })
        const payload = this.normalizeAxiosPayload(res)
        this.defectTaskList = payload && payload.success && Array.isArray(payload.data) ? payload.data : []
      } catch (e) {
        this.defectTaskList = []
      }
    },
    async moveToNextPlanComponent() {
      try {
        const res = await axios.get('/api/today-plan', { headers: getAuthHeaders() })
        const payload = this.normalizeAxiosPayload(res)
        const list = payload && payload.success && Array.isArray(payload.data) ? payload.data : []
        const available = list.filter((item) => String(item.status || '').trim() !== '已出库')
        if (!available.length) return
        const currentMark = String(this.componentNo || '').trim()
        const currentIndex = available.findIndex((item) => String(item.componentMark || item.componentName || '').trim() === currentMark)
        const nextItem = available[currentIndex >= 0 && currentIndex < available.length - 1 ? currentIndex + 1 : 0]
        if (!nextItem) return

        const nextMark = String(nextItem.componentMark || nextItem.componentName || '').trim()
        if (!nextMark) return
        localStorage.setItem('current_component_mark', nextMark)
        localStorage.setItem('cm_selected_component', JSON.stringify({
          projectId: nextItem.projectId || '',
          ifcUrl: nextItem.ifcUrl || '',
          expressID: nextItem.ifcElementId || '',
          componentMark: nextItem.componentMark || nextItem.componentName || '',
          componentName: nextItem.componentName || nextItem.componentMark || '',
          name: nextItem.componentName || nextItem.componentMark || '',
          globalId: nextItem.ifcGlobalId || '',
          detail: null,
          timestamp: Date.now()
        }))
        this.syncComponentFromStorage()
      } catch (e) {
        console.warn('moveToNextPlanComponent failed', e)
      }
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
      if (!this.selectedTemplateId || this.componentStatus !== '已出库') return

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
        title.textContent = `${this.selectedTemplate?.title || 'H型钢柱质检表'}`
        container.appendChild(title)

        const headerMeta = document.createElement('div')
        headerMeta.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 16px;
          font-size: 14px;
          color: #333;
          flex-wrap: wrap;
        `
        headerMeta.innerHTML = `
          <span>项目名称：${this.activeProjectName || '—'}</span>
          <span>班组：${this.activeAssignment.groupName || '—'}</span>
          <span>构件编号：${this.componentNo || '—'}</span>
        `
        container.appendChild(headerMeta)

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

        const footerMeta = document.createElement('div')
        footerMeta.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-top: 18px;
          font-size: 14px;
          color: #333;
          flex-wrap: wrap;
        `
        footerMeta.innerHTML = `
          <span>班组长：${this.activeAssignment.teamLeaderName || '—'}</span>
          <span>质检员：${this.activeAssignment.qualityInspectorName || '—'}</span>
          <span>质量员：${this.activeAssignment.qualityManagerName || '—'}</span>
          <span>检测日期：${this.componentQualifiedAt || new Date().toLocaleDateString('zh-CN')}</span>
        `
        container.appendChild(footerMeta)

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
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0, 190, 255, 0.15);
  background: linear-gradient(180deg, rgba(0, 190, 255, 0.1) 0%, rgba(11, 33, 72, 0.3) 100%);
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}
.head-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
.title-text { font-size: 17px; font-weight: 800; color: #c9f3ff; letter-spacing: 1px; }
.title-sep { color: rgba(255, 255, 255, 0.3); }
.component-name { font-size: 14px; font-weight: 700; color: #ffd166; text-shadow: 0 0 10px rgba(255, 209, 102, 0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
.head-stats { display: flex; gap: 8px; }
.stat-chip { padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03); cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.stat-chip:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18), inset 0 0 0 1px rgba(255,255,255,0.04); }
.stat-chip--active { box-shadow: 0 0 0 1px rgba(255,255,255,0.12), 0 0 18px rgba(0, 190, 255, 0.2); }
.stat-chip--total { background: rgba(0, 190, 255, 0.1); border-color: rgba(0, 190, 255, 0.3); color: rgba(255, 255, 255, 0.8); }
.stat-chip--ok { background: rgba(0, 255, 163, 0.1); border-color: rgba(0, 255, 163, 0.3); color: #00ffa3; }
.stat-chip--ng { background: rgba(255, 77, 109, 0.1); border-color: rgba(255, 77, 109, 0.3); color: #ff4d6d; }
.report-mini-body { flex: 1; overflow-y: auto; padding: 10px; background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(8,20,44,0.08) 100%); }
.report-mini-body::-webkit-scrollbar { width: 6px; }
.report-mini-body::-webkit-scrollbar-track { background: rgba(15, 60, 130, 0.2); }
.report-mini-body::-webkit-scrollbar-thumb { background: rgba(0, 190, 255, 0.3); border-radius: 3px; }

/* 原模板样式表格 */
.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
  overflow: hidden;
  border-radius: 10px;
}
.report-table thead th {
  position: sticky; top: 0; z-index: 5; padding: 8px 4px;
  background: linear-gradient(180deg, #4d79cb 0%, #35579e 100%);
  border: 1px solid rgba(42, 64, 128, 0.9);
  font-weight: bold;
  text-align: center;
  font-size: 11px;
  color: #fff;
  letter-spacing: 0.5px;
  white-space: pre-wrap;
}
.report-table tbody td {
  padding: 7px 5px;
  border: 1px solid rgba(68, 114, 196, 0.18);
  text-align: center;
  color: #21314d;
  vertical-align: middle;
  background: rgba(255, 255, 255, 0.96);
}
.report-table tbody tr:nth-child(even) td { background: rgba(247, 250, 255, 0.98); }
.report-table tbody tr:hover td { background: rgba(214, 232, 255, 0.9); }
.report-table tbody tr.row-ng td { background: #ffe8eb; }

/* 表格列宽 */
.col-seq { width: 40px; }
.col-item { width: 156px; text-align: left !important; padding-left: 10px !important; font-weight: 600; white-space: normal; line-height: 1.45; }
.col-design { width: 86px; }
.col-tolerance { width: 128px; font-size: 10px; text-align: left !important; padding-left: 8px !important; white-space: pre-wrap; line-height: 1.4; }
.col-selfcheck { width: 110px; }
.col-leader { width: 88px; font-weight: bold; }
.col-remark { width: 128px; text-align: left !important; padding-left: 10px !important; line-height: 1.45; }

/* 可编辑单元格 */
.editable-cell { padding: 2px !important; }
.table-input {
  width: 100%;
  height: 28px;
  border: 1px solid rgba(68, 114, 196, 0.18);
  border-radius: 6px;
  text-align: center;
  font-size: 12px;
  padding: 0 4px;
  background: rgba(255,255,255,0.78);
  color: #21314d;
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
  padding: 12px 16px; border-top: 1px solid rgba(0, 190, 255, 0.15);
  background: linear-gradient(180deg, rgba(3, 14, 33, 0.1) 0%, rgba(1, 9, 24, 0.24) 100%); display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0;
}
.assignment-summary { display: flex; align-items: center; gap: 10px; min-width: 0; color: rgba(255, 255, 255, 0.88); font-size: 12px; font-weight: 700; flex-wrap: wrap; }
.assignment-summary span { background: rgba(18, 53, 110, 0.42); border: 1px solid rgba(0,190,255,0.14); padding: 5px 10px; border-radius: 999px; }
.action-btns { display: flex; gap: 8px; }
.btn { height: 34px; padding: 0 14px; border-radius: 8px; border: 1px solid; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-outline { background: rgba(15, 60, 130, 0.3); border-color: rgba(0, 190, 255, 0.25); color: rgba(255, 255, 255, 0.8); }
.btn-outline:hover:not(:disabled) { background: rgba(0, 190, 255, 0.1); border-color: rgba(0, 190, 255, 0.5); color: #7dd8ff; }
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
.model-body { flex: 1; display: flex; align-items: center; justify-content: center; background: rgba(15, 60, 130, 0.3); min-height: 0; overflow: hidden; }
.model-body--empty { align-items: stretch; justify-content: stretch; background: rgba(6, 21, 46, 0.18); }
.model-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; color: rgba(255, 255, 255, 0.4); }
.model-placeholder svg { color: rgba(0, 190, 255, 0.25); }
.placeholder-text { font-size: 14px; font-weight: 600; }
.compare-stack { width: 100%; height: 100%; display: grid; grid-template-rows: 1fr 1fr; gap: 8px; padding: 8px; }
.compare-pane { position: relative; min-height: 0; border: 1px solid rgba(50, 255, 156, 0.24); border-radius: 10px; overflow: hidden; background: rgba(3, 12, 24, 0.9); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02); }
.compare-pane--red { border-color: rgba(255, 88, 88, 0.3); }
.compare-pane--red :deep(.cdv-iframe) { filter: hue-rotate(145deg) saturate(1.5) brightness(0.95); }
.template-modal { position: fixed; inset: 0; z-index: 12000; background: rgba(2, 10, 20, 0.72); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
.template-modal__panel { width: min(1180px, 90vw); max-height: 86vh; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; background: linear-gradient(180deg, rgba(14, 42, 88, 0.98), rgba(6, 22, 48, 0.98)); border: 1px solid rgba(0, 190, 255, 0.25); box-shadow: 0 24px 80px rgba(0,0,0,0.4); }
.template-modal__head { height: 54px; padding: 0 18px; display: flex; align-items: center; justify-content: space-between; color: #dff7ff; font-size: 18px; font-weight: 800; border-bottom: 1px solid rgba(0, 190, 255, 0.18); }
.template-modal__close { width: 34px; height: 34px; border: none; border-radius: 8px; background: rgba(255,255,255,0.06); color: #dff7ff; font-size: 22px; cursor: pointer; }
.template-modal__body { padding: 16px 18px; overflow: auto; }
.template-form-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.template-form-label { color: rgba(220, 240, 255, 0.82); font-size: 13px; font-weight: 700; }
.template-editor-head, .template-editor-row { display: grid; grid-template-columns: 80px 1.3fr 1fr 1fr 1fr 90px; gap: 10px; align-items: center; }
.template-editor-head { padding: 10px 12px; border-radius: 10px; background: rgba(44, 91, 170, 0.42); color: #d5efff; font-size: 12px; font-weight: 800; margin-bottom: 10px; }
.template-editor-body { display: flex; flex-direction: column; gap: 10px; }
.template-editor-row { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.05); }
.template-input { height: 36px; border-radius: 8px; border: 1px solid rgba(0, 190, 255, 0.18); background: rgba(4, 17, 36, 0.72); color: #fff; padding: 0 10px; outline: none; }
.template-input--title { width: 360px; }
.template-input--seq { text-align: center; }
.template-row-btn { height: 36px; border: 1px solid rgba(0, 190, 255, 0.2); border-radius: 8px; background: rgba(10, 36, 76, 0.78); color: #dff7ff; cursor: pointer; font-weight: 700; }
.template-row-btn--del { border-color: rgba(255, 88, 88, 0.28); color: #ffb0b0; background: rgba(62, 18, 18, 0.72); }
.template-row-btn--add { margin-top: 12px; padding: 0 16px; }
.template-modal__foot { height: 66px; padding: 0 18px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(0, 190, 255, 0.18); }
.template-action { min-width: 112px; height: 38px; border-radius: 10px; border: 1px solid transparent; font-weight: 800; cursor: pointer; }
.template-action--ghost { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); color: #dff7ff; }
.template-action--primary { background: linear-gradient(180deg, rgba(0, 190, 255, 0.92), rgba(0, 118, 243, 0.88)); color: #03111d; }
.judgement-confirm-mask {
  position: fixed;
  inset: 0;
  z-index: 13000;
  background: rgba(2, 10, 20, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
}
.judgement-confirm {
  width: min(440px, 88vw);
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(14, 42, 88, 0.98), rgba(6, 22, 48, 0.98));
  border: 1px solid rgba(0, 190, 255, 0.25);
  box-shadow: 0 24px 80px rgba(0,0,0,0.4);
}
.judgement-confirm__head {
  height: 56px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #dff7ff;
  font-size: 18px;
  font-weight: 800;
  border-bottom: 1px solid rgba(0, 190, 255, 0.18);
}
.judgement-confirm__body {
  padding: 24px 18px;
  color: rgba(230, 246, 255, 0.92);
  font-size: 15px;
  line-height: 1.6;
}
.judgement-confirm--wide {
  width: min(620px, 92vw);
}
.confirm-line {
  margin-bottom: 10px;
}
.confirm-list {
  margin: 0 0 14px;
  padding-left: 18px;
  color: rgba(230, 246, 255, 0.92);
}
.confirm-form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.confirm-date-input {
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 190, 255, 0.22);
  background: rgba(4, 17, 36, 0.72);
  color: #fff;
}

.defect-panel {
  min-height: 0;
}
.defect-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.defect-task-card {
  border-radius: 14px;
  border: 1px solid rgba(0, 190, 255, 0.2);
  background: rgba(7, 27, 58, 0.55);
  padding: 16px;
  color: #dff7ff;
}
.defect-task-card__title {
  font-size: 16px;
  font-weight: 800;
  color: #ffd166;
  margin-bottom: 8px;
}
.defect-task-card__meta {
  font-size: 12px;
  color: rgba(220, 240, 255, 0.74);
  margin-bottom: 6px;
}
.defect-task-card__block {
  margin-top: 12px;
}
.defect-task-card__label {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}
.defect-pill {
  display: inline-flex;
  align-items: center;
  margin: 0 8px 8px 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 77, 109, 0.14);
  border: 1px solid rgba(255, 77, 109, 0.3);
  color: #ffd8df;
  font-size: 12px;
  font-weight: 700;
}
.judgement-confirm__foot {
  height: 68px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(0, 190, 255, 0.18);
}

.judgement-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 12500;
  background: rgba(2, 10, 20, 0.48);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
}
.judgement-drawer {
  width: min(420px, 92vw);
  height: 100%;
  background: linear-gradient(180deg, rgba(10, 34, 74, 0.98), rgba(5, 19, 42, 0.98));
  border-left: 1px solid rgba(0, 190, 255, 0.18);
  box-shadow: -18px 0 48px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
}
.judgement-drawer__head {
  height: 72px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 190, 255, 0.14);
}
.judgement-drawer__title {
  color: #e4fbff;
  font-size: 18px;
  font-weight: 800;
}
.judgement-drawer__sub {
  margin-top: 4px;
  color: rgba(219, 243, 255, 0.58);
  font-size: 12px;
}
.judgement-drawer__close {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  color: #dff7ff;
  font-size: 22px;
  cursor: pointer;
}
.judgement-drawer__body {
  flex: 1;
  overflow: auto;
  padding: 18px;
}
.judgement-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.judgement-item {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border: 1px solid rgba(0, 166, 80, 0.3);
  border-radius: 12px;
  background: rgba(0, 166, 80, 0.08);
  color: #dff7e8;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.judgement-item:hover {
  background: rgba(0, 166, 80, 0.16);
  border-color: rgba(0, 166, 80, 0.52);
  transform: translateX(-2px);
}
.judgement-item__seq {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}
.judgement-item__name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}
.judgement-empty {
  color: rgba(219, 243, 255, 0.56);
  font-size: 14px;
  text-align: center;
  padding-top: 48px;
}
</style>

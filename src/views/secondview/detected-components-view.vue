<template>
  <div class="detected-page">
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="toolbar-title">已检测构件</div>
        <div class="toolbar-subtitle">归档查询与 PDF 下载</div>
      </div>
      <div class="toolbar-right">
        <select v-model="selectedProjectId" class="filter-select" @change="fetchRecords">
          <option value="">全部项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
        <input
          v-model.trim="keyword"
          class="filter-input"
          type="text"
          placeholder="搜索构件编号"
          @keyup.enter="fetchRecords"
        >
        <button class="action-btn" @click="fetchRecords">查询</button>
      </div>
    </div>

    <div class="content-grid">
      <section class="record-panel">
        <div class="panel-head">
          <span>已检测未出库</span>
          <span class="panel-count">{{ pendingRecords.length }}</span>
        </div>
        <div v-if="!pendingRecords.length" class="empty-block">暂无已检测未出库构件</div>
        <div v-else class="record-list">
          <div v-for="item in pendingRecords" :key="item.componentId || item.latestRecordId" class="record-card">
            <div class="record-main">
              <div class="record-mark">{{ item.componentMark || '未命名构件' }}</div>
              <div class="record-meta">{{ item.projectName || '未关联项目' }} ｜ {{ item.latestInspectionDate || '未记录日期' }}</div>
            </div>
            <div class="record-side">
              <div class="record-status record-status--pending">{{ item.statusLabel }}</div>
              <div class="record-history" v-if="item.hasReinspectionHistory">有复检历史</div>
            </div>
            <div class="record-actions">
              <button class="mini-btn" @click="openDetail(item)">查看记录</button>
            </div>
          </div>
        </div>
      </section>

      <section class="record-panel">
        <div class="panel-head">
          <span>已出库</span>
          <span class="panel-count">{{ outboundRecords.length }}</span>
        </div>
        <div v-if="!outboundRecords.length" class="empty-block">暂无已出库构件</div>
        <div v-else class="record-list">
          <div v-for="item in outboundRecords" :key="item.componentId || item.latestRecordId" class="record-card">
            <div class="record-main">
              <div class="record-mark">{{ item.componentMark || '未命名构件' }}</div>
              <div class="record-meta">{{ item.projectName || '未关联项目' }} ｜ 检测 {{ item.latestInspectionDate || '未记录日期' }}</div>
            </div>
            <div class="record-side">
              <div class="record-status record-status--outbound">{{ item.statusLabel }}</div>
              <div class="record-history" v-if="item.hasReinspectionHistory">有复检历史</div>
            </div>
            <div class="record-actions">
              <button class="mini-btn" @click="openDetail(item)">查看记录</button>
              <button class="mini-btn mini-btn--primary" @click="downloadLatestPdf(item)" :disabled="!item.reportFilePath">下载 PDF</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <el-dialog
      title="检测记录详情"
      :visible.sync="detailVisible"
      width="980px"
      append-to-body
      custom-class="qc-record-dialog"
    >
      <div v-if="detailLoading" class="detail-loading">加载中...</div>
      <div v-else-if="!detailRecords.length" class="empty-block">暂无检测记录</div>
      <div v-else class="detail-records">
        <div v-for="record in detailRecords" :key="record.id" class="detail-card">
          <div class="detail-card-head">
            <div>
              <div class="detail-title">{{ record.componentMark }} ｜ {{ record.inspectionDate || '未记录日期' }}</div>
              <div class="detail-meta">{{ record.projectName }} ｜ 结果：{{ record.qcResult || '未判定' }}</div>
            </div>
            <button class="mini-btn mini-btn--primary" @click="downloadRecordPdf(record)" :disabled="!record.reportFilePath">下载 PDF</button>
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>检测项</th>
                <th>设计值</th>
                <th>允许偏差</th>
                <th>实测值</th>
                <th>判定</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in record.items" :key="`${record.id}-${row.id}`">
                <td>{{ row.seq }}</td>
                <td>{{ row.item_name }}</td>
                <td>{{ row.design_value || '-' }}</td>
                <td>{{ row.tolerance_text || '-' }}</td>
                <td>{{ row.measured_value || '-' }}</td>
                <td>{{ row.verdict || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios'
import { getAuthHeaders, saveBlobWithPicker } from '@/utils'

export default {
  name: 'DetectedComponentsView',
  data() {
    return {
      projects: [],
      selectedProjectId: '',
      keyword: '',
      pendingRecords: [],
      outboundRecords: [],
      detailVisible: false,
      detailLoading: false,
      detailRecords: []
    }
  },
  mounted() {
    this.fetchProjects()
    this.fetchRecords()
    if (this.$bus) this.$bus.$on('project-list-update', this.fetchRecords)
  },
  beforeDestroy() {
    if (this.$bus) this.$bus.$off('project-list-update', this.fetchRecords)
  },
  methods: {
    normalizeAxiosPayload(res) {
      if (res && typeof res === 'object' && 'status' in res && 'headers' in res && 'config' in res) return res.data
      return res
    },
    async fetchProjects() {
      try {
        const res = await axios.get('/api/projects')
        const payload = this.normalizeAxiosPayload(res)
        this.projects = payload && payload.success && Array.isArray(payload.data) ? payload.data : []
      } catch (e) {
        this.projects = []
      }
    },
    async fetchRecords() {
      try {
        const res = await axios.get('/api/qc/records', {
          params: {
            projectId: this.selectedProjectId || '',
            keyword: this.keyword || ''
          },
          headers: getAuthHeaders()
        })
        const payload = this.normalizeAxiosPayload(res)
        const data = payload && payload.success ? payload.data || {} : {}
        this.pendingRecords = Array.isArray(data.pending) ? data.pending : []
        this.outboundRecords = Array.isArray(data.outbound) ? data.outbound : []
      } catch (e) {
        this.pendingRecords = []
        this.outboundRecords = []
      }
    },
    async openDetail(item) {
      this.detailVisible = true
      this.detailLoading = true
      this.detailRecords = []
      try {
        const records = Array.isArray(item.records) ? item.records : []
        const detailRows = await Promise.all(records.map(async (record) => {
          const res = await axios.get(`/api/qc/records/${encodeURIComponent(record.id)}`, {
            headers: getAuthHeaders()
          })
          const payload = this.normalizeAxiosPayload(res)
          const data = payload && payload.success ? payload.data : {}
          const current = data.record || {}
          return {
            id: current.id || record.id,
            componentMark: current.component_mark || record.componentMark || item.componentMark || '',
            projectName: current.project_name || record.projectName || item.projectName || '',
            inspectionDate: current.inspection_date || record.inspectionDate || '',
            qcResult: current.qc_result || record.qcResult || '',
            reportFilePath: current.report_file_path || record.reportFilePath || '',
            items: Array.isArray(data.items) ? data.items : []
          }
        }))
        this.detailRecords = detailRows
      } catch (e) {
        this.detailRecords = []
      } finally {
        this.detailLoading = false
      }
    },
    async downloadLatestPdf(item) {
      if (!item || !item.latestRecordId) return
      await this.downloadPdfByRecordId(item.latestRecordId, item.reportFileName)
    },
    async downloadRecordPdf(record) {
      if (!record || !record.id) return
      await this.downloadPdfByRecordId(record.id, `${record.componentMark || '构件'}_质检表.pdf`)
    },
    async downloadPdfByRecordId(recordId, fallbackName = '质检表.pdf') {
      try {
        const res = await axios.get(`/api/qc/records/${encodeURIComponent(recordId)}/pdf`, {
          headers: getAuthHeaders(),
          responseType: 'blob'
        })
        const blob = res instanceof Blob ? res : (res && res.data ? res.data : null)
        if (!(blob instanceof Blob)) throw new Error('无效的 PDF 数据')
        await saveBlobWithPicker(blob, fallbackName, {
          type: 'application/pdf',
          types: [
            {
              description: 'PDF 文档',
              accept: {
                'application/pdf': ['.pdf']
              }
            }
          ]
        })
      } catch (e) {
        if (this.$Message && this.$Message.warning) this.$Message.warning('下载 PDF 失败')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.detected-page {
  width: 100%;
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(180deg, rgba(7, 22, 48, 0.92) 0%, rgba(8, 28, 62, 0.96) 100%);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid rgba(0, 208, 255, 0.26);
  background: linear-gradient(135deg, rgba(10, 48, 100, 0.92) 0%, rgba(5, 26, 58, 0.88) 100%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
}

.toolbar-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toolbar-title {
  color: #ecf8ff;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 2px;
}

.toolbar-subtitle {
  color: rgba(169, 226, 255, 0.78);
  font-size: 14px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-select,
.filter-input {
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(84, 207, 255, 0.32);
  background: rgba(4, 21, 47, 0.82);
  color: #eaf8ff;
  padding: 0 14px;
}

.filter-select {
  min-width: 220px;
}

.filter-input {
  min-width: 220px;
}

.action-btn,
.mini-btn {
  border: none;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.action-btn {
  height: 42px;
  padding: 0 18px;
  color: #081224;
  font-weight: 700;
  background: linear-gradient(135deg, #32d5ff 0%, #8ef3ff 100%);
}

.mini-btn {
  min-width: 88px;
  height: 34px;
  padding: 0 14px;
  color: #dff6ff;
  background: rgba(44, 110, 179, 0.5);
  border: 1px solid rgba(94, 201, 255, 0.26);
}

.mini-btn--primary {
  color: #03233b;
  background: linear-gradient(135deg, #7ef1d0 0%, #b3ffed 100%);
}

.mini-btn[disabled] {
  opacity: 0.42;
  cursor: not-allowed;
}

.content-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.record-panel {
  min-height: 0;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(0, 208, 255, 0.22);
  background: linear-gradient(180deg, rgba(8, 36, 76, 0.82) 0%, rgba(5, 22, 48, 0.92) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #f0fbff;
  font-size: 18px;
  font-weight: 700;
}

.panel-count {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 13px;
  background: rgba(72, 196, 255, 0.18);
  color: #8eefff;
}

.record-list,
.detail-records {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.record-card,
.detail-card {
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(140deg, rgba(11, 53, 108, 0.88) 0%, rgba(6, 28, 59, 0.86) 100%);
  border: 1px solid rgba(100, 220, 255, 0.14);
}

.record-card {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  align-items: center;
}

.record-mark,
.detail-title {
  color: #f3fbff;
  font-size: 20px;
  font-weight: 800;
}

.record-meta,
.detail-meta,
.record-history {
  color: rgba(173, 231, 255, 0.78);
  font-size: 13px;
}

.record-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.record-status {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.record-status--pending {
  color: #ffe8a4;
  background: rgba(255, 195, 83, 0.18);
}

.record-status--outbound {
  color: #9affd4;
  background: rgba(52, 197, 125, 0.18);
}

.record-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.empty-block,
.detail-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(165, 224, 255, 0.72);
  font-size: 18px;
  border-radius: 16px;
  border: 1px dashed rgba(97, 214, 255, 0.18);
  background: rgba(5, 24, 52, 0.35);
}

.detail-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table th,
.detail-table td {
  padding: 10px 8px;
  border: 1px solid rgba(130, 212, 255, 0.16);
  text-align: center;
  color: #ecf8ff;
  font-size: 13px;
}

.detail-table th {
  background: rgba(72, 123, 197, 0.35);
}
</style>

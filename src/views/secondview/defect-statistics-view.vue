<template>
  <div class="defect-page">
    <section class="toolbar-panel">
      <div class="mode-switch">
        <button
          v-for="item in viewModes"
          :key="item.value"
          type="button"
          class="mode-switch__btn"
          :class="{ active: currentMode === item.value }"
          @click="switchMode(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
      <div v-if="currentMode === 'project'" class="project-switch">
        <span class="project-switch__label">选择项目</span>
        <select v-model="selectedProjectId" class="project-switch__select" @change="fetchStatistics">
          <option v-for="project in projectOptions" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>
      <button type="button" class="refresh-btn" :disabled="loading" @click="fetchStatistics">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </section>

    <section class="overview-grid">
      <article v-for="card in activeOverviewCards" :key="card.key" class="overview-card" :class="card.theme">
        <div class="overview-card__group">{{ card.group }}</div>
        <div class="overview-card__label">{{ card.label }}</div>
        <div class="overview-card__value">{{ card.value }}</div>
        <div class="overview-card__sub">{{ card.sub }}</div>
      </article>
    </section>

    <section class="panel chart-panel">
      <div class="panel-head">
        <div>
          <div class="panel-head__title">{{ currentModeTitle }}缺陷类型统计</div>
          <div class="panel-head__meta">{{ currentModeSubtitle }}</div>
        </div>
      </div>
      <div class="chart-stage">
        <div class="chart-layout">
          <div class="type-carousel-panel">
            <div class="type-carousel-track" :style="carouselStyle">
              <div
                v-for="(row, index) in carouselRows"
                :key="`${row.defectType}-${index}`"
                class="type-card type-card--compact"
              >
                <div class="type-card__head">
                  <span class="type-dot" :style="{ background: row.color }"></span>
                  <span class="type-card__name">{{ row.defectType }}</span>
                  <span class="type-card__count">{{ row.count }}项</span>
                </div>
                <div class="type-card__stats">
                  <span>占比 {{ formatPercent(row.itemRate) }}</span>
                  <span>出现率 {{ formatPercent(row.componentRate) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="bar-chart-panel">
            <div class="bar-chart-head">
              <div class="bar-chart-head__title">缺陷占总缺陷百分比</div>
              <div class="bar-chart-head__sub">按缺陷项数统计，柱顶斜向显示百分比</div>
            </div>
            <div class="bar-chart">
              <div v-for="row in activeRows" :key="`bar-${row.defectType}`" class="bar-chart__item">
                <div class="bar-chart__value" :style="{ color: row.color }">
                  {{ formatPercent(row.itemRate) }}
                </div>
                <div class="bar-chart__column-wrap">
                  <div class="bar-chart__column-bg">
                    <div
                      class="bar-chart__column-fill"
                      :style="{ height: `${Math.max(row.itemRate * 100, row.count ? 6 : 0)}%`, background: `linear-gradient(180deg, ${row.color}, rgba(255,255,255,0.16))` }"
                    ></div>
                  </div>
                </div>
                <div class="bar-chart__label">{{ row.defectType }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import axios from 'axios'
import { getAuthHeaders } from '@/utils'

const DEFECT_TYPES = [
  { defectType: '柱脚螺栓孔中心对柱轴线的距离', color: '#ff8a65' },
  { defectType: '柱底板平面度', color: '#ffb74d' },
  { defectType: '节点变形', color: '#ffd54f' },
  { defectType: '节点尺寸（牛腿、连接板）', color: '#d4e157' },
  { defectType: '构件长度', color: '#81c784' },
  { defectType: '扭曲旁弯', color: '#4db6ac' },
  { defectType: '构件截面', color: '#4fc3f7' },
  { defectType: '构件垂直度', color: '#64b5f6' },
  { defectType: '对接', color: '#7986cb' },
  { defectType: '孔距', color: '#9575cd' },
  { defectType: '拱高', color: '#ba68c8' },
  { defectType: '起拱', color: '#f06292' },
  { defectType: '定位尺寸', color: '#ec407a' },
  { defectType: '板变形', color: '#ef5350' }
]

function createEmptyScope() {
  return {
    inspectedComponentCount: 0,
    defectComponentCount: 0,
    firstPassRate: 0,
    defectTypes: DEFECT_TYPES.map((item) => ({
      defectType: item.defectType,
      count: 0,
      componentCount: 0,
      componentRate: 0,
      itemRate: 0,
      latestOccurredAt: ''
    }))
  }
}

export default {
  name: 'DefectStatisticsView',
  data() {
    return {
      loading: false,
      currentMode: 'project',
      activeProjectId: '',
      selectedProjectId: '',
      projectOptions: [],
      projectStats: createEmptyScope(),
      overallStats: createEmptyScope()
    }
  },
  computed: {
    viewModes() {
      return [
        { label: '单项目', value: 'project' },
        { label: '总项目', value: 'overall' }
      ]
    },
    currentModeTitle() {
      return this.currentMode === 'project' ? '单项目' : '总项目'
    },
    currentModeSubtitle() {
      if (this.currentMode === 'project') {
        const current = this.projectOptions.find((item) => String(item.id) === String(this.selectedProjectId))
        return current ? `项目：${current.name}` : '请选择项目'
      }
      return '数据库历史累计'
    },
    activeScope() {
      return this.currentMode === 'project' ? this.projectStats : this.overallStats
    },
    activeRows() {
      return DEFECT_TYPES.map((item) => {
        const current = (this.activeScope.defectTypes || []).find((row) => row.defectType === item.defectType) || {}
        return {
          defectType: item.defectType,
          color: item.color,
          count: Number(current.count || 0),
          componentRate: Number(current.componentRate || 0),
          itemRate: Number(current.itemRate || 0),
          latestOccurredAt: current.latestOccurredAt || ''
        }
      })
    },
    carouselRows() {
      const rows = this.activeRows
      if (!rows.length) return []
      return rows.concat(rows)
    },
    carouselStyle() {
      const baseCount = this.activeRows.length || 1
      return {
        '--carousel-duration': `${Math.max(baseCount * 2.4, 24)}s`
      }
    },
    activeOverviewCards() {
      return [
        {
          key: `${this.currentMode}-inspected`,
          group: this.currentMode === 'project' ? '单项目' : '总项目',
          label: '已检构件数',
          value: this.activeScope.inspectedComponentCount,
          sub: this.currentMode === 'project' ? '当前选中项目' : '所有项目历史累计',
          theme: 'theme-cyan'
        },
        {
          key: `${this.currentMode}-defect`,
          group: this.currentMode === 'project' ? '单项目' : '总项目',
          label: '缺陷构件数',
          value: this.activeScope.defectComponentCount,
          sub: '存在至少一类缺陷',
          theme: 'theme-orange'
        },
        {
          key: `${this.currentMode}-pass`,
          group: this.currentMode === 'project' ? '单项目' : '总项目',
          label: '一次合格率',
          value: this.formatPercent(this.activeScope.firstPassRate),
          sub: '未复检直接合格',
          theme: 'theme-green'
        }
      ]
    },
  },
  mounted() {
    this.initPage()
    if (this.$bus) this.$bus.$on('project-list-update', this.handleProjectUpdate)
  },
  beforeDestroy() {
    if (this.$bus) this.$bus.$off('project-list-update', this.handleProjectUpdate)
  },
  methods: {
    formatPercent(value) {
      const num = Number(value || 0)
      return `${(num * 100).toFixed(num && num < 0.1 ? 2 : 1)}%`
    },
    normalizePayload(res) {
      if (res && typeof res === 'object' && 'status' in res && 'headers' in res && 'config' in res) return res.data
      return res
    },
    switchMode(mode) {
      this.currentMode = mode
    },
    async initPage() {
      await this.fetchProjects()
      await this.fetchStatistics()
    },
    async fetchProjects() {
      try {
        const res = await axios.get('/api/projects', { headers: getAuthHeaders() })
        const payload = this.normalizePayload(res)
        const list = payload && payload.success && Array.isArray(payload.data) ? payload.data : []
        this.projectOptions = list.map((item) => ({
          id: item.id,
          name: item.name || item.projectName || item.id
        }))
        this.activeProjectId = payload && payload.activeProjectId ? String(payload.activeProjectId) : ''
        if (!this.selectedProjectId) {
          this.selectedProjectId = this.activeProjectId || (this.projectOptions[0] ? String(this.projectOptions[0].id) : '')
        }
      } catch (error) {
        this.projectOptions = []
        this.selectedProjectId = ''
        this.activeProjectId = ''
      }
    },
    async fetchStatistics() {
      this.loading = true
      try {
        const params = {}
        if (this.selectedProjectId) params.projectId = this.selectedProjectId
        const res = await axios.get('/api/qc/defect-statistics', {
          headers: getAuthHeaders(),
          params
        })
        const payload = this.normalizePayload(res)
        if (!payload || !payload.success || !payload.data) throw new Error((payload && payload.message) || '获取缺陷统计失败')
        this.activeProjectId = payload.data.activeProjectId || this.activeProjectId
        this.projectStats = {
          ...createEmptyScope(),
          ...(payload.data.project || {}),
          defectTypes: (payload.data.project && payload.data.project.defectTypes) || createEmptyScope().defectTypes
        }
        this.overallStats = {
          ...createEmptyScope(),
          ...(payload.data.overall || {}),
          defectTypes: (payload.data.overall && payload.data.overall.defectTypes) || createEmptyScope().defectTypes
        }
      } catch (error) {
        this.projectStats = createEmptyScope()
        this.overallStats = createEmptyScope()
        if (this.$Message && this.$Message.warning) {
          this.$Message.warning(error && error.message ? error.message : '获取缺陷统计失败')
        }
      } finally {
        this.loading = false
      }
    },
    async handleProjectUpdate() {
      await this.fetchProjects()
      await this.fetchStatistics()
    }
  }
}
</script>

<style lang="scss" scoped>
.defect-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: 64px 180px minmax(0, 1fr);
  gap: 16px;
  padding: 14px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 32%),
    radial-gradient(circle at top right, rgba(244, 114, 182, 0.10), transparent 28%),
    linear-gradient(145deg, #081b39 0%, #0b2350 46%, #08162f 100%);
}

.toolbar-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  border-radius: 18px;
  border: 1px solid rgba(118, 226, 255, 0.18);
  background: linear-gradient(180deg, rgba(10, 33, 70, 0.92), rgba(6, 18, 41, 0.96));
  box-shadow: 0 18px 42px rgba(1, 9, 24, 0.24);
}

.mode-switch {
  display: flex;
  gap: 10px;
}

.mode-switch__btn {
  min-width: 120px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(118, 226, 255, 0.18);
  background: rgba(8, 35, 74, 0.78);
  color: rgba(220, 244, 255, 0.78);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-switch__btn.active {
  color: #04121f;
  background: linear-gradient(180deg, rgba(75, 227, 255, 0.95), rgba(0, 154, 255, 0.88));
  box-shadow: 0 0 20px rgba(0, 190, 255, 0.24);
}

.project-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.project-switch__label {
  color: #dff7ff;
  font-size: 13px;
  font-weight: 700;
}

.project-switch__select {
  min-width: 260px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(118, 226, 255, 0.24);
  background: rgba(8, 35, 74, 0.82);
  color: #dff7ff;
  padding: 0 10px;
  outline: none;
}

.refresh-btn {
  min-width: 96px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(118, 226, 255, 0.24);
  background: rgba(8, 35, 74, 0.82);
  color: #dff7ff;
  font-weight: 700;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.overview-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 18px 18px 16px;
  border: 1px solid rgba(118, 226, 255, 0.22);
  background: linear-gradient(180deg, rgba(9, 35, 76, 0.92), rgba(7, 22, 49, 0.94));
  box-shadow: 0 16px 38px rgba(1, 9, 24, 0.36), inset 0 1px 0 rgba(255,255,255,0.05);
}

.overview-card::after {
  content: '';
  position: absolute;
  inset: auto -15% -35% 45%;
  height: 120px;
  background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 65%);
  pointer-events: none;
}

.theme-cyan { box-shadow: 0 16px 38px rgba(1, 9, 24, 0.36), 0 0 24px rgba(0, 212, 255, 0.10); }
.theme-orange { box-shadow: 0 16px 38px rgba(1, 9, 24, 0.36), 0 0 24px rgba(255, 122, 69, 0.10); }
.theme-green { box-shadow: 0 16px 38px rgba(1, 9, 24, 0.36), 0 0 24px rgba(45, 212, 191, 0.10); }

.overview-card__group {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  color: rgba(141, 230, 255, 0.72);
  margin-bottom: 10px;
}

.overview-card__label {
  font-size: 15px;
  color: #dff7ff;
  font-weight: 700;
}

.overview-card__value {
  margin-top: 14px;
  font-size: 34px;
  line-height: 1;
  font-weight: 900;
  color: #f8fdff;
  text-shadow: 0 0 14px rgba(125, 216, 255, 0.18);
}

.overview-card__sub {
  margin-top: 10px;
  font-size: 12px;
  color: rgba(220, 244, 255, 0.56);
}

.panel {
  border-radius: 18px;
  border: 1px solid rgba(118, 226, 255, 0.18);
  background: linear-gradient(180deg, rgba(10, 33, 70, 0.92), rgba(6, 18, 41, 0.96));
  box-shadow: 0 18px 42px rgba(1, 9, 24, 0.34);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-head {
  min-height: 56px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(118, 226, 255, 0.12);
  background: linear-gradient(180deg, rgba(0, 190, 255, 0.08), rgba(9, 27, 58, 0.24));
}

.panel-head__title {
  color: #eaf9ff;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 1px;
}

.panel-head__meta {
  margin-top: 4px;
  color: rgba(220, 244, 255, 0.56);
  font-size: 12px;
}

.chart-panel {
  min-height: 0;
}

.chart-stage {
  flex: 1;
  min-height: 0;
  padding: 14px;
}

.chart-layout {
  height: 100%;
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.type-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
  box-shadow: 0 0 10px currentColor;
}

.type-carousel-panel {
  min-height: 0;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(118, 226, 255, 0.12);
  background: rgba(7, 22, 49, 0.82);
  position: relative;
}

.type-carousel-panel::before,
.type-carousel-panel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 36px;
  z-index: 2;
  pointer-events: none;
}

.type-carousel-panel::before {
  top: 0;
  background: linear-gradient(180deg, rgba(7, 22, 49, 0.98), rgba(7, 22, 49, 0));
}

.type-carousel-panel::after {
  bottom: 0;
  background: linear-gradient(180deg, rgba(7, 22, 49, 0), rgba(7, 22, 49, 0.98));
}

.type-carousel-track {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  animation: defect-carousel var(--carousel-duration) linear infinite;
}

.type-carousel-panel:hover .type-carousel-track {
  animation-play-state: paused;
}

.type-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(118, 226, 255, 0.14);
  background: rgba(8, 24, 52, 0.88);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

.type-card--compact {
  padding: 12px 14px;
}

.type-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f4fbff;
  font-weight: 800;
}

.type-card__name {
  flex: 1;
}

.type-card__count {
  color: #ffd166;
}

.type-card__stats {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  color: rgba(220, 244, 255, 0.72);
  font-size: 12px;
}

.bar-chart-panel {
  min-width: 0;
  border-radius: 16px;
  border: 1px solid rgba(118, 226, 255, 0.12);
  background: rgba(7, 22, 49, 0.82);
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 14px 8px;
}

.bar-chart-head {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.bar-chart-head__title {
  color: #f4fbff;
  font-size: 15px;
  font-weight: 800;
}

.bar-chart-head__sub {
  margin-top: 4px;
  color: rgba(220, 244, 255, 0.56);
  font-size: 12px;
}

.bar-chart {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(14, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
  padding-top: 28px;
}

.bar-chart__item {
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.bar-chart__value {
  font-size: 11px;
  font-weight: 800;
  transform: rotate(-32deg);
  transform-origin: center bottom;
  white-space: nowrap;
  margin-bottom: 6px;
}

.bar-chart__column-wrap {
  width: 100%;
  flex: 1;
  min-height: 140px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-chart__column-bg {
  width: 70%;
  height: 100%;
  border-radius: 14px 14px 6px 6px;
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  border: 1px solid rgba(118, 226, 255, 0.1);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.bar-chart__column-fill {
  width: 100%;
  min-height: 0;
  border-radius: 10px 10px 4px 4px;
  box-shadow: 0 0 18px rgba(255,255,255,0.12);
}

.bar-chart__label {
  width: 100%;
  min-height: 54px;
  color: rgba(226, 244, 255, 0.76);
  font-size: 11px;
  line-height: 1.25;
  text-align: center;
  word-break: break-all;
}

@keyframes defect-carousel {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
}

@media (max-width: 1600px) {
  .bar-chart {
    gap: 6px;
  }
}

@media (max-width: 1400px) {
  .chart-layout {
    grid-template-columns: 1fr;
  }

  .type-carousel-panel {
    height: 220px;
  }

  .bar-chart {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}
</style>

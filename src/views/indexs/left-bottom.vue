<template>
  <div class="plan-wrap">

    <!-- 标签栏 -->
    <div class="tab-bar">
      <button type="button" class="tab-btn" :class="{ active: activeTab === 'today' }" @click="switchTab('today')">
        今日检测计划
      </button>
      <button type="button" class="tab-btn" :class="{ active: activeTab === 'history' }" @click="switchTab('history')">
        历史检测记录
      </button>
      <div class="tab-spacer" />
      <button v-if="canEdit && activeTab === 'today'" type="button" class="btn-edit" @click="openEditModal">编辑</button>
    </div>

    <!-- ── 今日检测计划 ── -->
    <div v-show="activeTab === 'today'" class="content">

      <!-- 空状态 -->
      <div v-if="todayList.length === 0" class="empty-block">
        <div class="empty-glow" />
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(0,186,255,0.4)" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div class="empty-text">暂无今日检测计划</div>
        <div class="empty-sub">点击「编辑」添加检测项目</div>
      </div>

      <!-- 数据列表 -->
        <div v-else class="list-area">
          <!-- 表头 -->
          <div class="row row--head row--plan">
            <span class="cell cell--project">项目名称</span>
            <span class="cell cell--component">构件编号</span>
            <span class="cell cell--team">班组</span>
          </div>
        <!-- 内容区 -->
        <div class="list-body" ref="listBody">
          <div
            v-for="(item, i) in todayList"
            :key="(item.componentId || '') + '-' + i"
            class="row row--plan"
            :class="{ 'is-active': item.projectId && item.projectId === highlightedProjectId }"
            @click="goToProject(item)"
          >
            <span class="cell cell--project" :title="item.project">
              <span class="dot dot--project" />{{ item.project || '—' }}
            </span>
            <span class="cell cell--component" :title="item.componentName">{{ item.componentName || '—' }}</span>
            <span class="cell cell--team" :title="item.teamName || item.team">{{ item.teamName || item.team || '—' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 历史检测记录 ── -->
    <div v-show="activeTab === 'history'" class="content">

      <div v-if="historyLoading" class="empty-block">
        <div class="empty-text" style="color:rgba(0,186,255,0.5)">加载中...</div>
      </div>
      <div v-else-if="historyList.length === 0" class="empty-block">
        <div class="empty-glow" />
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(0,186,255,0.4)" stroke-width="1.5">
            <circle cx="12" cy="12" r="9"/>
            <polyline points="12 7 12 12 15 15"/>
          </svg>
        </div>
        <div class="empty-text">暂无历史检测记录</div>
        <div class="empty-sub">完成检测后自动归档</div>
      </div>
      <div v-else class="list-area">
        <div class="row row--head row--history">
          <span class="cell cell--project">项目名称</span>
          <span class="cell cell--type">构件编号</span>
          <span class="cell cell--num">构件编号</span>
          <span class="cell cell--date">检测日期</span>
        </div>
        <div class="list-body">
          <div
            v-for="(row, i) in historyList"
            :key="i"
            class="row row--history"
            @click="goToHistoryItem(row)"
          >
            <span class="cell cell--project">
              <span class="dot dot--project" />{{ row.projectName }}
            </span>
            <span class="cell cell--type">{{ row.componentNumber || row.componentType }}</span>
            <span class="cell cell--num">{{ row.componentNumber }}</span>
            <span class="cell cell--date">{{ row.inspectionDate }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 编辑弹窗 ── -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-head">
          <span>编辑检测计划</span>
          <span class="modal-close" @click="closeModal">×</span>
        </div>
        <div class="modal-body">
          <div class="modal-scroll">
            <div class="edit-row" v-for="(item, idx) in editList" :key="idx">
              <span class="edit-idx">{{ idx + 1 }}</span>
              <input v-model="item.project" placeholder="项目名" class="inp" readonly style="opacity:.4" />
              <input v-model="item.componentName" placeholder="构件名称" class="inp" />
              <input v-model="item.teamName" placeholder="班组" class="inp inp--sm" />
              <input v-model="item.team" placeholder="班组长" class="inp inp--sm" />
              <input v-model="item.planDate" type="date" class="inp inp--sm" />
              <select v-model="item.status" class="inp inp--sm">
                <option value="待检测">待检测</option>
                <option value="检测中">检测中</option>
                <option value="已完成">已完成</option>
                <option value="不合格">不合格</option>
              </select>
              <button type="button" class="btn-del" @click="deleteRow(idx)">删</button>
            </div>
            <button type="button" class="btn-add" @click="addRow">+ 添加行</button>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-cancel" @click="closeModal">取消</button>
          <button type="button" class="btn-save" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { canEditFeature, getAuthHeaders } from '@/utils'

export default {
  data() {
    return {
      showModal: false,
      editList: [],
      activeTab: 'today',
      todayList: [],
      historyList: [],
      historyLoading: false,
      scrollThreshold: 5,
      highlightedProjectId: null,
      refreshTimer: null,
      scrollTimer: null,
    };
  },
  computed: {
    canEdit() { return canEditFeature('today_plan') }
  },
  created() {
    this.fetchTodayPlan()
    this.refreshTimer = setInterval(() => this.fetchTodayPlan(), 60000)
    if (this.$bus) {
      this.$bus.$on('project-list-update', () => this.fetchTodayPlan())
      this.$bus.$on('project-change', () => this.fetchTodayPlan())
      this.$bus.$on('component-ifc-sync', (p) => {
        this.highlightedProjectId = p && p.projectId ? p.projectId : null
        this.fetchTodayPlan()
      })
      this.$bus.$on('detection-complete', () => { this.highlightedProjectId = null })
    }
  },
  beforeDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    if (this.scrollTimer) clearInterval(this.scrollTimer)
    if (this.$bus) {
      this.$bus.$off('project-list-update', () => this.fetchTodayPlan())
      this.$bus.$off('project-change', () => this.fetchTodayPlan())
      this.$bus.$off('component-ifc-sync')
      this.$bus.$off('detection-complete')
    }
  },
  methods: {
    switchTab(tab) {
      this.activeTab = tab
      if (tab === 'history') this.fetchHistory()
      else this.startScroll()
    },

    startScroll() {
      if (this.scrollTimer) clearInterval(this.scrollTimer)
      if (this.todayList.length < this.scrollThreshold) return
      let pos = 0
      this.scrollTimer = setInterval(() => {
        const body = this.$refs.listBody
        if (!body) return
        pos = (pos + 1) % this.todayList.length
        body.scrollTop = pos * 36
      }, 2500)
    },

    async fetchTodayPlan() {
      try {
        const res = await fetch('/api/today-plan', { headers: getAuthHeaders() })
        const d = await res.json()
        if (d && d.success && Array.isArray(d.data) && d.data.length > 0) {
          this.todayList = d.data
          this.$nextTick(() => this.startScroll())
          return
        }
      } catch (e) {}
      this.fetchTodayPlanFromLocal()
    },

    fetchTodayPlanFromLocal() {
      try {
        const raw = localStorage.getItem('cm_projects')
        const projects = raw ? JSON.parse(raw) : []
        const todayStr = new Date().toISOString().slice(0, 10)
        const items = []
        for (const p of projects) {
          for (const c of (p.components || [])) {
            if (c.planDate && c.planDate !== todayStr) continue
            items.push({
              project: p.name || '',
              projectId: p.id || '',
              componentId: c.id || '',
              componentName: c.componentMark || c.name || '',
              team: c.teamLeader || '',
              teamName: c.teamName || '',
              type: c.ifcType || (c.name || '').split(' ')[0] || '',
              status: c.status || '待检测',
            })
          }
        }
        items.sort((a, b) => (a.project || '').localeCompare(b.project || '', 'zh'))
        this.todayList = items
        this.$nextTick(() => this.startScroll())
      } catch (e) { this.todayList = [] }
    },

    async fetchHistory() {
      this.historyLoading = true
      try {
        const res = await fetch('/api/inspection-history', { headers: getAuthHeaders() })
        const d = await res.json()
        this.historyList = (d && d.success && Array.isArray(d.data)) ? d.data : []
      } catch (e) { this.historyList = [] }
      finally { this.historyLoading = false }
    },

    goToProject(item) {
      if (item && item.componentName) {
        localStorage.setItem('current_component_mark', item.componentName)
      }
      if (this.$router) this.$router.push('/secondview').catch(() => {})
    },
    goToHistoryItem() {},

    openEditModal() {
      if (!this.canEdit) { alert('当前账号仅支持查看'); return }
      this.editList = JSON.parse(JSON.stringify(this.todayList))
      this.showModal = true
    },
    closeModal() { this.showModal = false },
    deleteRow(idx) { this.editList.splice(idx, 1) },
    addRow() { this.editList.push({ project: '', team: '', type: '' }) },

    async saveEdit() {
      if (!this.canEdit) { alert('当前账号仅支持查看'); return }
      try {
        const res = await fetch('/api/today-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ planItems: this.editList.map(i => ({
            projectId: i.projectId, componentId: i.componentId,
            planDate: i.planDate, teamLeader: i.team,
            qualityInspector: i.inspector, qualityManager: i.manager, status: i.status
          })) })
        })
        const d = await res.json()
        if (d && d.success) { this.todayList = d.data; this.closeModal(); return }
      } catch (e) {}
      this.saveEditToLocal(); this.closeModal()
    },

    saveEditToLocal() {
      try {
        const raw = localStorage.getItem('cm_projects')
        const projects = raw ? JSON.parse(raw) : []
        for (const item of this.editList) {
          const p = projects.find(x => x.id === item.projectId)
          if (!p) continue
          if (!p.components) p.components = []
          const c = p.components.find(cc => cc.id === item.componentId)
          if (c) {
            if (item.team) c.teamLeader = item.team
            if (item.planDate) c.planDate = item.planDate
            if (item.status) c.status = item.status
          } else {
            p.components.push({
              id: item.componentId || 'L' + Date.now(),
              name: item.componentName || item.project,
              teamLeader: item.team || '',
              planDate: item.planDate || '',
              status: item.status || '待检测',
              ifcUrl: p.ifcUrl || '',
            })
          }
        }
        localStorage.setItem('cm_projects', JSON.stringify(projects))
        this.fetchTodayPlanFromLocal()
        if (this.$bus) this.$bus.$emit('project-list-update')
      } catch (e) { alert('保存失败') }
    }
  }
};
</script>

<style lang='scss' scoped>
.plan-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── 标签栏 ── */
.tab-bar {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 0 0 6px;
  border-bottom: 1px solid rgba(0, 186, 255, 0.18);
  margin-bottom: 6px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: rgba(0, 186, 255, 0.5);
  font-size: 12px;
  font-weight: 800;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 6px;
  letter-spacing: 0.04em;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: rgba(0, 186, 255, 0.9);
    background: rgba(0, 186, 255, 0.1);
  }

  &.active {
    color: #00baff;
    background: linear-gradient(180deg, rgba(0, 150, 220, 0.28) 0%, rgba(0, 90, 150, 0.18) 100%);
    box-shadow: 0 0 0 1px rgba(0, 186, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    text-shadow: 0 0 12px rgba(0, 186, 255, 0.5);
  }
}

.tab-spacer { flex: 1; }

.btn-edit {
  background: rgba(0, 186, 255, 0.1);
  border: 1px solid rgba(0, 186, 255, 0.3);
  color: rgba(0, 212, 255, 0.85);
  font-size: 10px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 5px;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  &:hover {
    background: rgba(0, 186, 255, 0.2);
    border-color: rgba(0, 186, 255, 0.55);
    box-shadow: 0 0 8px rgba(0, 186, 255, 0.25);
  }
}

/* ── 内容区 ── */
.content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── 空状态 ── */
.empty-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  padding: 20px;
}

.empty-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(0, 186, 255, 0.12) 0%, transparent 70%);
  pointer-events: none;
}

.empty-icon {
  opacity: 0.7;
}

.empty-text {
  font-size: 13px;
  color: rgba(0, 186, 255, 0.65);
  font-weight: 600;
  letter-spacing: 0.05em;
}

.empty-sub {
  font-size: 10px;
  color: rgba(0, 186, 255, 0.35);
}

/* ── 列表区域 ── */
.list-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: rgba(0, 12, 32, 0.5);
  border: 1px solid rgba(0, 186, 255, 0.12);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 20px rgba(0, 0, 0, 0.25);
}

.list-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 186, 255, 0.25);
    border-radius: 2px;
    &:hover { background: rgba(0, 186, 255, 0.4); }
  }
}

/* ── 行 ── */
.row {
  display: grid;
  align-items: center;
  border-bottom: 1px solid rgba(0, 186, 255, 0.07);
  min-height: 32px;
  padding: 0 10px 0 8px;
  box-sizing: border-box;
  transition: background 0.18s;
  cursor: default;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: transparent;
    transition: background 0.18s;
  }

  &--head {
    background: linear-gradient(90deg, rgba(0, 186, 255, 0.14) 0%, rgba(0, 186, 255, 0.06) 100%);
    border-bottom: 1px solid rgba(0, 186, 255, 0.22);
    margin-bottom: 4px;
    cursor: default;

    .cell {
      color: rgba(0, 210, 255, 0.95);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
  }

  &:not(.row--head):hover {
    background: rgba(0, 186, 255, 0.06);
    &::before { background: rgba(0, 186, 255, 0.3); }
  }

  &:not(.row--head):last-child {
    border-bottom: none;
  }

  &.is-active {
    background: rgba(255, 130, 0, 0.1);
    &::before { background: rgba(255, 160, 50, 0.8); }

    .cell--project { color: #ffcc66; }
  }
}

.row--plan {
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1.1fr) minmax(0, 0.9fr);
}

.row--history {
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.9fr);
}

/* ── 列 ── */
.cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  padding: 0 8px;
  box-sizing: border-box;

  &--project {
    min-width: 0;
    color: #00fdfa;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  &--component { min-width: 0; color: rgba(167, 139, 250, 0.95); font-size: 12px; font-weight: 700; }
  &--type    { flex: 1.3; min-width: 0; color: rgba(167, 139, 250, 0.95); font-size: 12px; font-weight: 600; }
  &--num     { flex: 1.5; min-width: 0; color: rgba(255, 255, 255, 0.75); font-size: 12px; font-weight: 600; }
  &--team    { min-width: 0; color: rgba(255, 200, 80, 0.95); font-size: 12px; font-weight: 700; }
  &--date    { flex: 0.9; min-width: 0; color: rgba(255, 200, 80, 0.95); font-size: 12px; font-weight: 700; white-space: nowrap; }
}

/* ── 项目名前圆点 ── */
.dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00fdfa;
  box-shadow: 0 0 5px rgba(0, 253, 250, 0.6);

  &--project {
    background: #00fdfa;
    box-shadow: 0 0 6px rgba(0, 253, 250, 0.7);
  }
}

/* ── 编辑弹窗 ── */
.modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.72);
  z-index: 300000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;

  .modal-box {
    background: rgba(5, 21, 41, 0.98);
    border: 1px solid rgba(0, 186, 255, 0.35);
    box-shadow: 0 0 30px rgba(0, 186, 255, 0.2);
    width: 760px;
    max-width: 95vw;
    max-height: 82vh;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-head {
    padding: 14px 20px;
    border-bottom: 1px solid rgba(0, 186, 255, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    span:first-child { color: #00baff; font-size: 16px; font-weight: 700; }
    .modal-close { color: rgba(255,255,255,0.5); font-size: 22px; cursor: pointer; padding: 0 4px; &:hover { color: #f56c6c; } }
  }

  .modal-body {
    padding: 16px 18px;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-scroll {
    flex: 1;
    overflow-y: auto;
    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-thumb { background: rgba(0,186,255,0.2); }
  }

  .edit-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
    align-items: center;
    .edit-idx { width: 24px; color: rgba(0,186,255,0.45); text-align: center; flex-shrink: 0; font-size: 11px; }
  }

  .inp {
    background: rgba(0, 186, 255, 0.06);
    border: 1px solid rgba(0, 186, 255, 0.25);
    color: #fff;
    padding: 7px 8px;
    border-radius: 4px;
    font-size: 12px;
    flex: 1;
    &:focus { border-color: #00baff; outline: none; }
    &--sm { flex: 0.7; }
  }

  .btn-del {
    background: rgba(245, 108, 108, 0.2);
    border: 1px solid rgba(245, 108, 108, 0.4);
    color: #f56c6c;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
    font-size: 12px;
    &:hover { background: rgba(245, 108, 108, 0.35); }
  }

  .btn-add {
    width: 100%;
    padding: 9px;
    background: rgba(0, 186, 255, 0.06);
    border: 1px dashed rgba(0, 186, 255, 0.4);
    color: rgba(0, 212, 255, 0.8);
    cursor: pointer;
    border-radius: 5px;
    font-size: 13px;
    &:hover { background: rgba(0, 186, 255, 0.14); }
  }

  .modal-foot {
    padding: 12px 18px;
    border-top: 1px solid rgba(0, 186, 255, 0.15);
    display: flex;
    justify-content: flex-end;
    gap: 12px;

    button { padding: 7px 22px; border-radius: 5px; cursor: pointer; border: none; font-size: 13px; }
    .btn-cancel { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); &:hover { background: rgba(255,255,255,0.14); } }
    .btn-save { background: rgba(0,186,255,0.25); border: 1px solid rgba(0,186,255,0.5); color: #00baff; &:hover { background: rgba(0,186,255,0.38); } }
  }
}
</style>

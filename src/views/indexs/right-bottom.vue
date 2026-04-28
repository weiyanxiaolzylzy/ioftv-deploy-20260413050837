<template>
  <div class="right_bottom_wrap beautify-scroll-def">
    <!-- 顶部：四个等宽面板（三模型 + 检测信息） -->
    <div class="models_container">
      <!-- 左侧：构件详情视口（双视口架构：隐藏场景提取几何，干净场景渲染单构件） -->
      <div class="model_view">
        <div class="view_title view_title--with-action">
          <span class="view_title__text"><span class="dot"></span> 构件模型</span>
          <div v-if="todayPlanList.length > 0" class="component-nav">
            <button type="button" class="btn-nav" :disabled="currentPlanIndex <= 0" @click="prevComponent">‹ 上一条</button>
            <span class="nav-counter">{{ currentPlanIndex + 1 }}/{{ todayPlanList.length }}</span>
            <button type="button" class="btn-nav" :disabled="currentPlanIndex >= todayPlanList.length - 1" @click="nextComponent">下一条 ›</button>
          </div>
        </div>
        <div class="canvas_wrap component_ifc_wrap">
          <ComponentDetailViewport
            v-if="currentPlanItem && currentPlanItem.ifcUrl && currentPlanItem.ifcElementId"
            :key="'cdv-' + (currentPlanItem.ifcUrl || '')"
            :ifcUrl="resolveAbsUrl(currentPlanItem.ifcUrl)"
            :expressID="Number(currentPlanItem.ifcElementId)"
            backgroundColor="#051020"
            @loaded="onComponentLoaded"
            @error="onComponentError"
          />
          <div v-else class="placeholder_text">
            <div class="placeholder-icon">📦</div>
            <div>暂无今日检测计划或计划中无关联 IFC 构件</div>
            <div class="placeholder-sub">在「项目构件管理」中勾选构件并设置检测日期为今天</div>
          </div>
        </div>
      </div>

      <!-- 中间：项目模型（整项目 IFC，选中后左侧构件模型同步加载同一 IFC） -->
      <div class="model_view project_model_view">
        <div class="view_title view_title--with-action">
          <span class="view_title__text"><span class="dot project_dot"></span> 项目模型</span>
          <button
            v-if="projectIfcUrl"
            type="button"
            class="btn-expand-ifc"
            title="放大查看"
            @click.stop="projectViewExpanded = true"
          >
            ⛶ 放大
          </button>
        </div>
        <div class="canvas_wrap project_ifc_wrap">
          <AdvancedIfcViewer
            v-if="projectIfcUrl && !projectViewExpanded"
            ref="projectViewer"
            :key="'project-' + projectIfcUrl"
            :ifcUrl="projectIfcUrl"
            :enablePick="true"
            :showHints="false"
            :backgroundColor="0x051020"
            :useIframeMode="true"
            embedMode="minimal"
            @element-click="onProjectElementClick"
            @element-dblclick="onProjectElementDblClick"
            @model-loaded="onProjectModelLoaded"
          />
          <div v-else-if="projectViewExpanded && projectIfcUrl" class="placeholder_text placeholder_text--compact">
            <div>当前模型已在「放大」窗口中显示</div>
            <button type="button" class="btn-expand-ifc btn-expand-ifc--inline" @click="projectViewExpanded = false">回到此处</button>
          </div>
          <div v-else-if="!projectIfcUrl" class="placeholder_text">
            <div class="placeholder-icon">🏗️</div>
            <div>请选择项目加载 IFC 模型</div>
            <div class="placeholder-sub">在构件供给图中选择项目</div>
          </div>
        </div>
      </div>

      <!-- 右侧：点云模型 -->
      <div class="model_view">
        <div class="view_title">
          <span class="dot point_dot"></span> 点云模型 (LiDAR)
        </div>
        <div class="canvas_wrap" id="point-cloud-container">
          <PlyViewer
            ref="plyViewer"
            :plyFileId="plyFileId"
            :maxPoints="200000"
            :voxelSize="0.005"
            :emptyTitle="plyEmptyTitle"
            :emptySub="plyEmptySub"
            :showUpload="true"
            @loaded="onPlyLoaded"
          />
        </div>
      </div>

      <!-- 第四列：当前构件检测信息 -->
      <div class="model_view info_model_view">
        <div class="view_title">
          <span class="dot info_dot"></span> 当前构件检测信息
        </div>
        <div class="canvas_wrap detection_info_wrap">
          <div class="info_content">
            <div class="info_item main_id">
              <div class="label">构件编号</div>
              <div class="value">{{ currentComponent.id || '---' }}</div>
            </div>

            <div class="info_item status">
              <div class="label">检测状态</div>
              <div class="value" :class="currentComponent.status === '不合格' ? 'error' : currentComponent.status === '合格' ? 'success' : ''">
                {{ currentComponent.status || '待机中' }}
              </div>
            </div>

            <div class="info_item issues">
              <div class="label">不合格项</div>
              <div v-if="currentComponent.issues && currentComponent.issues.length > 0" class="issue_list">
                <div class="issue_tag" v-for="(issue, index) in currentComponent.issues" :key="index">
                  {{ issue }}
                </div>
              </div>
              <div v-else class="issue_empty">暂无不合格项</div>
            </div>
            <div class="info_hint">
              选中构件后，检测结果会同步显示在此面板
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 项目模型全屏放大层（移出 flex 容器，避免占位） -->
    <div
      v-if="projectViewExpanded && projectIfcUrl"
      class="project-ifc-fullscreen"
      @click.self="projectViewExpanded = false"
    >
      <div class="project-ifc-fullscreen__panel" @click.stop>
        <div class="project-ifc-fullscreen__head">
          <span>项目模型 — 放大查看</span>
          <button type="button" class="project-ifc-fullscreen__close" @click="projectViewExpanded = false">✕ 关闭</button>
        </div>
        <div class="project-ifc-fullscreen__body">
          <AdvancedIfcViewer
            :key="'project-fs-' + projectIfcUrl"
            ref="projectViewerFs"
            :ifcUrl="projectIfcUrl"
            :enablePick="true"
            :showHints="false"
            :backgroundColor="0x051020"
            :useIframeMode="true"
            embedMode="minimal"
            @element-click="onProjectElementClick"
            @element-dblclick="onProjectElementDblClick"
            @model-loaded="onProjectModelLoaded"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ComponentDetailViewport from '@/components/ComponentDetailViewport.vue';
import AdvancedIfcViewer from '@/components/AdvancedIfcViewer.vue';
import PlyViewer from '@/components/PlyViewer.vue';

export default {
  name: 'RightBottom',
  components: { ComponentDetailViewport, AdvancedIfcViewer, PlyViewer },
  data() {
    return {
      // ─── PLY 点云 ────────────────────────────────────────────────────────────
      plyFileId: '',
      plyLoadedFileId: '',
      plyEmptyTitle: '暂无点云数据',
      plyEmptySub: '点击上传 PLY 文件 / 从 PlyCloudWeb 服务器加载',

      // 中间「项目模型」
      projectIfcUrl: '',
      projectViewExpanded: false,

      // 今日检测计划（驱动左侧构件详情视口，与中间格子完全无关）
      todayPlanList: [],
      currentPlanIndex: 0,

      // 当前构件信息（第四格）
      currentComponent: { id: '---', status: '', issues: [] },
      selectedElement: null,

      // WebSocket
      ws: null,
      wsReconnectTimer: null,
    };
  },

  computed: {
    currentPlanItem() {
      return this.todayPlanList[this.currentPlanIndex] || null;
    }
  },

  watch: {
    plyLoadedFileId(val) {
      if (val) {
        this.$bus.$emit('ply-cloud-loaded', {
          fileId: val,
          filename: this.plyEmptyTitle,
          syncSource: 'right-bottom',
        });
      }
    },
  },

  mounted() {
    this.loadTodayPlan();
    this.checkSelectedComponent();
    this.loadProjectFromStorage();
    if (this.$bus) {
      this.$bus.$on('project-ifc-change', this.onProjectIfcChange);
      this.$bus.$on('project-change', this.onProjectChangeAndCheck);
      this.$bus.$on('project-list-update', this.onProjectListUpdate);
      // 监听来自 PlyCloudWeb 的点云数据
      this.$bus.$on('ply-cloud-loaded', this.onPlyCloudLoaded);
      this.$bus.$on('ply-cloud-load', this.onPlyCloudLoad);
    }
    window.addEventListener('keydown', this.onKeydown);
    window.addEventListener('storage', this.onStorageChange);
    this.connectDetectionWs();
  },

  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('storage', this.onStorageChange);
    if (this.$bus) {
      this.$bus.$off('project-ifc-change', this.onProjectIfcChange);
      this.$bus.$off('project-change', this.onProjectChangeAndCheck);
      this.$bus.$off('project-list-update', this.onProjectListUpdate);
      this.$bus.$off('ply-cloud-loaded', this.onPlyCloudLoaded);
      this.$bus.$off('ply-cloud-load', this.onPlyCloudLoad);
    }
    if (this.ws) this.ws.close();
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
  },

  methods: {
    // ─── 从 localStorage 读取今日检测计划 ──────────────────────────────────
    loadTodayPlan() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const projects = JSON.parse(localStorage.getItem('cm_projects') || '[]');
        const list = [];
        for (const p of (Array.isArray(projects) ? projects : [])) {
          for (const c of (p.components || [])) {
            if ((c.planDate === today) && c.ifcElementId) {
              list.push({
                projectName: p.name || '',
                projectId: p.id || '',
                componentName: c.name || '',
                componentId: c.id || '',
                type: c.ifcType || '',
                team: c.teamLeader || '',
                inspector: c.qualityInspector || '',
                planDate: c.planDate,
                ifcUrl: c.ifcUrl || p.ifcUrl || '',
                ifcElementId: c.ifcElementId || '',
                ifcGlobalId: c.ifcGlobalId || '',
              });
            }
          }
        }
        this.todayPlanList = list;
        this.currentPlanIndex = 0;
        this.syncComponentInfo();
      } catch (e) {
        this.todayPlanList = [];
      }
    },

    // ─── 上一条 / 下一条 ───────────────────────────────────────────────────
    prevComponent() {
      if (this.currentPlanIndex > 0) {
        this.currentPlanIndex--;
        this.syncComponentInfo();
      }
    },

    nextComponent() {
      if (this.currentPlanIndex < this.todayPlanList.length - 1) {
        this.currentPlanIndex++;
        this.syncComponentInfo();
      }
    },

    // ─── 同步第四格「当前构件检测信息」──────────────────────────────────
    syncComponentInfo() {
      const item = this.currentPlanItem;
      if (!item) return;
      this.selectedElement = {
        expressID: Number(item.ifcElementId) || null,
        globalId: item.ifcGlobalId || '',
        name: item.componentName || '',
        type: item.type || '',
      };
      this.currentComponent = {
        id: item.componentName || item.ifcGlobalId || item.ifcElementId || '---',
        status: '待检测',
        issues: [],
      };
      if (item.componentName) {
        localStorage.setItem('current_component_mark', item.componentName);
      }
    },

    // ─── ComponentDetailViewport 事件 ─────────────────────────────────────
    onComponentLoaded({ expressID, elementInfo }) {
      this.selectedElement = elementInfo || null;
      const item = this.currentPlanItem;
      this.currentComponent = {
        id: (item && item.componentName) || (elementInfo && (elementInfo.name || elementInfo.globalId)) || expressID || '---',
        status: '待检测',
        issues: [],
      };
    },

    onComponentError() {
      this.currentComponent = { id: '---', status: '加载失败', issues: [] };
    },

    // ─── 键盘快捷键 ────────────────────────────────────────────────────────
    onKeydown(e) {
      if (e.key === 'Escape' && this.projectViewExpanded) {
        this.projectViewExpanded = false;
        return;
      }
      if (e.key === 'ArrowLeft') this.prevComponent();
      if (e.key === 'ArrowRight') this.nextComponent();
    },

    // ─── 项目模型相关 ───────────────────────────────────────────────────────
    loadProjectFromStorage() {
      try {
        const projects = JSON.parse(localStorage.getItem('cm_projects') || '[]');
        const aid = localStorage.getItem('cm_activeId') || '';
        const active = (Array.isArray(projects) ? projects : []).find(p => String(p.id) === String(aid))
          || (Array.isArray(projects) ? projects[0] : null);
        if (active && active.ifcUrl) this.projectIfcUrl = this.resolveAbsUrl(active.ifcUrl);
      } catch (e) { /* ignore */ }
    },

    onProjectIfcChange(ifcUrl) { this.projectIfcUrl = this.resolveAbsUrl(ifcUrl) || ''; },
    onProjectChange(project) { if (project && project.ifcUrl) this.projectIfcUrl = this.resolveAbsUrl(project.ifcUrl); },
    onProjectChangeAndCheck(project) {
      this.onProjectChange(project);
      this.loadTodayPlan();
      this.checkSelectedComponent();
    },
    onProjectListUpdate() {
      this.loadTodayPlan();
      this.checkSelectedComponent();
    },
    onStorageChange(e) {
      if (e.key === 'cm_selected_component') this.checkSelectedComponent();
      if (e.key === 'cm_projects') this.loadTodayPlan();
    },
    checkSelectedComponent() {
      try {
        const raw = localStorage.getItem('cm_selected_component');
        if (!raw) return;
        const sel = JSON.parse(raw);
        if (!sel || !sel.expressID || !sel.ifcUrl) return;
        if (Date.now() - (sel.timestamp || 0) > 5 * 60 * 1000) return;
        const exists = this.todayPlanList.findIndex(
          item => String(item.ifcElementId) === String(sel.expressID) && item.ifcUrl === sel.ifcUrl
        );
        if (exists >= 0) {
          this.currentPlanIndex = exists;
          this.syncComponentInfo();
          return;
        }
        this.todayPlanList.unshift({
          projectName: '',
          projectId: sel.projectId || '',
          componentName: sel.name || '',
          componentId: '',
          type: '',
          team: '',
          inspector: '',
          planDate: '',
          ifcUrl: sel.ifcUrl,
          ifcElementId: String(sel.expressID),
          ifcGlobalId: sel.globalId || '',
        });
        this.currentPlanIndex = 0;
        this.syncComponentInfo();
      } catch (e) { /* ignore */ }
    },

    onProjectElementClick(element) {
      this.selectedElement = element;
      if (this.$bus) this.$bus.$emit('project-element-selected', element);
    },

    onProjectElementDblClick(element) {
      this.selectedElement = element;
      if (this.$bus) {
        this.$bus.$emit('project-element-selected', element);
        this.$bus.$emit('component-ifc-request', { ifcUrl: this.projectIfcUrl, element });
      }
    },

    onProjectModelLoaded({ elementCount }) {
      console.log(`[RightBottom] Project model loaded: ${elementCount} elements`);
    },

    // ─── PLY 点云事件 ─────────────────────────────────────────────────────────
    onPlyCloudLoaded({ fileId, filename, info, syncSource }) {
      // 避免回环：只接受来自其他页面的同步
      if (syncSource && syncSource !== 'right-bottom') {
        this.plyFileId = fileId;
        this.plyLoadedFileId = fileId;
        this.plyEmptyTitle = filename || '点云已加载';
        this.plyEmptySub = `已从检测页面同步: ${filename}`;
      }
    },

    onPlyCloudLoad({ fileId, syncSource }) {
      if (syncSource && syncSource !== 'right-bottom') {
        this.plyFileId = fileId;
        this.plyEmptyTitle = '正在加载...';
        this.plyEmptySub = '从检测页面同步点云数据';
      }
    },

    onPlyLoaded({ count, info }) {
      console.log(`[RightBottom] PLY loaded: ${count} points`, info);
      this.plyLoadedFileId = this.plyFileId || `local-${Date.now()}`;
    },

    // ─── WebSocket ──────────────────────────────────────────────────────────
    connectDetectionWs() {
      const WS_URL = (process.env.VUE_APP_DETECTION_WS || '').trim();
      if (!WS_URL) return;
      try {
        this.ws = new WebSocket(WS_URL);
        this.ws.onopen = () => this.ws.send(JSON.stringify({ type: 'viewer' }));
        this.ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            await this.handleDetectionMessage(data);
          } catch (e) { /* ignore */ }
        };
        this.ws.onclose = () => {
          this.ws = null;
          this.wsReconnectTimer = setTimeout(() => this.connectDetectionWs(), 5000);
        };
        this.ws.onerror = () => { /* ignore */ };
      } catch (e) {
        this.ws = null;
        this.wsReconnectTimer = setTimeout(() => this.connectDetectionWs(), 5000);
      }
    },

    async handleDetectionMessage(data) {
      if (data.action === 'highlight') {
        const { reason, expressID, name, globalId } = data;
        this.selectedElement = { expressID, globalId: globalId || '', name: name || '', type: '' };
        this.currentComponent = {
          id: name || globalId || expressID || '---',
          status: reason === '合格' ? '合格' : '不合格',
          issues: reason && reason !== '合格' ? [reason] : [],
        };
      }
    },

    resolveAbsUrl(u) {
      if (!u) return '';
      if (/^https?:\/\//i.test(u)) return u;
      // Use window.location.origin to avoid env placeholder issues in production
      const base = window.location.origin;
      return `${base}/${u.replace(/^\//, '')}`;
    },
  }
};
</script>

<style lang='scss' scoped>
.right_bottom_wrap {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 6px;
  box-sizing: border-box;

  .models_container {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 12px;

    .model_view {
      flex: 1 1 0;
      min-width: 0;
      background: linear-gradient(135deg, rgba(0, 40, 60, 0.5) 0%, rgba(0, 20, 40, 0.3) 100%);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 186, 255, 0.2);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 20px rgba(0, 0, 0, 0.25);

      .view_title {
        height: 36px;
        flex-shrink: 0;
        background: linear-gradient(90deg, rgba(0, 186, 255, 0.15) 0%, rgba(0, 186, 255, 0.05) 100%);
        display: flex;
        align-items: center;
        padding: 0 14px;
        font-size: 17px;
        color: #00eaff;
        font-weight: 700;
        letter-spacing: 1px;
        border-bottom: 1px solid rgba(0, 186, 255, 0.15);

        &--with-action {
          justify-content: space-between;
          gap: 8px;
        }

        .view_title__text {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .btn-expand-ifc {
          flex-shrink: 0;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 4px;
          border: 1px solid rgba(73, 231, 194, 0.45);
          background: rgba(73, 231, 194, 0.12);
          color: #9ff5e0;
          cursor: pointer;
          letter-spacing: 0;
          &:hover {
            background: rgba(73, 231, 194, 0.22);
            border-color: rgba(73, 231, 194, 0.7);
          }
        }

        .component-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;

          .btn-nav {
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid rgba(0, 186, 255, 0.4);
            background: rgba(0, 186, 255, 0.1);
            color: #00d4ff;
            cursor: pointer;
            letter-spacing: 0;
            &:hover:not(:disabled) {
              background: rgba(0, 186, 255, 0.25);
              border-color: rgba(0, 186, 255, 0.7);
            }
            &:disabled {
              opacity: 0.35;
              cursor: default;
            }
          }

          .nav-counter {
            font-size: 11px;
            color: rgba(0, 212, 255, 0.6);
            min-width: 28px;
            text-align: center;
          }
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #00eaff;
          border-radius: 50%;
          margin-right: 8px;
          box-shadow: 0 0 10px rgba(0, 234, 255, 0.6);
          animation: pulse 2s ease-in-out infinite;

          &.point_dot {
            background: #e3b337;
            box-shadow: 0 0 10px rgba(227, 179, 55, 0.6);
          }

          &.project_dot {
            background: #49e7c2;
            box-shadow: 0 0 10px rgba(73, 231, 194, 0.6);
          }

          &.info_dot {
            background: #a78bfa;
            box-shadow: 0 0 10px rgba(167, 139, 250, 0.6);
          }
        }
      }

      .canvas_wrap {
        flex: 1;
        width: 100%;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;

        .placeholder_text {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.25);
          font-size: 13px;
          text-align: center;
          padding: 10px;

          .placeholder-icon {
            font-size: 28px;
            margin-bottom: 4px;
            opacity: 0.6;
          }

          .placeholder-sub {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.15);
          }

          &--compact {
            gap: 10px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.45);
          }
        }

        .btn-expand-ifc--inline {
          margin-top: 4px;
        }
      }

      .component_ifc_wrap,
      .project_ifc_wrap {
        padding: 0;
        min-height: 0;

        :deep(.adv-ifc-wrapper) {
          border-radius: 0;
        }
      }

      &.info_model_view {
        border-top: 2px solid rgba(167, 139, 250, 0.35);
      }

      .detection_info_wrap {
        padding: 10px;
        align-items: stretch;
        justify-content: flex-start;
        overflow-y: auto;

        .info_content {
          flex: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          min-height: 0;
        }

        .info_item {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(0, 186, 255, 0.08);

          .label {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.58);
            margin-bottom: 6px;
            letter-spacing: 0.08em;
          }

          .value {
            font-size: 16px;
            color: #fff;
            font-weight: 800;
            line-height: 1.35;
            word-break: break-all;

            &.success { color: #67c23a; }
            &.error { color: #f56c6c; animation: blink 2s infinite; }
          }

          &.main_id .value {
            color: #00baff;
          }

          &.issues {
            flex: 1 1 auto;
            min-height: 0;
          }
        }

        .issue_list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          max-height: 100%;
        }

        .issue_tag {
          background: rgba(245, 108, 108, 0.16);
          color: #f56c6c;
          font-size: 11px;
          padding: 6px 8px;
          border-radius: 4px;
          border: 1px solid rgba(245, 108, 108, 0.35);
          line-height: 1.35;
        }

        .issue_empty,
        .info_hint {
          color: rgba(255, 255, 255, 0.38);
          font-size: 11px;
          line-height: 1.5;
        }
      }
    }
  }

  .project-ifc-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 400000;
    background: rgba(2, 12, 28, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    backdrop-filter: blur(8px);
  }

  .project-ifc-fullscreen__panel {
    width: min(96vw, 1400px);
    height: min(92vh, 900px);
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    border: 1px solid rgba(0, 212, 255, 0.35);
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    background: linear-gradient(160deg, rgba(5, 24, 48, 0.98) 0%, rgba(2, 14, 32, 0.99) 100%);
    overflow: hidden;
  }

  .project-ifc-fullscreen__head {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    font-size: 14px;
    color: #00eaff;
    font-weight: 600;
    border-bottom: 1px solid rgba(0, 186, 255, 0.2);
    background: rgba(0, 30, 55, 0.6);
  }

  .project-ifc-fullscreen__close {
    font-size: 13px;
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    cursor: pointer;
    &:hover {
      background: rgba(245, 108, 108, 0.25);
      border-color: rgba(245, 108, 108, 0.5);
    }
  }

  .project-ifc-fullscreen__body {
    flex: 1;
    min-height: 0;
    position: relative;
    :deep(.adv-ifc-wrapper) {
      width: 100%;
      height: 100%;
    }
  }
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}
</style>

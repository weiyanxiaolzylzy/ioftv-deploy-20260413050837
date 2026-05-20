<template>
  <div class="right_bottom_wrap beautify-scroll-def">
    <!-- 顶部：四个等宽面板（三模型 + 检测信息） -->
    <div class="models_container">
      <!-- 左侧：项目模型（整项目 IFC，选中后左侧构件模型同步加载同一 IFC） -->
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
            :projectId="selectedElement && selectedElement.projectId ? selectedElement.projectId : (currentPlanItem && currentPlanItem.projectId ? currentPlanItem.projectId : '')"
            :enablePick="false"
            :showHints="false"
            :backgroundColor="0x051020"
            :useIframeMode="true"
            embedMode="minimal"
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

      <!-- 中间：构件详情视口（双视口架构：隐藏场景提取几何，干净场景渲染单构件） -->
      <div class="model_view">
        <div class="view_title view_title--with-action">
          <span class="view_title__text"><span class="dot"></span> 构件模型</span>
          <div v-if="todayPlanList.length > 0" class="component-nav">
            <button type="button" class="btn-nav" :disabled="currentPlanIndex <= 0" @click="prevComponent">‹ 上</button>
            <span class="nav-counter">{{ currentPlanIndex + 1 }}/{{ todayPlanList.length }}</span>
            <button type="button" class="btn-nav" :disabled="currentPlanIndex >= todayPlanList.length - 1" @click="nextComponent">下 ›</button>
          </div>
        </div>
        <div class="canvas_wrap component_ifc_wrap">
          <ComponentDetailViewport
            v-if="canOpenCurrentComponentModel"
            :key="'cdv-' + resolveAbsUrl(currentPlanItem.ifcUrl)"
            :ifcUrl="resolveAbsUrl(currentPlanItem.ifcUrl)"
            :projectId="currentPlanItem && currentPlanItem.projectId ? currentPlanItem.projectId : ''"
            :expressID="Number(currentPlanItem.ifcElementId)"
            :componentMark="currentPlanItem.componentMark || currentPlanItem.componentName || ''"
            backgroundColor="#051020"
            @loaded="onComponentLoaded"
            @error="onComponentError"
          />
          <div v-else class="placeholder_text">
            <div class="placeholder-icon">📦</div>
            <div>{{ componentPlaceholderTitle }}</div>
            <div class="placeholder-sub">{{ componentPlaceholderSub }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧：点云模型 -->
      <div class="model_view">
        <div class="view_title">
          <span class="dot point_dot"></span> 点云模型
        </div>
        <div class="canvas_wrap" id="point-cloud-container">
          <PlyViewer
            ref="plyViewer"
            :plyFileId="plyFileId"
            :pointCloudData="plyPointCloudData"
            :plyInfoData="plyInfoData"
            :maxPoints="200000"
            :voxelSize="0.005"
            :emptyTitle="plyEmptyTitle"
            :emptySub="plyEmptySub"
            :showUpload="true"
            :transparentBackground="true"
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
          <div class="info_panel">
            <div class="info_row">
              <span class="info_row__label">构件编号：</span>
              <span class="info_row__value">{{ currentComponent.id || '---' }}</span>
            </div>

            <div class="info_row">
              <span class="info_row__label">检测状态：</span>
              <span class="info_row__value" :class="currentComponent.status === '不合格' ? 'error' : currentComponent.status === '合格' ? 'success' : ''">
                {{ currentComponent.status || '待机中' }}
              </span>
            </div>

            <div class="info_row info_row--multiline">
              <span class="info_row__label">不合格项：</span>
              <span v-if="currentComponent.issues && currentComponent.issues.length > 0" class="info_row__value info_row__value--list">
                {{ currentComponent.issues.join('、') }}
              </span>
              <span v-else class="info_row__value">---</span>
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
            :projectId="selectedElement && selectedElement.projectId ? selectedElement.projectId : (currentPlanItem && currentPlanItem.projectId ? currentPlanItem.projectId : '')"
            :enablePick="false"
            :showHints="false"
            :backgroundColor="0x051020"
            :useIframeMode="true"
            embedMode="minimal"
            @model-loaded="onProjectModelLoaded"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AdvancedIfcViewer from '@/components/AdvancedIfcViewer.vue';
import ComponentDetailViewport from '@/components/ComponentDetailViewport.vue';
import PlyViewer from '@/components/PlyViewer.vue';
import { getAuthHeaders } from '@/utils';
import { getSharedPlyPayload, isServerPlyFileId, setSharedPlyPayload } from '@/utils/plySyncStore';

const PLY_SYNC_STORAGE_KEY = 'shared_ply_cloud_state';

export default {
  name: 'RightBottom',
  components: { AdvancedIfcViewer, ComponentDetailViewport, PlyViewer },
  data() {
    return {
      // ─── PLY 点云 ────────────────────────────────────────────────────────────
      plyFileId: '',
      plyLoadedFileId: '',
      plyPointCloudData: [],
      plyInfoData: null,
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
    };
  },

  computed: {
    currentPlanItem() {
      return this.todayPlanList[this.currentPlanIndex] || null;
    },
    canOpenCurrentComponentModel() {
      return !!(
        this.currentPlanItem &&
        this.currentPlanItem.ifcUrl &&
        Number.isFinite(Number(this.currentPlanItem.ifcElementId)) &&
        Number(this.currentPlanItem.ifcElementId) > 0
      );
    },
    componentPlaceholderTitle() {
      if (!this.currentPlanItem) return '暂无今日检测计划或计划中无关联 IFC 构件';
      if (!this.canOpenCurrentComponentModel) return '当前计划未关联可显示的 IFC 构件';
      return '当前构件模型正在加载';
    },
    componentPlaceholderSub() {
      if (!this.currentPlanItem) return '在「项目构件管理」中勾选构件并设置检测日期为今天';
      if (!this.canOpenCurrentComponentModel) return '请检查该计划是否已同步 IFC 文件与构件 expressID';
      return '项目模型保持整模静止，左侧直接显示当前单构件';
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
    }
  },

  mounted() {
    this.loadTodayPlan();
    this.checkSelectedComponent();
    this.loadActiveProject();
    this.restorePlySyncState();
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
  },

  methods: {
    resolveComponentCode(...sources) {
      for (const source of sources) {
        if (!source || typeof source !== 'object') continue;
        const code =
          source.componentMark ||
          source.componentName ||
          source.name ||
          source.componentId ||
          source.ifcGlobalId ||
          source.globalId ||
          source.ifcElementId ||
          source.expressID ||
          '';
        if (code) return String(code);
      }
      return '---';
    },
    getComponentDisplayName(...sources) {
      for (const source of sources) {
        if (!source || typeof source !== 'object') continue;
        const name =
          source.componentName ||
          source.name ||
          '';
        if (name) return String(name);
      }
      return '';
    },
    // ─── 今日检测计划：统一以后端为准 ──────────────────────────────────
    async loadTodayPlan() {
      try {
        const res = await fetch('/api/today-plan', { headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.success && Array.isArray(data.data)) {
          this.todayPlanList = data.data.map((item) => ({
            projectName: item.project || '',
            projectId: item.projectId || '',
            componentName: item.componentName || '',
            componentMark: item.componentMark || item.componentName || '',
            componentId: item.componentId || '',
            type: item.type || '',
            team: item.team || '',
            inspector: item.inspector || '',
            planDate: item.planDate || '',
            ifcUrl: item.ifcUrl || '',
            ifcElementId: item.ifcElementId || '',
            ifcGlobalId: item.ifcGlobalId || '',
          }));
          this.currentPlanIndex = 0;
          this.syncComponentInfo();
          return;
        }
      } catch (e) { /* ignore */ }
      this.todayPlanList = [];
      this.currentPlanIndex = 0;
      this.syncComponentInfo();
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
      const detail = item.detail || null;
      this.selectedElement = {
        expressID: Number(item.ifcElementId) || null,
        globalId: item.ifcGlobalId || '',
        name: (detail && (detail.componentMark || detail.name)) || item.componentMark || item.componentName || '',
        type: item.type || '',
        componentMark: (detail && detail.componentMark) || item.componentMark || '',
        projectId: item.projectId || '',
        detail
      };
      this.currentComponent = {
        id: this.resolveComponentCode(detail, item),
        status: '待检测',
        issues: [],
      };
      const componentCode = this.resolveComponentCode(detail, item);
      if (componentCode && componentCode !== '---') {
        localStorage.setItem('current_component_mark', componentCode);
        window.dispatchEvent(new CustomEvent('current-component-mark-change', { detail: { mark: componentCode } }));
      }
    },

    onComponentLoaded({ expressID, elementInfo }) {
      this.selectedElement = elementInfo || null;
      const item = this.currentPlanItem;
      this.currentComponent = {
        id: this.resolveComponentCode(item, elementInfo, { expressID }),
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
    async loadActiveProject() {
      try {
        const res = await fetch('/api/active-project', { headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.success && data.data) {
          if (data.data.ifcUrl) this.projectIfcUrl = this.resolveAbsUrl(data.data.ifcUrl);
          return;
        }
      } catch (e) { /* ignore */ }
      this.projectIfcUrl = '';
    },

    onProjectIfcChange(ifcUrl) { this.projectIfcUrl = this.resolveAbsUrl(ifcUrl) || ''; },
    onProjectChange(project) {
      if (project && project.ifcUrl) {
        this.projectIfcUrl = this.resolveAbsUrl(project.ifcUrl);
        return;
      }
      this.projectIfcUrl = '';
    },
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
      if (e.key === PLY_SYNC_STORAGE_KEY) this.restorePlySyncState();
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
        if (this.todayPlanList.length) {
          this.currentPlanIndex = 0;
          this.syncComponentInfo();
        }
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
        this.plyFileId = isServerPlyFileId(fileId) ? fileId : '';
        this.plyLoadedFileId = isServerPlyFileId(fileId) ? fileId : '';
        this.plyEmptyTitle = filename || '点云已加载';
        this.plyEmptySub = `已从检测页面同步: ${filename}`;
        const sharedPayload = getSharedPlyPayload();
        if (sharedPayload) {
          this.plyPointCloudData = sharedPayload.pointCloudData || [];
          this.plyInfoData = sharedPayload.plyInfoData || null;
        }
        this.persistPlySyncState({
          fileId: isServerPlyFileId(fileId) ? fileId : '',
          filename: this.plyEmptyTitle,
          status: 'loaded',
          syncSource,
        });
      }
    },

    onPlyCloudLoad({ fileId, syncSource }) {
      if (syncSource && syncSource !== 'right-bottom') {
        this.plyFileId = isServerPlyFileId(fileId) ? fileId : '';
        this.plyEmptyTitle = '正在加载...';
        this.plyEmptySub = '从检测页面同步点云数据';
        this.persistPlySyncState({
          fileId: isServerPlyFileId(fileId) ? fileId : '',
          filename: this.plyEmptyTitle,
          status: 'loading',
          syncSource,
        });
      }
    },

    onPlyLoaded({ count, info }) {
      console.log(`[RightBottom] PLY loaded: ${count} points`, info);
      this.plyLoadedFileId = this.plyFileId || `local-${Date.now()}`;
      const payload = this.$refs.plyViewer && this.$refs.plyViewer.getSharedPointCloudPayload
        ? this.$refs.plyViewer.getSharedPointCloudPayload()
        : null;
      if (payload) {
        setSharedPlyPayload(payload);
      }
      this.persistPlySyncState({
        fileId: isServerPlyFileId(this.plyFileId) ? this.plyFileId : '',
        filename: this.plyEmptyTitle,
        status: 'loaded',
        syncSource: 'right-bottom',
      });
    },

    persistPlySyncState({ fileId, filename, status, syncSource }) {
      if (!fileId) return;
      try {
        localStorage.setItem(PLY_SYNC_STORAGE_KEY, JSON.stringify({
          fileId,
          filename: filename || '点云已加载',
          status: status || 'loaded',
          syncSource: syncSource || 'right-bottom',
          updatedAt: Date.now(),
        }));
      } catch (e) { /* ignore */ }
    },

    restorePlySyncState() {
      try {
        const sharedPayload = getSharedPlyPayload();
        if (sharedPayload) {
          this.plyPointCloudData = sharedPayload.pointCloudData || [];
          this.plyInfoData = sharedPayload.plyInfoData || null;
        }
        const raw = localStorage.getItem(PLY_SYNC_STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw);
        if (!state || !state.fileId) return;
        this.plyFileId = state.fileId;
        this.plyLoadedFileId = state.status === 'loaded' ? state.fileId : this.plyLoadedFileId;
        this.plyEmptyTitle = state.status === 'loading' ? '正在加载...' : (state.filename || '点云已加载');
        this.plyEmptySub = state.status === 'loading' ? '从同步缓存恢复点云加载状态' : `已同步点云: ${state.filename || state.fileId}`;
      } catch (e) { /* ignore */ }
    },

    resolveAbsUrl(u) {
      if (!u) return '';
      if (/^https?:\/\//i.test(u)) return u;
      // Use window.location.origin to avoid env placeholder issues in production
      const base = window.location.origin;
      return `${base}/${u.replace(/^\//, '')}`;
    }
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
      background: linear-gradient(135deg, rgba(0, 40, 60, 0.32) 0%, rgba(0, 20, 40, 0.14) 100%);
      backdrop-filter: blur(50px);
      -webkit-backdrop-filter: blur(5px);
      border: 1px solid rgba(0, 186, 255, 0.14);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 18px rgba(0, 0, 0, 0.18);

      .view_title {
        height: 42px;
        flex-shrink: 0;
        background: linear-gradient(90deg, rgba(0, 186, 255, 0.1) 0%, rgba(0, 186, 255, 0.025) 100%);
        display: flex;
        align-items: center;
        padding: 0 16px;
        font-size: 17px;
        color: #ffffff;
        font-weight: 700;
        letter-spacing: 1px;
        border-bottom: 1px solid rgba(0, 186, 255, 0.1);

        &--with-action {
          justify-content: space-between;
          gap: 8px;
        }

        .view_title__text {
          display: flex;
          align-items: center;
          min-width: 0;
          font-size: 16px;
          color: #ffffff;
        }

        .btn-expand-ifc {
          flex-shrink: 0;
          font-size: 13px;
          padding: 4px 12px;
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
            font-size: 12px;
            padding: 3px 10px;
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
            font-size: 13px;
            color: rgba(0, 212, 255, 0.6);
            min-width: 36px;
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
          gap: 8px;
          color: rgba(255, 255, 255, 0.46);
          font-size: 16px;
          line-height: 1.6;
          text-align: center;
          padding: 16px 14px;

          .placeholder-icon {
            font-size: 36px;
            margin-bottom: 4px;
            opacity: 0.72;
          }

          .placeholder-sub {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.28);
          }

          &--compact {
            gap: 10px;
            font-size: 15px;
            color: rgba(255, 255, 255, 0.56);
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
        padding: 18px 20px;
        align-items: stretch;
        justify-content: flex-start;
        overflow-y: auto;

        .info_panel {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-top: 6px;

          .info_row {
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            gap: 6px;
            text-align: left;
            line-height: 1.55;
            font-size: 16px;
            color: rgba(255, 255, 255, 0.86);

            &__label {
              flex: 0 0 auto;
              color: rgba(255, 255, 255, 0.58);
              font-weight: 700;
              letter-spacing: 1px;
            }

            &__value {
              flex: 1 1 auto;
              min-width: 0;
              color: #ffffff;
              font-weight: 700;
              word-break: break-all;

              &.success { color: #67c23a; }
              &.error { color: #f56c6c; animation: blink 2s infinite; }
            }

            &--multiline {
              .info_row__value {
                white-space: normal;
                line-height: 1.6;
              }
            }

            .info_row__value--list {
              color: rgba(245, 108, 108, 0.96);
            }
          }
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

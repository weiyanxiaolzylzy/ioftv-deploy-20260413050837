/**
 * Advanced IFC Viewer Component
 * Features:
 * - Full IFC model rendering with element picking
 * - Click to select, double-click to focus on single element
 * - Small popup viewer showing isolated element
 * - Color coding: selected (gold), dimmed other elements
 * - Emits events for parent components to react
 *
 * Usage:
 * <AdvancedIfcViewer
 *   :ifcUrl="modelUrl"
 *   :enablePick="true"
 *   :showElementList="false"
 *   @element-click="onElementClick"
 *   @element-dblclick="onElementDblClick"
 *   @model-loaded="onModelLoaded"
 * />
 */
<template>
  <div class="adv-ifc-wrapper" :class="{ 'fullscreen': isFullscreen }">
    <!-- iframe 模式：加载预构建的独立查看器，彻底绕过 Webpack 对 web-ifc 的破坏 -->
    <template v-if="useIframeMode">
      <iframe
        v-if="iframeSrc"
        ref="viewerIframe"
        :src="iframeSrc"
        class="ifc-iframe"
        @load="onIframeLoad"
        @error="onIframeError"
        sandbox="allow-scripts allow-same-origin allow-forms"
      ></iframe>
      <div v-else class="ifc-iframe-placeholder">
        <div class="loading-spinner"></div>
        <span>等待 IFC URL...</span>
      </div>
      <div v-if="iframeLoadErrorMsg" class="adv-ifc-error">
        <span>⚠ {{ iframeLoadErrorMsg }}</span>
        <button class="retry-btn" @click="retryIframe">重试</button>
      </div>
    </template>

    <!-- Main Viewer Container (原生模式) -->
    <template v-else>
    <div ref="mainContainer" class="adv-ifc-container"></div>

    <!-- Loading indicator -->
    <div v-if="loading" class="adv-ifc-loading">
      <div class="loading-spinner"></div>
      <span>{{ loadingText }}</span>
    </div>

    <!-- Error display -->
    <div v-if="errorMsg" class="adv-ifc-error">
      <span>⚠ {{ errorMsg }}</span>
    </div>

    <!-- Element list sidebar -->
    <div v-if="showElementList && elementIndex.length > 0" class="adv-ifc-sidebar">
      <div class="sidebar-header">
        <span>构件列表 ({{ elementIndex.length }})</span>
        <button
          class="sidebar-group-toggle"
          :class="{ active: groupByMark }"
          @click="groupByMark = !groupByMark"
          :title="groupByMark ? '取消分组' : '按构件编号分组'"
        >
          {{ groupByMark ? '🔗 分组' : '📋 列表' }}
        </button>
      </div>
      <input
        v-model="elementSearch"
        class="sidebar-search"
        placeholder="搜索名称 / 编号 / 类型..."
      />
      <!-- 按 Assembly Mark 分组展示 -->
      <div v-if="groupByMark" class="sidebar-list grouped-list">
        <div v-for="group in groupedElements" :key="group.category" class="group-block">
          <div class="group-header" @click="toggleGroup(group.category)">
            <span class="group-toggle">{{ expandedGroups.has(group.category) ? '▼' : '▶' }}</span>
            <span class="group-name">{{ group.category || '未分类' }}</span>
            <span class="group-count">({{ group.items.length }})</span>
          </div>
          <div v-if="expandedGroups.has(group.category)" class="group-items">
            <div
              v-for="row in group.items"
              :key="row.expressID"
              class="sidebar-item"
              :class="{ selected: selectedExpressID === row.expressID }"
              @click="onElementItemClick(row)"
              @dblclick="onElementItemDblClick(row)"
            >
              <div class="item-type">{{ row.type }}</div>
              <div class="item-name">
                <span class="item-mark">{{ row.assemblyMark || row.name || row.globalId }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 原始列表展示 -->
      <div v-else class="sidebar-list">
        <div
          v-for="row in filteredElements"
          :key="row.expressID"
          class="sidebar-item"
          :class="{ selected: selectedExpressID === row.expressID }"
          @click="onElementItemClick(row)"
          @dblclick="onElementItemDblClick(row)"
        >
          <div class="item-type">{{ row.type }}</div>
          <div class="item-name">{{ row.name || row.globalId || row.expressID }}</div>
        </div>
      </div>
    </div>

    <!-- Element detail popup (inline, not separate window) -->
    <transition name="popup-fade">
      <div v-if="showElementPopup && focusedElement" class="adv-ifc-popup">
        <div class="popup-header">
          <span class="popup-title">{{ focusedElement.name || focusedElement.globalId || focusedElement.type || '构件详情' }}</span>
          <div class="popup-actions">
            <button class="popup-btn fullscreen-btn" @click="toggleElementFullscreen" title="全屏查看">
              ⛶
            </button>
            <button class="popup-btn close-btn" @click="closeElementPopup" title="关闭">×</button>
          </div>
        </div>
        <div class="popup-body">
          <!-- Element 3D viewer -->
          <div ref="elementViewerWrap" class="element-viewer-wrap">
            <div v-if="!elementViewerReady" class="element-viewer-placeholder">
              <div class="loading-spinner small"></div>
              <span>加载构件视图...</span>
            </div>
          </div>
          <!-- Element info -->
          <div class="element-info">
            <div class="info-row">
              <span class="info-label">名称</span>
              <span class="info-value">{{ focusedElement.name || '未命名' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">GlobalId</span>
              <span class="info-value mono">{{ focusedElement.globalId || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">expressID</span>
              <span class="info-value mono">{{ focusedElement.expressID }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">类型</span>
              <span class="info-value">{{ focusedElement.type || '-' }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Fullscreen overlay for element viewer -->
    <transition name="fullscreen-fade">
      <div v-if="isElementFullscreen" class="adv-ifc-fullscreen-overlay" @click.self="toggleElementFullscreen">
        <div class="fullscreen-viewer">
          <div class="fullscreen-header">
            <span>构件 3D 视图 - {{ focusedElement ? (focusedElement.name || focusedElement.globalId) : '' }}</span>
            <button class="popup-btn close-btn" @click="toggleElementFullscreen">×</button>
          </div>
          <div ref="fullscreenViewerWrap" class="fullscreen-viewer-canvas"></div>
        </div>
      </div>
    </transition>

    <!-- Control hints -->
    <div v-if="showHints && !loading" class="adv-ifc-hints">
      <span>双击构件查看详情</span>
    </div>
    </template>
  </div>
</template>

<script>
import * as THREE from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';

export default {
  name: 'AdvancedIfcViewer',
  props: {
    // IFC model URL to load
    ifcUrl: {
      type: String,
      default: ''
    },
    projectId: {
      type: [String, Number],
      default: ''
    },
    // Whether to enable element picking
    enablePick: {
      type: Boolean,
      default: true
    },
    // Show sidebar with element list
    showElementList: {
      type: Boolean,
      default: false
    },
    // Show control hints
    showHints: {
      type: Boolean,
      default: true
    },
    // Background color
    backgroundColor: {
      type: Number,
      default: 0x051020
    },
    // Selected element IDs to highlight (array of expressID)
    highlightedIds: {
      type: Array,
      default: () => []
    },
    // 使用 iframe 加载预构建独立查看器（解决 web-ifc 与 Webpack 不兼容问题）
    useIframeMode: {
      type: Boolean,
      default: false
    },
    // 多选模式：点击构件追加到已选列表
    multiSelectMode: {
      type: Boolean,
      default: false
    },
    // 传给独立查看器 URL：minimal=仅 3D 画布；element-panel=构件区专用（小窗单构件全屏，见 ifc/main.js）
    embedMode: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: false,
      loadingText: '加载中...',
      errorMsg: '',

      // Main viewer
      viewer: null,
      currentModelID: null,

      // Element index
      elementIndex: [],
      elementSearch: '',
      selectedExpressID: null,
      focusedElement: null,

      // 分组展示
      groupByMark: true, // 默认开启分组
      expandedGroups: new Set(), // 展开的分组

      // Popup state
      showElementPopup: false,
      elementViewerReady: false,
      elementViewer: null,
      isElementFullscreen: false,
      isFullscreen: false,

      // Green overlay mesh
      greenOverlayMesh: null,

      // Store original colors
      originalColors: new Map(),

      // For element viewer fullscreen
      elementViewerWrap: null,
      fullscreenViewerWrap: null,

      // iframe mode
      iframeReady: false,
      iframeError: false,
      iframeLoadErrorMsg: '',

      // Multi-select: Set of expressIDs currently selected
      selectedIds: [],
    };
  },
  computed: {
    filteredElements() {
      if (!this.elementSearch) return this.elementIndex;
      const q = this.elementSearch.toLowerCase();
      return this.elementIndex.filter(el =>
        (el.name && el.name.toLowerCase().includes(q)) ||
        (el.globalId && el.globalId.toLowerCase().includes(q)) ||
        (el.expressID && String(el.expressID).includes(q)) ||
        (el.type && el.type.toLowerCase().includes(q)) ||
        (el.assemblyMark && el.assemblyMark.toLowerCase().includes(q)) ||
        (el.markCategory && el.markCategory.toLowerCase().includes(q))
      );
    },
    groupedElements() {
      // 基于 filteredElements 进行分组
      const search = this.elementSearch.toLowerCase();
      const source = search ? this.filteredElements : this.elementIndex;
      const groups = {};
      for (const el of source) {
        const cat = el.markCategory || '';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(el);
      }
      // 按类别名称排序，未分类放最后
      const sorted = Object.keys(groups).sort((a, b) => {
        if (a === '') return 1;
        if (b === '') return -1;
        return a.localeCompare(b);
      });
      return sorted.map(cat => ({
        category: cat || '未分类',
        items: groups[cat]
      }));
    },
    iframeSrc() {
      if (!this.ifcUrl) return '';
      // 主工程已通过 devServer 代理 /ifc 到独立查看器，开发和生产都统一走同源路径。
      const base = `${window.location.origin}/ifc`;
      let q = `ifcUrl=${encodeURIComponent(this.ifcUrl)}`;
      if (this.projectId !== '' && this.projectId !== null && this.projectId !== undefined) {
        q += `&projectId=${encodeURIComponent(String(this.projectId))}`;
      }
      if (this.embedMode) {
        q += `&embed=${encodeURIComponent(this.embedMode)}`;
      }
      return `${base}/?${q}`;
    }
  },
  watch: {
    ifcUrl: {
      immediate: true,
      handler(newUrl) {
        if (!newUrl) return;
        this.$nextTick(() => {
          if (this.useIframeMode) {
            // iframe 模式下 URL 变化通过 src 属性自动处理
            this.iframeReady = false;
          } else {
            this.loadIfc(newUrl);
          }
        });
      }
    },
    highlightedIds() {
      this.applyColorHighlighting();
    },
    multiSelectMode(val) {
      if (!val) {
        // 退出多选模式时清空已选
        this.selectedIds = [];
        this.postToIframe({ type: 'multi-select-mode', enabled: false });
      } else {
        this.postToIframe({ type: 'multi-select-mode', enabled: true });
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      if (!this.useIframeMode) {
        this.initViewer();
      }
    });
    window.addEventListener('message', this.onIframeMessage);
  },
  beforeDestroy() {
    window.removeEventListener('message', this.onIframeMessage);
    if (!this.useIframeMode) {
      this.cleanupViewer();
    }
  },
  methods: {
    // ─── 分组折叠 ─────────────────────────────────────────────────────────────
    toggleGroup(category) {
      if (this.expandedGroups.has(category)) {
        this.expandedGroups.delete(category);
      } else {
        this.expandedGroups.add(category);
      }
    },


    // ─── iframe 模式 ───────────────────────────────────────────────────────
    // postMessage 消息类型定义（与 ifc/main.js 保持一致）
    onIframeLoad() {
      console.log('[AdvancedIfcViewer] iframe loaded');
      this.iframeReady = true;
      this.iframeError = false;
      this.iframeLoadErrorMsg = '';
      // 通知 iframe 当前要高亮的构件（如果有）
      if (this.highlightedIds && this.highlightedIds.length > 0) {
        this.postToIframe({ type: 'highlight', ids: this.highlightedIds });
      }
      // 同步多选模式状态
      if (this.multiSelectMode) {
        this.postToIframe({ type: 'multi-select-mode', enabled: true });
      }
    },
    onIframeError() {
      this.iframeError = true;
      this.iframeLoadErrorMsg = 'iframe 加载失败，请检查网络';
    },
    retryIframe() {
      this.iframeError = false;
      this.iframeLoadErrorMsg = '';
      this.iframeReady = false;
      const iframe = this.$refs.viewerIframe;
      if (iframe) {
        iframe.src = iframe.src;
      }
    },
    onIframeMessage(event) {
      // 忽略来自非同源 iframe 的消息
      const allowedOrigins = [window.location.origin];
      if (!allowedOrigins.includes(event.origin)) return;
      const iframe = this.$refs.viewerIframe;
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'element-selected': {
          // 来自 iframe 查看器的构件选中事件，转发给父组件
          this.selectedExpressID = data.expressID;
          this.$emit('element-click', data);
          break;
        }
        case 'batch-selected': {
          // 来自 iframe 多选模式下的批量选中事件
          this.selectedIds = data.ids || [];
          this.$emit('batch-selected', data);
          break;
        }
        case 'list-checkbox-selection': {
          this.$emit('list-checkbox-selection', {
            expressIDs: data.expressIDs || [],
            rows: data.rows || []
          });
          break;
        }
        case 'multi-select-mode': {
          // 来自 iframe 查看器的多选模式状态同步
          this.$emit('multi-select-mode-changed', data);
          break;
        }
        case 'element-dblclick': {
          this.$emit('element-dblclick', data);
          break;
        }
        case 'model-loaded': {
          this.$emit('model-loaded', data);
          break;
        }
        case 'error': {
          console.error('[AdvancedIfcViewer iframe error]', data.message);
          this.$emit('viewer-error', data);
          break;
        }
        case 'ready': {
          // iframe 查看器已就绪，发送当前 URL（如果还没有自动加载）
          this.$emit('viewer-ready');
          break;
        }
      }
    },
    postToIframe(msg) {
      const iframe = this.$refs.viewerIframe;
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage(msg, window.location.origin);
    },

    // web-ifc 在 webpack 多 chunk 下 currentScript 不可用，导致 locateFile 指向错误路径，wasm 加载失败。
    // 解决：SetWasmPath(absoluteUrl, true) + customLocateFileHandler，让 locateFile 返回绝对路径。
    async setupWasmPath(ifcManager) {
      try {
        const inner = ifcManager && ifcManager.loader && ifcManager.loader.ifcManager;
        const api = inner && inner.state && inner.state.api;
        if (!api || typeof api.SetWasmPath !== 'function') {
          console.warn('[AdvancedIfcViewer] SetWasmPath not found on api');
          return;
        }
        const base = `${window.location.origin}/wasm/`;
        api.SetWasmPath(base, true);

        // Provide a custom locateFile that always returns the correct absolute URL.
        // This bypasses Emscripten's currentScript detection which fails under webpack.
        const originalInit = api.Init.bind(api);
        api.Init = (customLocateFileHandler, forceSingleThread) => {
          const locateFn = customLocateFileHandler || ((path) => base + path);
          return originalInit(locateFn, forceSingleThread);
        };
      } catch (e) {
        console.warn('[AdvancedIfcViewer] SetWasmPath setup failed:', e);
      }
    },

    // ─── Initialize main viewer ──────────────────────────────────────────────
    async initViewer() {
      const container = this.$refs.mainContainer;
      if (!container) return;

      try {
        this.viewer = new IfcViewerAPI({
          container,
          backgroundColor: new THREE.Color(this.backgroundColor)
        });
        this.setupWasmPath(this.viewer.IFC);

        // Set up picking
        if (this.enablePick) {
          this.setupPicking();
        }

        // Handle resize
        this.setupResizeObserver();

        // Load URL if already provided
        if (this.ifcUrl) {
          this.loadIfc(this.ifcUrl);
        }
      } catch (e) {
        console.error('IFC Viewer init error:', e);
        this.errorMsg = 'IFC 查看器初始化失败';
      }
    },

    setupResizeObserver() {
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => {
        if (this.viewer && this.viewer.context) {
          this.viewer.context.resize();
        }
      });
      ro.observe(this.$refs.mainContainer);
    },

    // ─── Load IFC model ─────────────────────────────────────────────────────
    async loadIfc(url) {
      if (!url || !this.viewer) return;
      this.loading = true;
      this.loadingText = '加载模型...';
      this.errorMsg = '';
      this.elementIndex = [];
      this.selectedExpressID = null;
      this.showElementPopup = false;

      try {
        // Remove previous model
        if (this.currentModelID !== null) {
          this.removeGreenOverlay();
          const models = this.viewer.context.items.ifcModels || [];
          const model = models.find(m => m.modelID === this.currentModelID);
          if (model) {
            this.viewer.context.scene.scene.remove(model);
          }
        }

        const model = await this.viewer.IFC.loadIfcUrl(url);
        this.currentModelID = (model && model.modelID !== undefined) ? model.modelID : null;

        // Wait for geometry to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Build element index
        await this.buildElementIndex();

        this.loading = false;
        this.$emit('model-loaded', { modelID: this.currentModelID, elementCount: this.elementIndex.length });

        // Apply any color highlighting
        this.applyColorHighlighting();
      } catch (e) {
        console.error('IFC load error:', e);
        this.errorMsg = '加载 IFC 失败: ' + (e.message || '未知错误');
        this.loading = false;
      }
    },

    async buildElementIndex() {
      // ─── 有效几何构件类型白名单（放在方法内避免 Vue 组件语法问题）──────────────
      const VALID_ELEMENT_TYPES = new Set([
        'IFCCOLUMN', 'IFCBEAM', 'IFCPLATE', 'IFCMEMBER', 'IFCFOUNDATION', 'IFCPILE', 'IFCSHORING',
        'IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCROOF', 'IFCCURTAINWALL', 'IFCRAILING', 'IFCFENCE',
        'IFCDOOR', 'IFCWINDOW', 'IFCDOORPANEL', 'IFCWINDOWPANEL',
        'IFCSTAIR', 'IFCSTAIRFLIGHT', 'IFCRAMP', 'IFCRAMPFLIGHT',
        'IFCFURNISHINGELEMENT', 'IFCFURNITURE', 'IFCFURNITURESTAND', 'IFCSYSTEMFURNITUREELEMENT', 'IFCCOVERING', 'IFCMEMBRANE', 'IFCSIGN',
        'IFCPIPEFITTING', 'IFCPIPESEGMENT', 'IFCDUCTFITTING', 'IFCDUCTSEGMENT', 'IFCCABLECARRIERFITTING', 'IFCCABLECARRIERSEGMENT', 'IFCCABLESEGMENT',
        'IFCJUNCTIONBOX', 'IFCELECTRICDISTRIBUTIONPOINT', 'IFCFLOWCONTROLLER', 'IFCFLOWFILTER', 'IFCFLOWMETER', 'IFCFLOWSEGMENT', 'IFCFITTING', 'IFCUNITARYCONTROLELEMENT',
        'IFCELECTRICALELEMENT', 'IFCLIGHTFIXTURE', 'IFCAIRTERMINAL', 'IFCAIRTERMINALBOX', 'IFCSANITARYTERMINAL', 'IFCSTACKTERMINAL', 'IFCFIRETERMINAL', 'IFCDISTRIBUTIONPOINT',
        'IFCDISTRIBUTIONELEMENT', 'IFCDISTRIBUTIONCIRCUIT', 'IFCELEMENTASSEMBLY', 'IFCENERGYCONVERSIONDEVICE',
        'IFCCHIMNEY', 'IFCSHAFTSEALINGDEVICE', 'IFCVALVE', 'IFCPUMP', 'IFCCOMPRESSOR', 'IFCHEATEXCHANGER', 'IFCTANK', 'IFCBOILER', 'IFCBURNER', 'IFCSPACEHEATER', 'IFCPLANT',
        'IFCBUILDINGELEMENTPROXY',
      ]);

      const INVALID_TYPES = new Set([
        'IFCELEMENT', 'IFCBUILDINGELEMENT', 'IFCPRODUCT', 'IFCPROCESS', 'IFCPROJECT', 'IFCRESOURCE', 'IFCACTOR', 'IFCCONTROL',
        'IFCDISTRIBUTIONELEMENTTYPE', 'IFCFLOWMOVINGDEVICE', 'IFCFLOWTREATMENTDEVICE', 'IFCENERGYDEVICE', 'IFCFASTENER',
        'IFCINTERFACE', 'IFCJUNCTIONBOXTYPE', 'IFCMATERIALPROPERTIES', 'IFCNESTED', 'IFCOPENINGELEMENT', 'IFCREL', 'IFCSERVICE', 'IFCSTRUCTURAL',
        'IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE', 'IFCZONE', 'IFCSPATIALZONE', 'IFCFACILITY', 'IFCFACILITYPART',
        'IFCBUILDINGFLOOR', 'IFCPLOT', 'IFCLANDPLOT', 'IFCGEOMETRICREPRESENTATIONSUBCONTEXT', 'IFCGRID',
        'IFCOWNERHISTORY', 'IFCPERSON', 'IFCPERSONANDORGANIZATION', 'IFCORGANIZATION', 'IFCAPPLICATION', 'IFCOWNERANDASSOCIATESHISTORY',
        'IFCDOCUMENTINFORMATION', 'IFCDOCUMENTREFERENCE', 'IFCLIBRARYINFORMATION', 'IFCLIBRARYREFERENCE',
        'IFCMATERIAL', 'IFCMATERIALLAYER', 'IFCMATERIALLAYERSET', 'IFCMATERIALPROFILESET', 'IFCMATERIALPROFILE', 'IFCMATERIALSET', 'IFCMATERIALCONSTITUENT',
        'IFCCOLOURSPECIFICATION', 'IFCSURFACESTYLE', 'IFCPRESENTATIONSTYLEASSIGNMENT', 'IFCSTYLEDITEM', 'IFCSTYLE', 'IFCCURVESTYLE', 'IFCFILLAREASTYLE',
        'IFCLAYER', 'IFCLAYERSET', 'IFCLAYERASSIGNMENT', 'IFCPROFILEDEF', 'IFCNUMERICALPARAMETER', 'IFCPARAMETER', 'IFCQUANTITY',
        'IFCRELCONTAINEDINSPATIALSTRUCTURE', 'IFCRELAGGREGATES', 'IFCRELDECOMPOSES', 'IFCRELASSOCIATES', 'IFCRELDECLARES', 'IFCRELEMENTS',
        'IFCRELFILLS', 'IFCRELPARTITIONING', 'IFCRELREFERENCEDINSPSPACIAL', 'IFCRELSPACEBOUNDARY', 'IFCRELASSIGNS', 'IFCRELASSIGNSTOACTOR',
        'IFCRELASSIGNSTOCONTROL', 'IFCRELASSIGNSTOGROUP', 'IFCRELASSIGNSTOPROCESS', 'IFCRELASSIGNSTOPRODUCT', 'IFCRELCONNECTS', 'IFCRELCONNECTSPORTS',
        'IFCRELCONNECTSSTRUCTURALACTIVITY', 'IFCRELCONNECTSSTRUCTURALLY', 'IFCRELDRAINSYS', 'IFCRELFLOWCONTROL', 'IFCRELINTERACTS',
        'IFCRELMOVES', 'IFCRELCOVEREDBYSPACES', 'IFCRELFILLSVOID', 'IFCRELCONNECTSWINDOWSDOORS', 'IFCRELASSOCIATESPROFILE', 'IFCRELBUILDING',
        'IFCRELSITE', 'IFCRELPROJECTS', 'IFCRELBUILDINGTOSTOREY', 'IFCRELSTOREYSTOBUILDING', 'IFCRELDEFINESBYPROPERTIES', 'IFCRELDEFINESBYTYPE',
        'IFCRELNESTING', 'IFCRELVOIDSELEMENT', 'IFCRELSEQUENCE', 'IFCRELCUTS', 'IFCRELFILLSELEMENT', 'IFCRELPROFILEDEF', 'IFCREL',
        'IFCCARTESIANPOINT', 'IFCCARTESIANTRANSITIONPOINT', 'IFCAXIS2PLACEMENT3D', 'IFCAXIS2PLACEMENT2D', 'IFCLOCALPLACEMENT', 'IFCGRIDPLACEMENT',
        'IFCDIRECTION', 'IFCVECTOR', 'IFCORIENTATION', 'IFCLENGTHMEASURE', 'IFCCONVERSIONBASEDUNIT', 'IFCSIUNIT', 'IFCNAMEDUNIT',
        'IFCDIMENSIONALEXPONENTS', 'IFCMEASUREWITHUNIT', 'IFCUNITASSIGNMENT', 'IFCDERIVEDUNIT', 'IFCDERIVEDUNITELEMENT',
        'IFCOPENINGELEMENT', 'IFCOPENINGSTANDARDCASE', 'IFCFILLINGELEMENT', 'IFCVOIDINGELEMENT', 'IFCSLABVOIDINGELEMENT',
        'IFCSCHEDULE', 'IFCTASK', 'IFCRECURRENCYTYPE', 'IFCCOSTSCHEDULE', 'IFCCOSTITEM', 'IFCWBS',
        'IFCPROPERTYSINGLEVALUE', 'IFCPROPERTYSET', 'IFCPROPERTY', 'IFCPROPERTYLISTVALUE', 'IFCPROPERTYSETTEMPLATE', 'IFCPROPERTYTEMPLATE',
        'IFCELEMENTQUANTITY', 'IFCQUANTITYSET', 'IFCGROUP', 'IFCSYSTEM', 'IFCACTORROLE', 'IFCADDRESS', 'IFCTELECOMADDRESS', 'IFCPOSTALADDRESS',
        'IFCCONTEXTDEPENDENTUNIT', 'IFCPLANARBOX', 'IFCBOUNDINGBOX', 'IFCREPRESENTATIONMAP', 'IFCREPRESENTATION', 'IFCSHAPE',
        'IFCGEOMETRICREPRESENTATION', 'IFCGEOMETRICREPRESENTATIONCONTEXT', 'IFCPRODUCTREPRESENTATION', 'IFCPROXY', 'IFCSTATICUNIT',
        'IFCGEOGRAPHICCRS', 'IFCBLOCK', 'IFCEXTRUDEAREASOLID', 'IFCREVOLVEDAREASOLID', 'IFCCSGPRIMITIVE3D', 'IFCCSGSELECT',
        'IFCCIRCLE', 'IFCELLIPSE', 'IFCLINE', 'IFCPOLYLINE', 'IFCTRIMMEDCURVE', 'IFCBSPLINECURVE', 'IFCBEZIERCURVE',
        'IFCRATIONALBSPLINECURVE', 'IFCOFFSETCURVE', 'IFCCOMPOSITECURVE', 'IFCBOUNDARYCURVE', 'IFCINDEXEDPOLYCURVE', 'IFCPOLYGONALBOUNDEDHALFSPACE',
        'IFCPLANE', 'IFCHALFSPACESOLID', 'IFCRECTANGLETRIMMEDSURFACE', 'IFCSWEPTSURFACE', 'IFCINTERSECTIONCURVE', 'IFCSECTIONEDSPINE',
        'IFCFACESURFACE', 'IFCFACEBOUND', 'IFCPOLYLOOP', 'IFCEDGELOOP', 'IFCLOOP', 'IFCVERTEX', 'IFCEDGE', 'IFCEDGECURVE', 'IFCORIENTEDEDGE',
        'IFCSUBEDGE', 'IFCFACESUB_BOUND', 'IFCCONNECTEDFACESET', 'IFCCLOSEDSHELL', 'IFCOPENSHELL', 'IFCFACESET',
        'IFCSHELLBASEDSURFACEMODEL', 'IFCSHELL', 'IFCMANIFOLDBREPBREP', 'IFCBOUNDEDHALFSPACE', 'IFCSOLIDMODEL', 'IFCSWEPTSOLID',
        'IFCEXTRUSIONSOLID', 'IFCBOOLEANCLIPPINGRESULT', 'IFCBOOLEANRESULT', 'IFCDEFINEDSYMBOL', 'IFCPOLYGONALFACESHELL', 'IFCPRIMITIVE2D',
        'IFCCONVERSION', 'IFCMAPPEDITEM', 'IFCREPRESENTATIONITEM', 'IFCTOPOLOGICALREPRESENTATIONITEM', 'IFCGEOMETRICREPRESENTATIONITEM',
        'IFCDRAUGHTINGCALLOUT', 'IFCDIMENSIONCURVE', 'IFCLeader_CURVE', 'IFCPROJECTEDCRS', 'IFCCRS', 'IFCCOORDINATEOPERATION',
        'IFCMAPCONVERSION', 'IFCGEOM_REP', 'IFCREP_MAP', 'IFCSPACETYPE', 'IFCSYSTEMNOTE', 'IFCIdentifier', 'IFCLABEL', 'IFCTEXT',
        'IFCCONTEXT', 'IFCOBJECT', 'IFCRELATIONSHIP', 'IFCCLASSIFICATION', 'IFCCLASSIFICATIONREFERENCE', 'IFCPRESENTATIONLAYERWITHSTYLE',
        'IFCLAYERSTYLE', 'IFCPRESENTATIONSTYLE', 'IFCSURFACESTYLEWITHTEXTURES', 'IFCTEXTSTYLE', 'IFCTEXTSTYLEFORDEFINITIONFONT',
        'IFCSTYLEDREPRESENTATION', 'IFCDRAUGHTINGTITLE', 'IFCDOCUMENT', 'IFCEXTERNALREFERENCE', 'IFCRESOURCE', 'IFCAPPLIEDVALUE', 'IFCVALUE',
        'IFCCOSTVALUE', 'IFCBASEDVALUE', 'IFCMONETARY', 'IFCREFERENCEVALUE', 'IFCENVIRONMENTALIMPACTVALUE', 'IFCCONSTRUCTIONRESOURCE',
        'IFCRESOURCECONTAINER', 'IFCRESOURCEABSTRACTION', 'IFCPHYSICALQUANTITY', 'IFCDERIVEDMEASURE', 'IFCTHERMALLOAD', 'IFCELECTRICLOAD',
        'IFCMECHANICALLIGHT', 'IFCENERGYPROPERTIES', 'IFCPROFILEPROPERTIES', 'IFCSECTIONMODULUS', 'IFCMOMENTOFINERTIA', 'IFCGEOMETRIC',
        'IFCWEIGHTMEASURE', 'IFCLOAD', 'IFCLOADCASE', 'IFCLOADGROUP', 'IFCSTRUCTURALACTIVITY', 'IFCSTRUCTURALACTION', 'IFCSTRUCTURALREACTION',
        'IFCSTRUCTURALCONNECTION', 'IFCSTRUCTURALPOINT', 'IFCSTRUCTURALCURVE', 'IFCSTRUCTURALMEMBER', 'IFCSTRUCTURALANALYSISMODEL', 'IFCANALYSIS',
        'IFCBASE', 'IFCFOOTING', 'IFCBEARING', 'IFCTIES', 'IFCPLATESTRUCTURAL', 'IFCPOINT', 'IFCPOINTONCURVE', 'IFCPOINTONSURFACE',
        'IFCCOMPOSITECURVESEGMENT', 'IFCDEFINITIONSELECT', 'IFCPRODUCT_DEFINITIONSHAPE', 'IFCREPRESENTATIONCONTEXT',
        'IFCBUILDINGELEMENTPARTTYPE', 'IFCWINDOWSTYLE', 'IFCDOORSTYLE', 'IFCPLUG', 'IFCSTACK', 'IFCDAMPER', 'IFCUNITARY',
        'IFCWORKPLAN', 'IFCRECURRENCEPATTERN', 'IFCTIMESCHEDULE', 'IFCDATEANDTIME', 'IFCCALENDARDATE', 'IFCTIMEOFDAY', 'IFCSEQUENCENUM',
        'IFCEVENT', 'IFCEVENTTIME', 'IFCWORKCALENDAR', 'IFCTIME', 'IFCPERIOD',
      ]);

      const isValidElementType = (typeName) => {
        if (!typeName) return false;
        const upper = typeName.toUpperCase();
        if (INVALID_TYPES.has(upper)) return false;
        return VALID_ELEMENT_TYPES.has(upper);
      };

      const modelID = this.currentModelID;
      if (modelID == null) return;

      const loader = this.viewer.IFC && this.viewer.IFC.loader;
      const ifcManager = loader && loader.ifcManager;
      const ifcAPI = ifcManager && ifcManager.ifcAPI;
      if (!ifcAPI) return;

      try {
        const allProducts = await ifcAPI.GetAllLines(modelID);
        const total = allProducts.size();
        const ids = [];
        for (let i = 0; i < total; i++) ids.push(allProducts.get(i));

        // 第一遍：严格类型过滤（白名单 + 黑名单）
        const candidates = [];
        const concurrency = 100;
        for (let i = 0; i < ids.length; i += concurrency) {
          const batch = ids.slice(i, i + concurrency);
          await Promise.all(batch.map(async (expressID) => {
            try {
              const line = await ifcAPI.GetLine(modelID, expressID, false);
              if (!line || typeof line !== 'object') return;
              const typeCode = line.type;
              if (typeof typeCode === 'number') {
                const typeName = ifcAPI.GetNameFromTypeCode(typeCode);
                if (isValidElementType(typeName)) {
                  const globalId = this.unwrapIfcString(line.GlobalId);
                  if (globalId) {
                    candidates.push({ expressID, globalId, typeName });
                  }
                }
              }
            } catch {}
          }));
        }

        // 第二遍：验证几何有效性
        const rows = [];
        for (let i = 0; i < candidates.length; i += concurrency) {
          const batch = candidates.slice(i, i + concurrency);
          const batchRows = await Promise.all(batch.map(async ({ expressID, globalId, typeName }) => {
            try {
              const line = await ifcAPI.GetLine(modelID, expressID, false);
              if (!line || typeof line !== 'object') return null;

              const typeCode = line.type;
              const type = typeof typeCode === 'number' ? (ifcAPI.GetNameFromTypeCode(typeCode) || '') : '';
              if (!isValidElementType(type)) return null;

              const hasPlacement = line.ObjectPlacement || line.ObjectPlacement === 0;
              if (!hasPlacement) return null;

              const repRaw = line.Representation;
              if (!repRaw && repRaw !== 0) return null;
              const representation = this.unwrapIfcValue(repRaw);
              if (!representation && representation !== 0) return null;

              const name = this.unwrapIfcString(line.Name);
              return { expressID, globalId, type: typeName, name };
            } catch {
              return null;
            }
          }));
          for (const r of batchRows) {
            if (r) rows.push(r);
          }
        }

        this.elementIndex = rows;
      } catch (e) {
        console.error('Build element index error:', e);
      }
    },

    // ─── Setup picking ──────────────────────────────────────────────────────
    setupPicking() {
      const container = this.$refs.mainContainer;
      if (!container) return;

      // Double click to focus on element
      container.addEventListener('dblclick', this.handleDblClick);

      // Single click to select
      container.addEventListener('click', this.handleClick);
    },

    async handleDblClick(e) {
      if (!this.viewer || this.currentModelID == null) return;
      const result = await this.viewer.IFC.selector.pickIfcItem(true);
      if (!result) return;

      const { modelID, id } = result;
      const row = this.elementIndex.find(r => r.expressID === id);
      if (row) {
        this.focusOnElement(row);
        this.$emit('element-dblclick', row);
      }
    },

    async handleClick(e) {
      if (!this.viewer || this.currentModelID == null) return;
      const result = await this.viewer.IFC.selector.pickIfcItem(true);
      if (!result) return;

      const { id: expressID } = result;
      const row = this.elementIndex.find(r => r.expressID === expressID);
      if (!row) return;

      if (this.multiSelectMode) {
        // 多选模式：追加/取消选中
        const idx = this.selectedIds.indexOf(expressID);
        if (idx >= 0) {
          this.selectedIds.splice(idx, 1);
        } else {
          this.selectedIds.push(expressID);
        }
        this.updateMultiSelectOverlay();
        // 通知 iframe
        this.postToIframe({ type: 'batch-selected', ids: this.selectedIds });
        // 通知父组件
        this.$emit('batch-selected', {
          ids: [...this.selectedIds],
          row,
          added: !this.selectedIds.includes(expressID)
        });
      } else {
        // 单选模式
        await this.selectElement(expressID, false);
        this.$emit('element-click', row);
      }
    },

    // ─── Element item interaction (from sidebar) ───────────────────────────
    async onElementItemClick(row) {
      this.selectedExpressID = row.expressID;
      await this.selectElement(row.expressID, false);
      this.$emit('element-click', row);
    },

    async onElementItemDblClick(row) {
      this.focusOnElement(row);
      this.$emit('element-dblclick', row);
    },

    // ─── Focus on element (show in main viewer + popup) ───────────────────
    async focusOnElement(row) {
      if (!this.viewer || this.currentModelID == null) return;

      this.selectedExpressID = row.expressID;
      this.focusedElement = row;

      // Show the element in the main viewer with green highlight
      await this.selectElement(row.expressID, true);

      // Build popup mesh
      await this.buildElementPopup(row);

      this.showElementPopup = true;
      this.elementViewerReady = false;
    },

    // ─── Select element (green highlight in main viewer) ──────────────────
    async selectElement(expressID, focusCamera) {
      if (this.useIframeMode) {
        const id = Number(expressID);
        if (!Number.isFinite(id)) return;
        this.selectedExpressID = id;
        this.postToIframe({
          type: 'select-element',
          expressID: id,
          focus: focusCamera !== false
        });
        return;
      }
      if (!this.viewer || this.currentModelID == null) return;

      // Clear previous selection
      this.removeGreenOverlay();
      this.viewer.IFC.selector.unpickIfcItems();

      // Build green overlay mesh
      const mesh = this.buildGreenMesh(expressID);
      if (mesh) {
        this.greenOverlayMesh = mesh;
        const scene = this.getScene();
        scene.add(mesh);
      }

      if (focusCamera) {
        await this.safeViewItem(expressID);
      }

      this.selectedExpressID = expressID;
    },

    // ─── Multi-select overlay (orange highlight for all selected IDs) ───────
    updateMultiSelectOverlay() {
      this.removeGreenOverlay();
      this.viewer.IFC.selector.unpickIfcItems();
      this._multiSelectMeshes = [];

      const model = (this.viewer.context.items.ifcModels || [])
        .find(m => m.modelID === this.currentModelID);
      if (!model) return;

      this.selectedIds.forEach(expressID => {
        const mesh = this.buildGreenMesh(expressID, 0xff8800);
        if (mesh) {
          this._multiSelectMeshes.push(mesh);
          const scene = this.getScene();
          scene.add(mesh);
        }
      });
    },

    // ─── Build green overlay mesh from merged geometry ──────────────────────
    buildGreenMesh(expressID, colorHex) {
      const model = (this.viewer.context.items.ifcModels || [])
        .find(m => m.modelID === this.currentModelID);
      if (!model || !model.geometry) return null;

      const geo = model.geometry;
      const expressIDAttr = geo.attributes && geo.attributes.expressID;
      if (!expressIDAttr) return null;

      const indexArray = geo.index ? geo.index.array : null;
      const faceVertexIndices = [];

      if (indexArray) {
        for (let i = 0; i < indexArray.length; i += 3) {
          const i0 = indexArray[i];
          const i1 = indexArray[i + 1];
          const i2 = indexArray[i + 2];
          if (expressIDAttr.getX(i0) === expressID &&
              expressIDAttr.getX(i1) === expressID &&
              expressIDAttr.getX(i2) === expressID) {
            faceVertexIndices.push(i0, i1, i2);
          }
        }
      } else {
        for (let i = 0; i < expressIDAttr.count; i += 3) {
          if (expressIDAttr.getX(i) === expressID &&
              expressIDAttr.getX(i + 1) === expressID &&
              expressIDAttr.getX(i + 2) === expressID) {
            faceVertexIndices.push(i, i + 1, i + 2);
          }
        }
      }

      if (faceVertexIndices.length === 0) return null;

      const posAttr = geo.attributes.position;
      const normAttr = geo.attributes.normal;
      const newPos = new Float32Array(faceVertexIndices.length * 3);
      const newNorm = new Float32Array(faceVertexIndices.length * 3);

      for (let i = 0; i < faceVertexIndices.length; i++) {
        const vi = faceVertexIndices[i];
        newPos[i * 3]     = posAttr.getX(vi);
        newPos[i * 3 + 1] = posAttr.getY(vi);
        newPos[i * 3 + 2] = posAttr.getZ(vi);
        if (normAttr) {
          newNorm[i * 3]     = normAttr.getX(vi);
          newNorm[i * 3 + 1] = normAttr.getY(vi);
          newNorm[i * 3 + 2] = normAttr.getZ(vi);
        }
      }

      const newGeo = new THREE.BufferGeometry();
      newGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
      if (normAttr) newGeo.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
      const newIndex = new Uint32Array(faceVertexIndices.length);
      for (let i = 0; i < faceVertexIndices.length; i++) newIndex[i] = i;
      newGeo.setIndex(new THREE.BufferAttribute(newIndex, 1));

      const greenMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: false
      });
      const mesh = new THREE.Mesh(newGeo, greenMat);
      mesh.position.copy(model.position);
      mesh.rotation.copy(model.rotation);
      mesh.scale.copy(model.scale);
      mesh.renderOrder = 1;
      return mesh;
    },

    removeGreenOverlay() {
      if (this.greenOverlayMesh) {
        const scene = this.getScene();
        scene.remove(this.greenOverlayMesh);
        this.greenOverlayMesh.geometry && this.greenOverlayMesh.geometry.dispose();
        this.greenOverlayMesh = null;
      }
      // Clean up multi-select overlay meshes
      if (this._multiSelectMeshes && this._multiSelectMeshes.length) {
        const scene = this.getScene();
        this._multiSelectMeshes.forEach(m => {
          scene.remove(m);
          m.geometry && m.geometry.dispose();
        });
        this._multiSelectMeshes = [];
      }
    },

    getScene() {
      const viewerCtx = this.viewer && this.viewer.context;
      return viewerCtx && viewerCtx.scene ? viewerCtx.scene.scene : null;
    },

    async safeViewItem(expressID) {
      if (!this.viewer) return;
      try {
        const loader = this.viewer.IFC && this.viewer.IFC.loader;
      const ifcManager = loader && loader.ifcManager;
      const ifcAPI = ifcManager && ifcManager.ifcAPI;
        if (!ifcAPI) return;

        const line = await ifcAPI.GetLine(this.currentModelID, expressID, false);
        const representation = line ? this.unwrapIfcValue(line.Representation) : null;
        if (representation == null) return;

        const selection = (this.viewer.IFC && this.viewer.IFC.selector) ? this.viewer.IFC.selector.selection : null;
        if (!selection || !selection.meshes || selection.meshes.size === 0) return;

        let last = null;
        for (const mesh of selection.meshes) last = mesh;
        if (!last) return;

        const geoAttr = last.geometry && last.geometry.getAttribute ? last.geometry.getAttribute('position') : null;
        const count = geoAttr ? (geoAttr.count !== undefined ? geoAttr.count : 0) : 0;
        if (count <= 0) return;

        const box = new THREE.Box3().setFromObject(last);
        if (box.isEmpty()) return;

        await this.viewer.context.ifcCamera.targetItem(last);
      } catch {}
    },

    // ─── Build element popup viewer ─────────────────────────────────────────
    async buildElementPopup(row) {
      if (!row) return;

      // Create element viewer
      await this.createElementViewer();

      // Extract mesh data
      const mesh = this.buildGreenMesh(row.expressID);
      if (!mesh) {
        this.elementViewerReady = true;
        return;
      }

      // Add to element viewer scene
      const elemScene = this.getElementScene();
      if (!elemScene) {
        this.elementViewerReady = true;
        return;
      }

      // Add ambient light
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      elemScene.add(ambient);

      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(5, 10, 7);
      elemScene.add(dir);

      // Add element mesh with original-like material
      const mat = new THREE.MeshPhongMaterial({
        color: 0x00dd44,
        side: THREE.DoubleSide,
        shininess: 80
      });
      mesh.material = mat;
      elemScene.add(mesh);

      // Adjust camera to fit element
      this.fitElementViewerCamera(mesh);

      this.elementViewerReady = true;
    },

    async createElementViewer() {
      // Dispose old viewer
      if (this.elementViewer) {
        this.elementViewer = null;
      }

      // Use the element viewer wrap
      let wrap = this.$refs.elementViewerWrap;
      if (!wrap) return;

      // Clear existing canvas
      wrap.innerHTML = '';

      // Create new viewer for element
      this.elementViewer = new IfcViewerAPI({
        container: wrap,
        backgroundColor: new THREE.Color(0x0a1628)
      });
      await this.setupWasmPath(this.elementViewer.IFC);
    },

    getElementScene() {
      const elemViewerCtx = this.elementViewer && this.elementViewer.context;
      return elemViewerCtx && elemViewerCtx.scene ? elemViewerCtx.scene.scene : null;
    },

    fitElementViewerCamera(mesh) {
      if (!this.elementViewer) return;

      const scene = this.getElementScene();
      if (!scene) return;

      // Add mesh to scene first
      if (!scene.children.includes(mesh)) {
        scene.add(mesh);
      }

      setTimeout(() => {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);

      const elemIfcCamera = this.elementViewer && this.elementViewer.context ? this.elementViewer.context.ifcCamera : null;
      if (elemIfcCamera && mesh) {
          try { elemIfcCamera.targetItem(mesh); } catch {}
        }
      }, 100);
    },

    // ─── Close popup ────────────────────────────────────────────────────────
    closeElementPopup() {
      this.showElementPopup = false;
      this.focusedElement = null;
      if (this.elementViewer) {
        this.elementViewer = null;
      }
    },

    // ─── Element fullscreen ─────────────────────────────────────────────────
    async toggleElementFullscreen() {
      this.isElementFullscreen = !this.isElementFullscreen;
      if (this.isElementFullscreen) {
        await this.$nextTick();
        await this.setupFullscreenViewer();
      }
    },

    async setupFullscreenViewer() {
      const wrap = this.$refs.fullscreenViewerWrap;
      if (!wrap) return;
      wrap.innerHTML = '';

      // Copy the element viewer content or recreate
      const srcWrap = this.$refs.elementViewerWrap;
      if (!srcWrap) return;

      const mesh = this.focusedElement ? this.buildGreenMesh(this.focusedElement.expressID) : null;
      if (!mesh) return;

      // Create fullscreen viewer
      const fsViewer = new IfcViewerAPI({
        container: wrap,
        backgroundColor: new THREE.Color(0x051020)
      });
      await this.setupWasmPath(fsViewer.IFC);

      const fsScene = fsViewer.context.scene.scene;
      fsScene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(5, 10, 7);
      fsScene.add(dir);

      const mat = new THREE.MeshPhongMaterial({
        color: 0x00dd44,
        side: THREE.DoubleSide,
        shininess: 80
      });
      mesh.material = mat;
      fsScene.add(mesh);

      setTimeout(() => {
        try {
          fsViewer.context.ifcCamera.targetItem(mesh);
        } catch {}
      }, 100);

      // Store reference for cleanup
      this._fullscreenViewer = fsViewer;
    },

    // ─── Color highlighting for detected elements ───────────────────────────
    applyColorHighlighting() {
      if (!this.highlightedIds || !this.highlightedIds.length) return;
      // This can be extended to color-code elements by detection status
    },

    // ─── Utility methods ───────────────────────────────────────────────────
    unwrapIfcValue(value) {
      if (value === null || value === undefined) return null;
      if (typeof value !== 'object') return value;
      if ('value' in value) return value.value;
      return null;
    },

    unwrapIfcString(value) {
      const v = this.unwrapIfcValue(value);
      return typeof v === 'string' ? v : null;
    },

    // ─── Public API ─────────────────────────────────────────────────────────
    // Clear multi-selection and exit multi-select mode
    clearMultiSelection() {
      this.selectedIds = [];
      this.removeGreenOverlay();
      this.postToIframe({ type: 'batch-selected', ids: [] });
      this.$emit('batch-selected', { ids: [], row: null, added: false });
    },

    // Reload current model
    reload() {
      if (this.ifcUrl) {
        this.loadIfc(this.ifcUrl);
      }
    },

    // Highlight a specific element by expressID
    highlightElement(expressID) {
      if (this.useIframeMode) {
        const id = Number(expressID);
        if (!Number.isFinite(id)) return;
        this.selectedExpressID = id;
        this.postToIframe({
          type: 'select-element',
          expressID: id,
          focus: true,
          isolateOnly: true
        });
        return;
      }
      this.selectElement(expressID, true);
    },

    // Get element info by expressID
    getElement(expressID) {
      return this.elementIndex.find(r => r.expressID === expressID);
    },

    // ─── Cleanup ────────────────────────────────────────────────────────────
    dispose() {
      const container = this.$refs.mainContainer;
      if (container) {
        container.removeEventListener('dblclick', this.handleDblClick);
        container.removeEventListener('click', this.handleClick);
      }

      this.removeGreenOverlay();

      if (this.elementViewer) {
        this.elementViewer = null;
      }

      if (this._fullscreenViewer) {
        this._fullscreenViewer = null;
      }

      this.elementIndex = [];
      this.viewer = null;
      this.currentModelID = null;
    }
  }
};
</script>

<style scoped lang="scss">
.adv-ifc-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;

  // iframe 模式
  .ifc-iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }
  .ifc-iframe-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(0, 186, 255, 0.6);
    font-size: 13px;
  }
  .retry-btn {
    margin-top: 8px;
    background: rgba(0, 186, 255, 0.15);
    color: #00baff;
    border: 1px solid rgba(0, 186, 255, 0.4);
    padding: 5px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    &:hover { background: rgba(0, 186, 255, 0.3); }
  }

  overflow: hidden;
  background: #051020;
}

.adv-ifc-wrapper.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}

/* Main container */
.adv-ifc-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* Loading */
.adv-ifc-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #00d4ff;
  font-size: 14px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.6);
  padding: 20px 30px;
  border-radius: 8px;
  border: 1px solid rgba(0, 212, 255, 0.3);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 212, 255, 0.2);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.adv-ifc-error {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(245, 108, 108, 0.9);
  color: #fff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 10;
}

/* Sidebar */
.adv-ifc-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 260px;
  height: 100%;
  background: rgba(5, 20, 40, 0.92);
  border-right: 1px solid rgba(0, 212, 255, 0.25);
  display: flex;
  flex-direction: column;
  z-index: 5;
}

.sidebar-header {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-group-toggle {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  color: #00d4ff;
  font-size: 11px;
  padding: 3px 8px;
  cursor: pointer;
  align-self: flex-start;
  transition: all 0.2s;
}
.sidebar-group-toggle:hover {
  background: rgba(0, 212, 255, 0.2);
}
.sidebar-group-toggle.active {
  background: rgba(0, 212, 255, 0.25);
  border-color: rgba(0, 212, 255, 0.6);
}

.grouped-list {
  padding: 0;
}

.group-block {
  border-bottom: 1px solid rgba(0, 212, 255, 0.08);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  cursor: pointer;
  background: rgba(0, 212, 255, 0.05);
  transition: background 0.2s;
  user-select: none;
}
.group-header:hover {
  background: rgba(0, 212, 255, 0.12);
}

.group-toggle {
  font-size: 10px;
  color: #00d4ff;
  width: 12px;
  flex-shrink: 0;
}

.group-name {
  color: #00d4ff;
  font-size: 12px;
  font-weight: bold;
  flex: 1;
}

.group-count {
  color: rgba(0, 212, 255, 0.5);
  font-size: 10px;
}

.group-items {
  background: rgba(0, 0, 0, 0.2);
}

.item-mark {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
}

.sidebar-header span {
  color: #00d4ff;
  font-size: 12px;
  font-weight: bold;
}

.sidebar-search {
  background: rgba(0, 40, 80, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  padding: 4px 8px;
  color: #fff;
  font-size: 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.sidebar-search:focus {
  border-color: #00d4ff;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.sidebar-item {
  padding: 7px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 3px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.sidebar-item:hover {
  background: rgba(0, 212, 255, 0.12);
  border-color: rgba(0, 212, 255, 0.25);
}

.sidebar-item.selected {
  background: rgba(0, 212, 255, 0.2);
  border-color: rgba(0, 212, 255, 0.5);
}

.item-type {
  font-size: 10px;
  color: #00d4ff;
  font-weight: bold;
}

.item-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Hints */
.adv-ifc-hints {
  position: absolute;
  bottom: 10px;
  right: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  pointer-events: none;
  z-index: 5;
}

/* ─── Element Popup ──────────────────────────────────────────────────────── */
.adv-ifc-popup {
  position: absolute;
  bottom: 10px;
  right: 12px;
  width: 295px;
  background: rgba(5, 15, 30, 0.96);
  border: 1px solid rgba(0, 212, 255, 0.22);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  z-index: 20;
  overflow: hidden;
  box-shadow:
    0 6px 28px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(0, 212, 255, 0.06),
    inset 0 1px 0 rgba(0, 212, 255, 0.12);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: linear-gradient(180deg, rgba(0, 55, 110, 0.45) 0%, rgba(0, 30, 75, 0.3) 100%);
  border-bottom: 1px solid rgba(0, 212, 255, 0.12);
  flex-shrink: 0;
}

.popup-title {
  color: rgba(0, 220, 255, 0.9);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.popup-actions {
  display: flex;
  gap: 4px;
}

.popup-btn {
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.18);
  color: rgba(0, 212, 255, 0.6);
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
  width: 23px;
  height: 23px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
  line-height: 1;
}

.popup-btn:hover {
  background: rgba(0, 212, 255, 0.14);
  border-color: rgba(0, 212, 255, 0.45);
  color: #00d4ff;
}

.popup-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.element-viewer-wrap {
  height: 165px;
  flex-shrink: 0;
  position: relative;
  background: #040c1a;
  border-bottom: 1px solid rgba(0, 212, 255, 0.08);
}

.element-viewer-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: rgba(0, 212, 255, 0.3);
  font-size: 10px;
}

.element-info {
  flex: 1;
  overflow-y: auto;
  padding: 5px 10px 7px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.info-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 10px;
  padding: 2px 0;
  border-bottom: 1px solid rgba(0, 212, 255, 0.05);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: rgba(0, 212, 255, 0.4);
  min-width: 42px;
  flex-shrink: 0;
  font-size: 9px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  line-height: 1.4;
}

.info-value {
  color: rgba(210, 240, 255, 0.88);
  font-size: 10px;
  line-height: 1.4;
  word-break: break-all;
}

.info-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 9px;
  color: rgba(140, 210, 245, 0.8);
}

/* ─── Fullscreen Overlay ─────────────────────────────────────────────────── */
.adv-ifc-fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.92);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-viewer {
  width: 90vw;
  height: 85vh;
  background: #051020;
  border: 2px solid rgba(0, 212, 255, 0.5);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.2);
}

.fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 40, 80, 0.7);
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
  color: #00d4ff;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.fullscreen-viewer-canvas {
  flex: 1;
  min-height: 0;
}

/* ─── Transitions ─────────────────────────────────────────────────────────── */
.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.popup-fade-enter,
.popup-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.fullscreen-fade-enter-active,
.fullscreen-fade-leave-active {
  transition: opacity 0.3s;
}

.fullscreen-fade-enter,
.fullscreen-fade-leave-to {
  opacity: 0;
}
</style>

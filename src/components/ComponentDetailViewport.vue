/**
 * 构件详情视口（Component Detail Viewport）
 *
 * 使用 iframe + embed=element-panel 模式，彻底绕过 Webpack 对 web-ifc WASM 的破坏。
 * 加载整模后发送 select-element postMessage，iframe 内部调用 showElementInSmallViewer
 * 只渲染该单根构件。
 *
 * 使用方式：
 * <ComponentDetailViewport
 *   :ifcUrl="ifcUrl"
 *   :expressID="expressID"
 *   @loaded="onLoaded"
 *   @error="onError"
 * />
 */
<template>
  <div class="cdv-wrapper">
    <!-- iframe：始终挂载，IFC 在其内部加载（embed=element-panel 模式） -->
    <iframe
      v-if="iframeSrc"
      ref="viewerIframe"
      :src="iframeSrc"
      class="cdv-iframe"
      sandbox="allow-scripts allow-same-origin allow-forms"
      @load="onIframeLoad"
    />

    <!-- 无数据占位 -->
    <div v-if="!iframeSrc" class="cdv-overlay cdv-placeholder">
      <div class="cdv-placeholder-icon">🔍</div>
      <div>等待构件数据...</div>
    </div>

    <!-- 错误提示（叠加在 iframe 上） -->
    <div v-if="errorMsg" class="cdv-overlay cdv-error">⚠ {{ errorMsg }}</div>
  </div>
</template>

<script>
export default {
  name: 'ComponentDetailViewport',

  props: {
    // IFC 文件完整 URL（已解析的绝对路径）
    ifcUrl: { type: String, default: '' },
    // 要高亮的构件 expressID
    expressID: { type: Number, default: null },
    // 背景色（保留 prop，暂不传入 iframe）
    backgroundColor: { type: [Number, String], default: 0x051020 }
  },

  data() {
    return {
      iframeReady: false, // 收到 model-loaded 后为 true
      errorMsg: '',
    };
  },

  computed: {
    iframeSrc() {
      if (!this.ifcUrl) return '';
      const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const base = isDev ? 'http://localhost:5173' : (window.location.origin + '/ifc');
      return `${base}/?ifcUrl=${encodeURIComponent(this.ifcUrl)}&embed=element-panel`;
    },
    // postMessage 的 targetOrigin（必须与 iframe 同源）
    targetOrigin() {
      return ['localhost', '127.0.0.1'].includes(window.location.hostname)
        ? 'http://localhost:5173'
        : window.location.origin;
    }
  },

  watch: {
    // URL 变化（key 改变时组件已重建，此 watch 处理同实例内 URL 变化的边缘情况）
    iframeSrc() {
      this.iframeReady = false;
      this.errorMsg = '';
    },
    // 同模型切换不同 expressID 时，直接发消息无需重载
    expressID(newId) {
      if (this.iframeReady && newId != null) {
        this.postHighlight(newId);
      }
    }
  },

  mounted() {
    window.addEventListener('message', this.onMessage);
  },

  beforeDestroy() {
    window.removeEventListener('message', this.onMessage);
  },

  methods: {
    onIframeLoad() {
      // iframe 文档加载完成，等待 ifc/main.js 内的 model-loaded 消息
    },

    onMessage(event) {
      if (!['http://localhost:5173', window.location.origin].includes(event.origin)) return;
      const iframe = this.$refs.viewerIframe;
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'model-loaded') {
        this.iframeReady = true;
        if (this.expressID != null) {
          // 模型就绪后立即高亮目标构件
          this.postHighlight(this.expressID);
        }
        this.$emit('loaded', { expressID: this.expressID, elementInfo: null });
      } else if (data.type === 'error') {
        this.iframeReady = false;
        this.errorMsg = '构件加载失败';
        this.$emit('error', new Error(data.message || 'IFC error'));
      }
    },

    postHighlight(expressID) {
      const iframe = this.$refs.viewerIframe;
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage({
        type: 'select-element',
        expressID: Number(expressID),
        focus: true,
        isolateOnly: true,
      }, this.targetOrigin);
    },
  }
};
</script>

<style scoped>
.cdv-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background: #051020;
  overflow: hidden;
}

.cdv-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.cdv-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 13px;
  z-index: 2;
  background: #051020;
}

.cdv-error { color: #f56c6c; }

.cdv-placeholder { color: rgba(0, 186, 255, 0.4); }

.cdv-placeholder-icon {
  font-size: 32px;
  opacity: 0.5;
}
</style>

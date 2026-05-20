<template>
  <div class="inspection_images_wrap">
    <!-- 图像显示区域 -->
    <div class="images_container">
      <div class="img_box">
        <div class="camera_label">主相机</div>
        <div class="img_placeholder">
          <div class="scanner_line"></div>
          <img src="/img/xiangji.jpg" alt="Main Camera" />
        </div>
      </div>
      <div class="img_box">
        <div class="camera_label">侧相机</div>
        <div class="img_placeholder">
          <div class="scanner_line"></div>
          <img src="/img/xiangji.jpg" alt="Side Camera" />
        </div>
      </div>
    </div>

    <!-- 检测信息 -->
    <div class="inspection_overlay">
      <div class="info_row">
        <span>构件编号:</span>
        <span class="val">{{ currentMark || '---' }}</span>
      </div>
      <div class="info_row">
        <span>识别状态:</span>
        <span class="val status_ok">已对齐</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    syncCurrentMarkFromStorage() {
      const stored = localStorage.getItem('current_component_mark');
      this.currentMark = stored || '---';
    },
    resolveComponentCode(payload) {
      if (!payload || typeof payload !== 'object') return '---';
      const element = payload.element || {};
      return String(
        payload.componentId ||
        payload.ifcGlobalId ||
        payload.globalId ||
        payload.ifcElementId ||
        payload.expressID ||
        element.globalId ||
        element.expressID ||
        '---'
      );
    },
    onComponentIfcSync(payload) {
      this.currentMark = this.resolveComponentCode(payload);
    },
    onStorageChange(event) {
      if (!event || event.key === 'current_component_mark') {
        this.syncCurrentMarkFromStorage();
      }
    },
    onCurrentComponentMarkChange() {
      this.syncCurrentMarkFromStorage();
    }
  },
  data() {
    return {
      pageflag: true,
      currentMark: '---'
    };
  },
  created() {
    if (this.$bus) {
      this.$bus.$on('component-ifc-sync', this.onComponentIfcSync);
    }
    this.syncCurrentMarkFromStorage();
  },
  mounted() {
    window.addEventListener('storage', this.onStorageChange);
    window.addEventListener('current-component-mark-change', this.onCurrentComponentMarkChange);
  },
  beforeDestroy() {
    window.removeEventListener('storage', this.onStorageChange);
    window.removeEventListener('current-component-mark-change', this.onCurrentComponentMarkChange);
    if (this.$bus) this.$bus.$off('component-ifc-sync', this.onComponentIfcSync);
  }
};
</script>

<style lang='scss' scoped>
.inspection_images_wrap {
  width: 100%;
  height: 100%;
  padding: 4px 6px 6px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;

  .images_container {
    flex: 1;
    display: flex;
    gap: 8px;
    overflow: hidden;
    flex-direction: row;

    .img_box {
      flex: 1;
      position: relative;
      border: 1px solid rgba(0, 253, 250, 0.3);
      background: linear-gradient(
        135deg,
        rgba(0, 40, 60, 0.5) 0%,
        rgba(0, 20, 40, 0.3) 100%
      );
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 4px 16px rgba(0, 0, 0, 0.2);

      .camera_label {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 4px 10px;
        background: rgba(0, 20, 40, 0.7);
        backdrop-filter: blur(4px);
        color: #00fdfa;
        font-size: 12px;
        font-weight: 700;
        border-radius: 4px;
        z-index: 2;
        border: 1px solid rgba(0, 253, 250, 0.3);
        text-shadow: 0 0 10px rgba(0, 253, 250, 0.6);
        letter-spacing: 1px;
      }

      .img_placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.7;
        }

        .scanner_line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(to right, transparent, #00fdfa, transparent);
          box-shadow: 0 0 15px #00fdfa;
          top: 0;
          animation: scan 3s linear infinite;
          z-index: 1;
        }
      }
    }
  }

  .inspection_overlay {
    position: absolute;
    bottom: 12px;
    right: 12px;
    padding: 6px 8px;
    background: rgba(2, 12, 32, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-left: 3px solid #00fdfa;
    pointer-events: none;

    .info_row {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
      display: flex;
      gap: 8px;
      margin-bottom: 2px;

      .val {
        color: #fff;
        font-weight: 800;
      }

      .status_ok {
        color: #29fc29;
        font-weight: 800;
      }
    }
  }
}

@keyframes scan {
  0% { top: 0; }
  100% { top: 100%; }
}
</style>

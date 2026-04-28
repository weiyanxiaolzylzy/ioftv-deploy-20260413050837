<template>
  <div class="inspection_images_wrap">
    <!-- 切换按钮 -->
    <div class="mode_toggle">
      <div 
        class="toggle_item" 
        :class="{ active: viewMode === 'binocular' }"
        @click="viewMode = 'binocular'"
      >
        双目组图
      </div>
      <div 
        class="toggle_item" 
        :class="{ active: viewMode === 'monocular' }"
        @click="viewMode = 'monocular'"
      >
        单目组图
      </div>
    </div>

    <!-- 图像显示区域 -->
    <div class="images_container" :class="viewMode">
      <template v-if="viewMode === 'binocular'">
        <div class="img_box">
          <div class="camera_label">左相机 (Left)</div>
          <div class="img_placeholder">
            <div class="scanner_line"></div>
            <img src="/img/welcome.jpg" alt="Left Camera" />
          </div>
        </div>
        <div class="img_box">
          <div class="camera_label">右相机 (Right)</div>
          <div class="img_placeholder">
            <div class="scanner_line"></div>
            <img src="/img/welcome.jpg" alt="Right Camera" />
          </div>
        </div>
      </template>
      <template v-else>
        <div class="img_box large">
          <div class="camera_label">主相机 (Main)</div>
          <div class="img_placeholder">
            <div class="scanner_line"></div>
            <img src="/img/welcome.jpg" alt="Main Camera" />
          </div>
        </div>
      </template>
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
    }
  },
  data() {
    return {
      viewMode: 'binocular',
      pageflag: true,
      currentMark: '---'
    };
  },
  created() {
    if (this.$bus) {
      this.$bus.$on('component-ifc-sync', (p) => {
        this.currentMark = this.resolveComponentCode(p);
      });
    }
    const stored = localStorage.getItem('current_component_mark');
    if (stored) this.currentMark = stored;
  },
  beforeDestroy() {
    if (this.$bus) this.$bus.$off('component-ifc-sync');
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

  .mode_toggle {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
    z-index: 5;

    .toggle_item {
      padding: 5px 12px;
      font-size: 13px;
      font-weight: 700;
      color: #00baff;
      background: rgba(0, 186, 255, 0.12);
      border: 1px solid rgba(0, 186, 255, 0.35);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: rgba(0, 186, 255, 0.25);
      }

      &.active {
        background: #00baff;
        color: #000;
        font-weight: 900;
      }
    }
  }

  .images_container {
    flex: 1;
    display: flex;
    gap: 8px;
    overflow: hidden;

    &.binocular {
      flex-direction: row;
    }

    &.monocular {
      .img_box {
        width: 100%;
      }
    }

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

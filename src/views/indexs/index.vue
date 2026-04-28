<!--
 * @Author: daidai
 * @Date: 2022-03-04 09:23:59
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-05-07 11:05:02
 * @FilePath: \web-pc\src\pages\big-screen\view\indexs\index.vue
-->
<template>
  <div class="contents" :class="themeClass">
    <div class="inspection_layout">
      <div class="contetn_left">
        <div class="pagetab"></div>
        <ItemWrap class="contetn_left-top contetn_lr-item" title="检测总览">
          <LeftTop />
        </ItemWrap>
        <ItemWrap class="contetn_left-center contetn_lr-item" title="实时监测状态" style="padding: 0 8px 10px 8px">
          <LeftCenter />
        </ItemWrap>
        <ItemWrap class="contetn_left-bottom contetn_lr-item" title="检测计划" style="padding: 0 8px 10px 8px">
          <LeftBottom />
        </ItemWrap>
      </div>

      <div class="contetn_center_top">
        <CenterMap />
      </div>

      <div class="contetn_right">
        <ItemWrap class="contetn_right-top contetn_lr-item" title="生产绩效榜">
          <MonthlyPerformance />
        </ItemWrap>
      </div>

      <div class="contetn_center_bottom">
        <div class="realtime_bottom_box">
          <RightBottom ref="rightBottom" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import LeftTop from "./left-top.vue";
import LeftCenter from "./left-center.vue";
import LeftBottom from "./left-bottom.vue";
import CenterMap from "./center-map.vue";
import MonthlyPerformance from "./monthly-performance.vue";
import RightBottom from "./right-bottom.vue";

export default {
  props: {
    themeMode: {
      type: String,
      default: "dark",
    },
  },
  components: {
    LeftTop,
    LeftCenter,
    LeftBottom,
    CenterMap,
    MonthlyPerformance,
    RightBottom,
  },
  data() {
    return {};
  },
  filters: {
    numsFilter(msg) {
      return msg || 0;
    },
  },
  computed: {
    themeClass() {
      if (this.themeMode === "light") return "light-theme";
      if (this.themeMode === "steel-qc") return "steel-qc-theme";
      return "";
    },
  },

  mounted() {
    // 监听从项目模型双击的构件请求，同步到构件模型
    if (this.$bus) {
      this.$bus.$on('component-ifc-request', this.onBusComponentRequest);
    }
  },
  beforeDestroy() {
    if (this.$bus) {
      this.$bus.$off('component-ifc-request', this.onBusComponentRequest);
    }
  },
  methods: {
    // 处理项目模型双击选择构件，同步到构件模型
    onBusComponentRequest(payload) {
      if (!payload || !payload.element) return;
      const rightBottom = this.$refs.rightBottom;
      if (rightBottom && rightBottom.syncFromProjectViewer) {
        rightBottom.syncFromProjectViewer(payload.ifcUrl, payload.element);
      }
    },
  },
};
</script>
<style lang="scss" scoped>
// 亮色主题
.contents.light-theme {
  background: #f5f7fa !important;
  color: #000000 !important;

  // 修改所有子组件的背景色
  ::v-deep .item-wrap {
    background: #ffffff !important;
    border: 1px solid #d0d7de !important;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15) !important;

    .item-title {
      color: #ffffff !important;
      background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%) !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;

      &::before,
      &::after {
        background: #4a90e2 !important;
      }
    }
  }

  // 修改所有文字颜色 - 黑色字体
  ::v-deep div,
  ::v-deep span,
  ::v-deep p,
  ::v-deep label,
  ::v-deep li,
  ::v-deep a {
    color: #000000 !important;
  }

  // 标题文字保持白色（在蓝色背景上）
  ::v-deep .item-title,
  ::v-deep .item-title * {
    color: #ffffff !important;
  }

  // 修改表格样式
  ::v-deep table {
    background: #ffffff !important;
    border: 1px solid #d0d7de !important;

    th {
      background: #e8eef5 !important;
      color: #000000 !important;
      border: 1px solid #c0c7ce !important;
      font-weight: 600 !important;
    }

    td {
      background: #ffffff !important;
      color: #000000 !important;
      border: 1px solid #d0d7de !important;
    }

    tr:nth-child(even) td {
      background: #f8f9fa !important;
    }

    tr:hover td {
      background: #e8eef5 !important;
    }
  }

  // 修改数字和数据显示
  ::v-deep .num,
  ::v-deep .number,
  ::v-deep .count,
  ::v-deep .value {
    color: #000000 !important;
    font-weight: 600 !important;
  }

  // 修改图表容器背景
  ::v-deep .echarts,
  ::v-deep .chart-container {
    background: #ffffff !important;
  }

  // 修改边框颜色
  ::v-deep .border-box,
  ::v-deep .dv-border-box {
    border-color: #d0d7de !important;

    * {
      color: #000000 !important;
    }
  }

  // 修改输入框
  ::v-deep input,
  ::v-deep textarea,
  ::v-deep select {
    background: #ffffff !important;
    color: #000000 !important;
    border: 1px solid #d0d7de !important;
  }

  // 修改按钮
  ::v-deep button {
    background: #4a90e2 !important;
    color: #ffffff !important;
    border: none !important;

    &:hover {
      background: #357abd !important;
    }
  }

  // 修改链接
  ::v-deep a {
    color: #4a90e2 !important;

    &:hover {
      color: #357abd !important;
    }
  }

  // 修改卡片内容
  ::v-deep .card,
  ::v-deep .panel,
  ::v-deep .box {
    background: #ffffff !important;
    color: #000000 !important;
    border: 1px solid #d0d7de !important;
  }

  // 修改列表项
  ::v-deep ul li,
  ::v-deep ol li {
    color: #000000 !important;
    border-color: #d0d7de !important;
  }

  // 确保所有背景是深色的地方都改成白色
  ::v-deep [style*="background"] {
    background: #ffffff !important;
  }

  // 修改地图标题颜色
  ::v-deep .centermap .titletext {
    background: linear-gradient(
      92deg,
      #1a1a1a 0%,
      #333333 48%,
      #1a1a1a 100%
    ) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }

  // 修改地图标签颜色
  ::v-deep .centermap .quanguo {
    color: #000000 !important;
    border-color: #4a90e2 !important;
    box-shadow: 0 2px 4px rgba(74, 144, 226, 0.3),
      0 0 6px rgba(74, 144, 226, 0.2) !important;
  }

  // 修改顶部标题颜色
  ::v-deep .title-text {
    background: linear-gradient(
      92deg,
      #1a1a1a 0%,
      #333333 48%,
      #1a1a1a 100%
    ) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }

  // 强制胶囊图柱子颜色显示（本月生产排名）
  ::v-deep .dv-capsule-chart {
    // 柱子有颜色
    .capsule-container .capsule-item:nth-child(1) > div {
      background: #37a2da !important;
    }
    .capsule-container .capsule-item:nth-child(2) > div {
      background: #32c5e9 !important;
    }
    .capsule-container .capsule-item:nth-child(3) > div {
      background: #67e0e3 !important;
    }
    .capsule-container .capsule-item:nth-child(4) > div {
      background: #ffc530 !important;
    }
    .capsule-container .capsule-item:nth-child(5) > div {
      background: #469f4b !important;
    }
    .capsule-container .capsule-item:nth-child(6) > div {
      background: #ff9f7f !important;
    }
    .capsule-container .capsule-item:nth-child(7) > div {
      background: #fb7293 !important;
    }
    .capsule-container .capsule-item:nth-child(8) > div {
      background: #e062ae !important;
    }

    // 数字背景透明
    .capsule-item-value,
    .unit-label,
    .unit-text,
    .unit-label div {
      background: transparent !important;
      background-color: transparent !important;
      color: #000 !important;
    }
  }
}

// =============================================
// 钢结构检测系统主题
// =============================================
.contents.steel-qc-theme {
  background: linear-gradient(145deg, #0c2248 0%, #0f2d5e 40%, #0a1e40 70%, #0d2040 100%) !important;
  color: #fff !important;

  // 子组件容器
  ::v-deep .item-wrap {
    background: rgba(16, 52, 110, 0.55) !important;
    border: 1px solid rgba(60, 180, 255, 0.4) !important;
    box-shadow: 0 4px 28px rgba(0, 80, 200, 0.2), 0 0 20px rgba(60, 160, 255, 0.1) !important;

    .item-title {
      background: linear-gradient(90deg, rgba(0, 160, 255, 0.3) 0%, rgba(10, 40, 100, 0.8) 100%) !important;
      border-bottom: 1px solid rgba(60, 180, 255, 0.35) !important;
      color: #7dd8ff !important;
      text-shadow: 0 0 12px rgba(125, 216, 255, 0.5) !important;
    }
  }

  // 文字颜色
  ::v-deep div,
  ::v-deep span,
  ::v-deep p,
  ::v-deep label,
  ::v-deep li {
    color: #f0f8ff !important;
  }

  // 边框盒子
  ::v-deep .dv-border-box {
    border-color: rgba(60, 180, 255, 0.3) !important;
  }

  // 图表容器
  ::v-deep .echarts,
  ::v-deep .chart-container {
    background: transparent !important;
  }

  // 地图样式
  ::v-deep .centermap {
    background: transparent !important;

    .titletext {
      color: #7dd8ff !important;
      -webkit-text-fill-color: #7dd8ff !important;
    }

    .quanguo {
      border-color: rgba(60, 180, 255, 0.4) !important;
      box-shadow: 0 2px 10px rgba(60, 160, 255, 0.25) !important;
    }
  }

  // 标题文字
  ::v-deep .title-text {
    background: linear-gradient(92deg, #7dd8ff 0%, #a0eaff 48%, #7dd8ff 100%) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }

  // 实时监测状态框
  ::v-deep .realtime_top_box {
    background: linear-gradient(135deg, rgba(20, 70, 140, 0.55) 0%, rgba(12, 45, 100, 0.65) 100%) !important;
    border-color: rgba(60, 180, 255, 0.4) !important;

    .realtime_box_title span {
      background: linear-gradient(92deg, #7dd8ff 0%, #a0eaff 50%, #7dd8ff 100%) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
    }
  }

  ::v-deep .realtime_bottom_box {
    background: linear-gradient(135deg, rgba(20, 70, 140, 0.45) 0%, rgba(12, 45, 100, 0.55) 100%) !important;
    border-color: rgba(60, 180, 255, 0.3) !important;
  }

  // 按钮
  ::v-deep button {
    background: linear-gradient(180deg, rgba(0, 160, 255, 0.9) 0%, rgba(0, 110, 240, 0.8) 100%) !important;
    color: #e8fbff !important;
    border-color: rgba(60, 180, 255, 0.5) !important;

    &:hover {
      background: linear-gradient(180deg, rgba(80, 200, 255, 0.95) 0%, rgba(0, 140, 255, 0.9) 100%) !important;
    }
  }

  // 表格
  ::v-deep table {
    background: transparent !important;

    th {
      background: rgba(15, 60, 130, 0.8) !important;
      color: #7dd8ff !important;
      border-color: rgba(60, 180, 255, 0.25) !important;
    }

    td {
      background: transparent !important;
      color: rgba(240, 248, 255, 0.9) !important;
      border-color: rgba(60, 180, 255, 0.15) !important;
    }

    tr:nth-child(even) td {
      background: rgba(0, 40, 100, 0.15) !important;
    }
  }

  // KPI 数字
  ::v-deep .num,
  ::v-deep .number,
  ::v-deep .count,
  ::v-deep .value {
    color: #7dd8ff !important;
    text-shadow: 0 0 12px rgba(125, 216, 255, 0.5) !important;
  }

  // 输入框
  ::v-deep input,
  ::v-deep textarea,
  ::v-deep select {
    background: rgba(0, 40, 100, 0.4) !important;
    color: #e8fbff !important;
    border-color: rgba(60, 180, 255, 0.4) !important;
  }

  // 翻页器
  ::v-deep .dv-capsule-chart,
  ::v-deep .dv-water-pond-chart,
  ::v-deep .dv-digital-flop {
    .capsule-item-value,
    .unit-text {
      color: #7dd8ff !important;
      text-shadow: 0 0 12px rgba(125, 216, 255, 0.5) !important;
    }
  }

}

// 内容
.contents {
  height: 100%;
  min-height: 0;
  padding: 0 clamp(4px, 0.35vw, 8px) clamp(4px, 0.35vw, 8px);
  box-sizing: border-box;
  overflow: hidden;
}

.inspection_layout {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(290px, 23fr) minmax(0, 54fr) minmax(290px, 23fr);
  grid-template-rows: minmax(0, 1fr) clamp(240px, 26vh, 340px);
  gap: clamp(10px, 0.8vw, 16px);
  align-items: stretch;

  .contetn_left,
  .contetn_right {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: clamp(10px, 0.8vw, 16px);
    min-height: 0;
  }

  .contetn_left {
    grid-column: 1;
    grid-row: 1 / span 2;
    display: grid;
    grid-template-rows: minmax(0, 0.95fr) minmax(0, 1.08fr) minmax(0, 0.97fr);
    min-height: 0;
    position: relative;
  }

  .contetn_left-top {
    height: 100%;
    min-height: 0;
    transform: translateY(clamp(0px, -0.6vw, -16px));
  }

  .contetn_left-center {
    height: 100%;
    min-height: 0;
    transform: translateY(clamp(0px, -0.6vw, -16px));
  }

  .contetn_left-bottom {
    height: 100%;
    min-height: 0;
    transform: translateY(clamp(0px, -0.6vw, -16px));
  }

  .contetn_center_top {
    grid-column: 2;
    grid-row: 1;
    width: 100%;
    min-width: 0;
    min-height: 0;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .contetn_center_bottom {
    grid-column: 2 / span 2;
    grid-row: 2;
    min-height: 0;
    min-width: 0;
  }

  .contetn_right {
    grid-column: 3;
    grid-row: 1;
    min-height: 0;
  }

  .contetn_right-top {
    height: 100%;
    min-height: 0;
  }

  .realtime_bottom_box {
    height: 100%;
    box-sizing: border-box;
    background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0,190,255,0.35);
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 32px rgba(0,0,0,0.28);
  }
}

@media (min-aspect-ratio: 21 / 9) {
  .inspection_layout {
    grid-template-columns: minmax(310px, 23fr) minmax(0, 54fr) minmax(310px, 23fr);
    grid-template-rows: minmax(0, 1fr) clamp(220px, 23vh, 320px);
  }
}

@media (max-aspect-ratio: 16 / 9) {
  .inspection_layout {
    grid-template-columns: minmax(270px, 25fr) minmax(0, 48fr) minmax(270px, 27fr);
    grid-template-rows: minmax(0, 1fr) clamp(250px, 28vh, 360px);
  }
}

@media (max-width: 1500px) {
  .inspection_layout {
    grid-template-columns: minmax(250px, 25fr) minmax(0, 46fr) minmax(250px, 29fr);
  }
}
</style>

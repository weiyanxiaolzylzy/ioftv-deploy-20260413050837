<!--
 * @Author: daidai
 * @Date: 2022-03-04 09:23:59
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-05-07 11:05:02
 * @FilePath: \web-pc\src\pages\big-screen\view\indexs\index.vue
-->
<template>
  <div class="contents" :class="themeClass">
    <div class="theme-toggle-btn" @click="toggleTheme" :title="themeHint">
      <span v-if="themeMode === 'light'">🌙</span>
      <span v-else-if="themeMode === 'steel-qc'">🏭</span>
      <span v-else>☀️</span>
    </div>
    <div class="mode-toggle-btn" @click="toggleMode" style="left: 200px">
      {{ viewMode === 'inspection' ? '销售模式' : '检测模式' }}
    </div>
    
    <div class="version-toggle-btn" @click="toggleVersion" style="left: 320px">
      钢结构尺寸检测系统
    </div>

    <template v-if="viewMode === 'inspection'">
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
    </template>

    <div v-else class="sales_layout">
      <div class="sales_left">
        <ItemWrap class="sales_block" title="产品概览">
          <div class="product_list">
            <div class="product_item" v-for="(item, index) in salesProducts" :key="index">
              <div class="product_name">{{ item.name }}</div>
              <div class="product_meta">{{ item.spec }}</div>
              <div class="product_stats">
                <span>库存 {{ item.stock }}</span>
                <span>出厂价 {{ item.price }}</span>
              </div>
              <div class="product_status" :class="item.status">{{ item.statusText }}</div>
            </div>
          </div>
        </ItemWrap>
        <ItemWrap class="sales_block" title="销售漏斗">
          <div class="funnel_list">
            <div class="funnel_item" v-for="(item, index) in salesFunnel" :key="index">
              <div class="funnel_label">{{ item.label }}</div>
              <div class="funnel_bar">
                <span :style="{ width: item.percent + '%' }"></span>
              </div>
              <div class="funnel_value">{{ item.value }}</div>
            </div>
          </div>
        </ItemWrap>
      </div>

      <div class="sales_center">
        <ItemWrap class="sales_block" title="销售概览">
          <div class="kpi_grid">
            <div class="kpi_item" v-for="(item, index) in salesKpis" :key="index">
              <div class="kpi_label">{{ item.label }}</div>
              <div class="kpi_value">{{ item.value }}<span>{{ item.unit }}</span></div>
            </div>
          </div>
        </ItemWrap>
        <ItemWrap class="sales_block" title="订单履约进度">
          <div class="order_list">
            <div class="order_item" v-for="(item, index) in salesOrders" :key="index">
              <div class="order_main">
                <span class="order_project">{{ item.project }}</span>
                <span class="order_product">{{ item.product }}</span>
                <span class="order_qty">{{ item.qty }}</span>
              </div>
              <div class="order_meta">
                <span>{{ item.date }}</span>
                <span :class="item.status">{{ item.statusText }}</span>
              </div>
            </div>
          </div>
        </ItemWrap>
      </div>

      <div class="sales_right">
        <ItemWrap class="sales_block" title="渠道贡献">
          <div class="channel_list">
            <div class="channel_item" v-for="(item, index) in salesChannels" :key="index">
              <div class="channel_label">{{ item.name }}</div>
              <div class="channel_bar">
                <span :style="{ width: item.value + '%' }"></span>
              </div>
              <div class="channel_value">{{ item.value }}%</div>
            </div>
          </div>
        </ItemWrap>
        <ItemWrap class="sales_block" title="重点客户">
          <div class="customer_list">
            <div class="customer_item" v-for="(item, index) in salesCustomers" :key="index">
              <div class="customer_name">{{ item.name }}</div>
              <div class="customer_level">{{ item.level }}</div>
              <div class="customer_value">{{ item.value }}</div>
            </div>
          </div>
        </ItemWrap>
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
  components: {
    LeftTop,
    LeftCenter,
    LeftBottom,
    CenterMap,
    MonthlyPerformance,
    RightBottom,
  },
  data() {
    return {
      isLightTheme: false,
      viewMode: "inspection",
      themeMode: "dark", // 'dark' | 'light' | 'steel-qc'
      salesKpis: [
        { label: "本月销售额", value: "3,260", unit: "万" },
        { label: "新签订单", value: "38", unit: "单" },
        { label: "毛利率", value: "22.4", unit: "%" },
        { label: "交付准时率", value: "96.1", unit: "%" }
      ],
      salesFunnel: [
        { label: "线索", value: "320", percent: 100 },
        { label: "商机", value: "210", percent: 80 },
        { label: "报价", value: "156", percent: 60 },
        { label: "签约", value: "92", percent: 40 },
        { label: "交付", value: "68", percent: 30 }
      ],
      salesProducts: [
        { name: "钢梁 L 型", spec: "Q355B / 8m", stock: "680", price: "¥ 1.2万", status: "hot", statusText: "热销" },
        { name: "钢柱 H 型", spec: "Q355B / 6m", stock: "420", price: "¥ 1.6万", status: "stable", statusText: "稳定" },
        { name: "节点板套件", spec: "标准件", stock: "980", price: "¥ 0.18万", status: "stock", statusText: "备货" }
      ],
      salesOrders: [
        { project: "太原智造园", product: "钢梁 L 型", qty: "180 件", date: "2026-02-20", status: "on", statusText: "生产中" },
        { project: "临汾桥梁", product: "钢柱 H 型", qty: "96 件", date: "2026-02-19", status: "ready", statusText: "待发运" },
        { project: "运城园区", product: "节点板套件", qty: "320 套", date: "2026-02-18", status: "done", statusText: "已交付" }
      ],
      salesChannels: [
        { name: "直销", value: 45 },
        { name: "渠道代理", value: 30 },
        { name: "工程总包", value: 18 },
        { name: "电商平台", value: 7 }
      ],
      salesCustomers: [
        { name: "山西建投", level: "A级客户", value: "¥ 680 万" },
        { name: "中铁建工", level: "A级客户", value: "¥ 520 万" },
        { name: "华北机设", level: "B级客户", value: "¥ 310 万" },
        { name: "太原钢构", level: "B级客户", value: "¥ 280 万" }
      ]
    };
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
    themeHint() {
      if (this.themeMode === "dark") return "当前：深蓝科技风，点击切换亮色主题";
      if (this.themeMode === "light") return "当前：亮色主题，点击切换钢结构检测风";
      return "当前：钢结构检测风，点击切换深蓝科技风";
    }
  },
  created() {
    const savedTheme = localStorage.getItem("themeMode");
    if (savedTheme === "light") {
      this.isLightTheme = true;
      this.themeMode = "light";
    } else if (savedTheme === "steel-qc") {
      this.isLightTheme = false;
      this.themeMode = "steel-qc";
    } else {
      this.isLightTheme = false;
      this.themeMode = "dark";
    }
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
    toggleTheme() {
      // 三态循环：dark → light → steel-qc → dark
      if (this.themeMode === "dark") {
        this.themeMode = "light";
        this.isLightTheme = true;
        localStorage.setItem("themeMode", "light");
      } else if (this.themeMode === "light") {
        this.themeMode = "steel-qc";
        this.isLightTheme = false;
        localStorage.setItem("themeMode", "steel-qc");
      } else {
        this.themeMode = "dark";
        this.isLightTheme = false;
        localStorage.setItem("themeMode", "dark");
      }
      this.$nextTick(() => {
        window.dispatchEvent(new Event("themeChange"));
      });
    },
    toggleMode() {
      this.viewMode = this.viewMode === "inspection" ? "sales" : "inspection";
    },
    toggleVersion() {
      // 这里的逻辑之前是指向外部子项目的 /steel-qc/ 目录
      // 如果你想访问的是“钢结构检测系统”的内部版本（即 src/views/secondview/index.vue）
      // 我们直接通过 vue-router 跳转即可，这样不会出现 404/Unexpected token 报错
      this.$router.push('/secondview');
    },
  },
};
</script>
<style lang="scss" scoped>
// 主题切换按钮
.theme-toggle-btn {
  position: fixed;
  top: 25px;
  left: 20px;
  width: 45px;
  height: 45px;
  background: rgba(74, 144, 226, 0.2);
  border: 2px solid #4a90e2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  transition: all 0.3s;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);

  &:hover {
    background: rgba(74, 144, 226, 0.4);
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(74, 144, 226, 0.5);
  }

  &:active {
    transform: scale(0.95);
  }
}

.mode-toggle-btn {
  position: fixed;
  top: 25px;
  left: 80px;
  height: 45px;
  padding: 0 18px;
  background: rgba(0, 186, 255, 0.18);
  border: 2px solid #00baff;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  color: #00baff;
  transition: all 0.3s;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 186, 255, 0.25);
  letter-spacing: 1px;
}

.mode-toggle-btn:hover {
  background: rgba(0, 186, 255, 0.35);
  transform: translateY(-1px);
}

.version-toggle-btn {
  position: fixed;
  top: 25px;
  left: 200px;
  height: 45px;
  padding: 0 18px;
  background: rgba(255, 158, 0, 0.18);
  border: 2px solid #ff9e00;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
  color: #ff9e00;
  transition: all 0.3s;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(255, 158, 0, 0.25);
  letter-spacing: 1px;
  
  &:hover {
    background: rgba(255, 158, 0, 0.35);
    transform: translateY(-1px);
  }
}

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

  // 修改按钮样式
  .theme-toggle-btn {
    background: rgba(74, 144, 226, 0.15) !important;
    border-color: #4a90e2 !important;

    &:hover {
      background: rgba(74, 144, 226, 0.3) !important;
    }
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

  // 主题切换按钮
  .theme-toggle-btn {
    background: rgba(60, 160, 255, 0.2) !important;
    border-color: #7dd8ff !important;
    color: #7dd8ff !important;

    &:hover {
      background: rgba(60, 160, 255, 0.35) !important;
      transform: scale(1.1);
    }
  }
}

// 内容
.contents {
  display: grid;
  // Expand business columns and compress the map column so both side panels have more readable width.
  grid-template-columns: clamp(440px, 30vw, 520px) minmax(480px, 1fr) clamp(420px, 28vw, 500px);
  grid-template-rows: minmax(0, 1fr) minmax(220px, 380px);
  gap: 12px;
  align-items: stretch;
  height: 100%;
  overflow: hidden;

  .contetn_left,
  .contetn_right {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .contetn_left {
    grid-column: 1;
    grid-row: 1 / span 2;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);
    min-height: 0;
  }

  .contetn_left-top {
    height: auto;
    min-height: 0;
  }

  .contetn_left-center {
    height: auto;
    min-height: 0;
  }

  .contetn_left-bottom {
    height: auto;
    min-height: 0;
  }

  .contetn_center_top {
    grid-column: 2;
    grid-row: 1;
    width: 100%;
    min-width: 0;
    min-height: 0;
    border-radius: 12px;
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
    border-radius: 12px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }

  .contetn_left {
    gap: 12px;
    position: relative;
  }

  @media (max-width: 1400px) {
    // Keep the compressed-map layout usable on smaller local preview windows.
    grid-template-columns: clamp(400px, 28vw, 440px) minmax(420px, 1fr) clamp(380px, 26vw, 420px);
  }
}

.sales_layout {
  width: 100%;
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  box-sizing: border-box;

  .sales_left,
  .sales_center,
  .sales_right {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sales_left,
  .sales_right {
    width: 540px;
  }

  .sales_center {
    flex: 1;
  }

  .sales_block {
    height: 320px;
  }
}

.product_list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;

  .product_item {
    background: rgba(0, 186, 255, 0.06);
    border: 1px solid rgba(0, 186, 255, 0.25);
    border-radius: 6px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .product_name {
    font-size: 18px;
    font-weight: 900;
    color: #fff;
  }

  .product_meta {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .product_stats {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #00baff;
  }

  .product_status {
    align-self: flex-start;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    background: rgba(0, 186, 255, 0.15);
    color: #00baff;
  }

  .product_status.hot {
    background: rgba(255, 158, 0, 0.2);
    color: #ff9e00;
  }

  .product_status.stable {
    background: rgba(0, 186, 255, 0.15);
    color: #00baff;
  }

  .product_status.stock {
    background: rgba(73, 231, 194, 0.2);
    color: #49e7c2;
  }
}

.funnel_list {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.funnel_item {
  display: grid;
  grid-template-columns: 70px 1fr 60px;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #fff;
}

.funnel_bar {
  height: 8px;
  background: rgba(0, 186, 255, 0.12);
  border-radius: 10px;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #00baff 0%, #3be7ff 100%);
  }
}

.funnel_value {
  color: #00baff;
  text-align: right;
}

.kpi_grid {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.kpi_item {
  background: rgba(0, 186, 255, 0.1);
  border: 1px solid rgba(0, 186, 255, 0.25);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kpi_label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.kpi_value {
  font-size: 28px;
  color: #00baff;
  font-weight: 900;

  span {
    font-size: 14px;
    margin-left: 6px;
    color: rgba(255, 255, 255, 0.6);
  }
}

.order_list {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order_item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(0, 186, 255, 0.2);
  border-radius: 6px;
  padding: 8px 10px;
}

.order_main {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.order_meta {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.order_meta .on {
  color: #00baff;
}

.order_meta .ready {
  color: #ffb340;
}

.order_meta .done {
  color: #49e7c2;
}

.channel_list {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.channel_item {
  display: grid;
  grid-template-columns: 70px 1fr 50px;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

.channel_label {
  color: #fff;
  font-weight: 800;
}

.channel_bar {
  height: 8px;
  background: rgba(0, 186, 255, 0.15);
  border-radius: 10px;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #00baff 0%, #75f0ff 100%);
  }
}

.channel_value {
  text-align: right;
  color: #00baff;
}

.customer_list {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.customer_item {
  display: grid;
  grid-template-columns: 1fr 80px 90px;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  background: rgba(0, 186, 255, 0.06);
  border: 1px solid rgba(0, 186, 255, 0.2);
  border-radius: 6px;
  padding: 8px 10px;
}

.customer_name {
  color: #fff;
}

.customer_level {
  color: #00baff;
}

.customer_value {
  text-align: right;
  color: rgba(255, 255, 255, 0.7);
}

@keyframes rotating {
  0% {
    -webkit-transform: rotate(0) scale(1);
    transform: rotate(0) scale(1);
  }
  50% {
    -webkit-transform: rotate(180deg) scale(1.1);
    transform: rotate(180deg) scale(1.1);
  }
  100% {
    -webkit-transform: rotate(360deg) scale(1);
    transform: rotate(360deg) scale(1);
  }
}
</style>

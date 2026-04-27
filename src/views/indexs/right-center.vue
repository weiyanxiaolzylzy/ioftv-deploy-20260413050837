<template>
  <div class="right_bottom" :class="{ 'light-chart': isLightTheme }">
    <dv-capsule-chart :config="config" :key="themeKey" style="width:100%;height:220px" />
    <div class="workshop-rate">
      <div class="rate-label">车间一次合格率：</div>
      <div class="rate-value">{{ workshopFirstPassRate }}%</div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      config: {
        showValue: true,
        unit: "%",
        data: [
          { name: '一班组', value: 99.2 },
          { name: '二班组', value: 98.5 },
          { name: '三班组', value: 97.8 },
          { name: '四班组', value: 96.5 },
          { name: '五班组', value: 95.2 },
          { name: '六班组', value: 94.0 }
        ],
        colors: ["#00baff", "#4cc9ff", "#6fe3ff", "#8deaff", "#b2f2ff", "#d1f7ff"]
      },
      workshopFirstPassRate: 97.5,
      themeKey: 0,
      isLightTheme: false
    };
  },
  created() {
    this.handleThemeChange()
  },
  mounted() {
    window.addEventListener('themeChange', this.handleThemeChange);
  },
  beforeDestroy() {
    window.removeEventListener('themeChange', this.handleThemeChange);
  },
  methods: {
    handleThemeChange() {
      const savedTheme = localStorage.getItem('themeMode')
      this.isLightTheme = savedTheme === 'light'
      const barColors = this.isLightTheme ? 
        ["#37a2da", "#32c5e9", "#67e0e3", "#9fe6b8", "#ffdb5c", "#ff9f7f", "#fb7293", "#e062ae", "#e690d1", "#e7bcf3"] : 
        ["#00baff", "#4cc9ff", "#6fe3ff", "#8deaff", "#b2f2ff", "#d1f7ff"];
      
      this.config = {
        ...this.config,
        colors: barColors
      };
      this.themeKey++;
    }
  },
};
</script>
<style lang='scss' scoped>
.right_bottom {
  box-sizing: border-box;
  padding: 0 16px;
  display: flex;
  flex-direction: column;

  .workshop-rate {
    margin-top: 15px;
    padding: 10px;
    background: rgba(0, 186, 255, 0.1);
    border: 1px solid rgba(0, 186, 255, 0.3);
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .rate-label {
      font-size: 14px;
      color: #fff;
    }

    .rate-value {
      font-size: 20px;
      color: #00baff;
      font-weight: bold;
      text-shadow: 0 0 10px rgba(0, 186, 255, 0.5);
    }
  }

  &.light-chart {
    .workshop-rate {
      background: rgba(55, 162, 218, 0.1);
      border-color: rgba(55, 162, 218, 0.3);
      .rate-label { color: #333; }
      .rate-value { color: #37a2da; }
    }

    ::v-deep .dv-capsule-chart {
      rect {
        fill-opacity: 1 !important;
        opacity: 1 !important;
        filter: none !important;
      }
      .label-text, .unit-text {
        fill: #000000 !important;
        font-weight: 900 !important;
      }
    }
  }

  ::v-deep .dv-capsule-chart {
    rect {
      fill-opacity: 1 !important;
      opacity: 1 !important;
    }
  }
}
</style>

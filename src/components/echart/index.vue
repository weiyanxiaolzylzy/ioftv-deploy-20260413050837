<!--
 * @Author: daidai
 * @Date: 2022-02-28 16:29:08
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-09-27 15:05:45
 * @FilePath: \web-pc\src\pages\big-screen\components\echart\index.vue
-->
<template>
  <div :id="id" :class="className" :style="{ height: height, width: width }" />
</template>

<script>
import * as echarts from 'echarts';
export default {
  name: 'echart',
  props: {
    className: {
      type: String,
      default: 'chart'
    },
    id: {
      type: String,
      default: 'chart'
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '100%'
    },
    options: {
      type: Object,
      default: ()=>({})
    }
  },
  data () {
    return {
      chart: null,
      resizeHandler: null
    }
  },
  watch: {
    options: {
      handler (options) {
        if (!this.chart) return
        // 设置true清空echart缓存
        this.chart.setOption(options, true)
        this.$nextTick(() => {
          if (this.chart) this.chart.resize()
        })
      },
      deep: true
    }
  },
  mounted () {
    this.initChart();
    this.resizeHandler = () => {
      if (this.chart) this.chart.resize()
    }
    window.addEventListener('resize', this.resizeHandler)
    this.$nextTick(() => {
      if (this.chart) this.chart.resize()
      setTimeout(() => {
        if (this.chart) this.chart.resize()
      }, 300)
      setTimeout(() => {
        if (this.chart) this.chart.resize()
      }, 1000)
    })
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.resizeHandler)
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
  },
  methods: {
    initChart () {
      // 初始化echart
      this.chart = echarts.init(this.$el)
      this.chart.setOption(this.options, true)
      this.chart.resize()
    }
  }
}
</script>

<style>
</style>

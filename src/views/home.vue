<!--
 * @Author: daidai
 * @Date: 2022-01-12 14:23:32
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-09-09 14:47:24
 * @FilePath: \web-pc\src\pages\big-screen\view\home.vue
-->
<template>
  <!-- <div id="index" ref="appRef" class="index_home" :class="{ pageisScale: isScale }"> -->
  <ScaleScreen
    :width="1920"
    :height="1080"
    class="scale-wrap"
    :selfAdaption="selfAdaptionVal"
  >
    <div class="bg" :class="{ 'light-theme': isLightTheme }">
      <dv-loading v-if="loading">Loading...</dv-loading>
      <div v-else class="host-body">
        <!-- 头部 s -->
        <div class="d-flex jc-center title_wrap">
          <div class="zuojuxing"></div>
          <div class="youjuxing"></div>
          <div class="zuojuxing2"></div>
          <div class="guang"></div>
          <div class="d-flex jc-center">
            <div class="title">
              <img src="@/assets/img/logo/logo.png" class="header-logo" alt="Logo">
              <span class="title-text"
                >山西钢构科工钢结构数字孪生智能检测系统</span
              >
            </div>
          </div>
          <div class="timers">
            {{ dateYear }} {{ dateWeek }} {{ dateDay }}
          </div>
        </div>
        <!-- 头部 e-->
        <!-- 内容  s-->
        <router-view></router-view>
        <!-- 内容 e -->
      </div>
    </div>
  </ScaleScreen>
  <!-- </div> -->
</template>

<script>
import { formatTime } from "../utils/index.js";
import ScaleScreen from "@/components/scale-screen/scale-screen.vue";
export default {
  components: { ScaleScreen },
  data() {
    return {
      timing: null,
      loading: true,
      dateDay: null,
      dateYear: null,
      dateWeek: null,
      weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      isLightTheme: false, // 主题状态
    };
  },
  computed: {
    selfAdaptionVal() {
      try {
        const setting = this.$store && this.$store.state && this.$store.state.setting
        if (setting && typeof setting.isScale !== 'undefined') {
          return !!setting.isScale
        }
      } catch (e) {}
      return true
    }
  },
  filters: {
    numsFilter(msg) {
      return msg || 0;
    },
  },
  created() {
    // 读取主题设置
    const savedTheme = localStorage.getItem("themeMode");
    if (savedTheme === "light") {
      this.isLightTheme = true;
    }
  },
  mounted() {
    this.timeFn();
    this.cancelLoading();
    // 监听主题切换
    window.addEventListener("themeChange", this.handleThemeChange);
  },
  beforeDestroy() {
    clearInterval(this.timing);
    window.removeEventListener("themeChange", this.handleThemeChange);
  },
  methods: {
    handleThemeChange() {
      const savedTheme = localStorage.getItem("themeMode");
      this.isLightTheme = savedTheme === "light";
    },
    timeFn() {
      this.timing = setInterval(() => {
        this.dateDay = formatTime(new Date(), "HH: mm: ss");
        this.dateYear = formatTime(new Date(), "yyyy-MM-dd");
        this.dateWeek = this.weekday[new Date().getDay()];
      }, 1000);
    },
    cancelLoading() {
      let timer = setTimeout(() => {
        this.loading = false;
        clearTimeout(timer);
      }, 500);
    },
  },
};
</script>

<style lang="scss">
@import "./home.scss";
</style>

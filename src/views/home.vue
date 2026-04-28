<!--
 * @Author: daidai
 * @Date: 2022-01-12 14:23:32
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-09-09 14:47:24
 * @FilePath: \web-pc\src\pages\big-screen\view\home.vue
-->
<template>
  <div class="screen-shell">
    <div
      class="bg"
      :class="{
        'light-theme': isLightTheme,
        'steel-qc-theme': themeMode === 'steel-qc'
      }"
    >
      <dv-loading v-if="loading">Loading...</dv-loading>
      <div v-else class="host-body">
        <div class="d-flex jc-center title_wrap">
          <div class="zuojuxing"></div>
          <div class="youjuxing"></div>
          <div class="zuojuxing2"></div>
          <div class="guang"></div>
          <div v-if="showDashboardControls" class="title_controls">
            <div class="dashboard-controls">
              <div class="theme-toggle-btn" @click="toggleTheme" :title="themeHint">
                <span v-if="themeMode === 'light'">🌙</span>
                <span v-else-if="themeMode === 'steel-qc'">🏭</span>
                <span v-else>☀️</span>
              </div>
              <div class="version-toggle-btn" @click="toggleVersion">
                钢结构尺寸检测系统
              </div>
            </div>
          </div>
          <div class="d-flex jc-center title_main">
            <div class="title">
              <img src="@/assets/img/logo/logo.png" class="header-logo" alt="Logo">
              <span class="title-text"
                >山西钢构科工钢结构数字孪生智能检测系统</span
              >
            </div>
          </div>
          <div class="timers" :class="{ 'timers--standalone': !showDashboardControls }">
            {{ dateYear }} {{ dateWeek }} {{ dateDay }}
          </div>
        </div>

        <div class="dashboard-shell">
          <router-view v-slot="{ Component }">
            <component
              :is="Component"
              :theme-mode="themeMode"
            />
          </router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatTime } from "../utils/index.js";

export default {
  data() {
    return {
      timing: null,
      loading: true,
      dateDay: null,
      dateYear: null,
      dateWeek: null,
      themeMode: "dark",
      weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      isLightTheme: false, // 主题状态
    };
  },
  computed: {
    showDashboardControls() {
      return this.$route.name === "index";
    },
    themeHint() {
      if (this.themeMode === "dark") return "当前：深蓝科技风，点击切换亮色主题";
      if (this.themeMode === "light") return "当前：亮色主题，点击切换钢结构检测风";
      return "当前：钢结构检测风，点击切换深蓝科技风";
    },
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
      this.themeMode = savedTheme || "dark";
    },
    timeFn() {
      this.timing = setInterval(() => {
        this.dateDay = formatTime(new Date(), "HH: mm: ss");
        this.dateYear = formatTime(new Date(), "yyyy-MM-dd");
        this.dateWeek = this.weekday[new Date().getDay()];
      }, 1000);
    },
    toggleTheme() {
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
    toggleVersion() {
      this.$router.push("/secondview");
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

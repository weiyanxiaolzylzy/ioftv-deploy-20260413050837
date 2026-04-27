<template>
  <ScaleScreen
    :width="1920"
    :height="1080"
    class="scale-wrap"
    :selfAdaption="true"
  >
    <div class="second-view-container">
      <!-- 头部 s -->
      <div class="d-flex jc-center title_wrap">
        <div class="zuojuxing"></div>
        <div class="youjuxing"></div>
        <div class="guang"></div>
        
        <!-- 返回按钮 -->
        <div class="return-btn" @click="goBack">
          <span>🔙 返回主页</span>
        </div>

        <div class="d-flex jc-center">
          <div class="title">
            <span class="title-text">钢结构尺寸检测系统</span>
          </div>
        </div>
        <div class="timers">
          {{ dateYear }} {{ dateWeek }} {{ dateDay }}
        </div>
      </div>
      <!-- 头部 e-->

      <!-- 顶部导航栏 -->
      <div class="top-nav">
        <div class="nav-item" :class="{ active: currentTab === 'workspace' }" @click="currentTab = 'workspace'">
          <span>自动界面</span>
        </div>
        <div class="nav-item" :class="{ active: currentTab === 'params' }" @click="currentTab = 'params'">
          <span>测量值</span>
        </div>
        <div class="nav-item" :class="{ active: currentTab === 'results' }" @click="currentTab = 'results'">
          <span>结果</span>
        </div>
        <div class="nav-item" :class="{ active: currentTab === 'groups' }" @click="openGroupSettings">
          <span>班组设置</span>
        </div>
      </div>

      <div class="body-wrapper">
        <!-- 主内容区域 -->
        <div class="main-content">
          <!-- 工作台界面 -->
          <workspace-view v-if="currentTab === 'workspace'" :params="sharedParams" />

          <!-- 参数设置界面 -->
          <params-view v-if="currentTab === 'params'" :params="sharedParams" @update:params="updateParams" />

          <!-- 结果界面 -->
          <results-view v-if="currentTab === 'results'" />

          <!-- 班组设置界面 -->
          <group-settings-view v-if="currentTab === 'groups'" @close="currentTab = 'workspace'" />
        </div>
      </div>

      <!-- 班组选择浮窗（快速选择当前检测班组） -->
      <div class="quick-group-panel" v-if="currentTab !== 'groups'">
        <div class="quick-group-label">当前班组</div>
        <select v-model="currentGroupId" class="quick-group-select" @change="onQuickGroupChange">
          <option value="">-- 请选择 --</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
    </div>
  </ScaleScreen>
</template>

<script>
import WorkspaceView from './workspace-view.vue'
import ParamsView from './params-view.vue'
import ResultsView from './results-view.vue'
import GroupSettingsView from './group-settings-view.vue'
import ScaleScreen from "@/components/scale-screen/scale-screen.vue";
import { formatTime } from "../../utils/index.js";
import { getAuthHeaders, canEditFeature } from '@/utils'

export default {
  name: 'SecondView',
  components: {
    WorkspaceView,
    ParamsView,
    ResultsView,
    GroupSettingsView,
    ScaleScreen
  },
  data() {
    return {
      currentTab: 'workspace',
      dateDay: null,
      dateYear: null,
      dateWeek: null,
      weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      timing: null,
      sharedParams: {
        brightness: 128,
        contrast: 32,
        saturation: 100,
        colorTemp: 0,
        sharpness: 64,
        apertureRatio: 4600,
        fineCode: 120,
        virtualPoint: 10,
        projectionImage: 0,
        edgeLightFit: 1,
        openCloseDegree: 3,
        exposure: -6
      },
      // 班组相关
      groups: [],
      currentGroupId: '',
      currentGroupName: ''
    }
  },
  created() {
    // 接收从主界面传递过来的登录状态和Token
    const { userInfo, token } = this.$route.query;

    if (userInfo) {
      try {
        localStorage.setItem('userInfo', decodeURIComponent(userInfo));
      } catch (e) {
        console.error('Failed to parse userInfo from query params', e);
      }
    }

    if (token) {
      try {
        localStorage.setItem('token', decodeURIComponent(token));
      } catch (e) {
        console.error('Failed to parse token from query params', e);
      }
    }

    // 从 localStorage 恢复当前班组选择
    this.currentGroupId = localStorage.getItem('currentGroupId') || ''
    this.currentGroupName = localStorage.getItem('currentGroupName') || ''
  },
  mounted() {
    this.timeFn();
    this.fetchGroups();
  },
  beforeDestroy() {
    clearInterval(this.timing);
  },
  methods: {
    timeFn() {
      this.timing = setInterval(() => {
        this.dateDay = formatTime(new Date(), "HH: mm: ss");
        this.dateYear = formatTime(new Date(), "yyyy-MM-dd");
        this.dateWeek = this.weekday[new Date().getDay()];
      }, 1000);
    },
    updateParams(newParams) {
      this.sharedParams = { ...this.sharedParams, ...newParams }
    },
    goBack() {
      window.location.href = '/#/home/index'
    },
    openGroupSettings() {
      this.currentTab = 'groups'
      // 刷新班组列表
      this.fetchGroups()
    },
    async fetchGroups() {
      try {
        const response = await fetch('/api/groups', { headers: getAuthHeaders() });
        const data = await response.json();
        this.groups = Array.isArray(data) ? data : [];
        // 如果当前班组ID不存在于列表中，清除选择
        if (this.currentGroupId && !this.groups.find(g => String(g.id) === String(this.currentGroupId))) {
          this.currentGroupId = ''
          this.currentGroupName = ''
          localStorage.removeItem('currentGroupId')
          localStorage.removeItem('currentGroupName')
        }
      } catch (err) {
        console.error('获取班组列表失败', err);
      }
    },
    onQuickGroupChange() {
      const group = this.groups.find(g => String(g.id) === String(this.currentGroupId))
      if (group) {
        this.currentGroupName = group.name
        localStorage.setItem('currentGroupId', this.currentGroupId)
        localStorage.setItem('currentGroupName', this.currentGroupName)
      } else {
        this.currentGroupId = ''
        this.currentGroupName = ''
        localStorage.removeItem('currentGroupId')
        localStorage.removeItem('currentGroupName')
      }
      // 通知 workspace-view 当前班组变化
      if (this.$bus) {
        this.$bus.$emit('current-group-changed', {
          groupId: this.currentGroupId,
          groupName: this.currentGroupName
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.return-btn {
  position: absolute;
  left: 20px;
  top: 25px;
  font-size: 16px;
  cursor: pointer;
  color: #00d4ff;
  text-shadow: 0 0 5px rgba(0, 212, 255, 0.5);
  display: flex;
  align-items: center;
  z-index: 100;
  font-weight: bold;
  transition: all 0.3s;
  
  &:hover {
    color: #fff;
    text-shadow: 0 0 10px #00d4ff;
    transform: translateX(5px);
  }
}

.second-view-container {
  width: 1920px;
  height: 1080px;
  background: #051020;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-image: url("../../assets/img/pageBg.png");
  background-size: 100% 100%;
  background-position: center center;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.08) 0%, transparent 80%);
    pointer-events: none;
    z-index: 1;
  }
}

.body-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  z-index: 2;
}

.title_wrap {
  height: 50px;
  background-image: url("../../assets/img/top.png");
  background-size: cover;
  background-position: center center;
  position: relative;
  margin-bottom: 2px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;

  .guang {
    position: absolute;
    bottom: -20px;
    background-image: url("../../assets/img/guang.png");
    background-position: 80px center;
    width: 100%;
    height: 40px;
  }

  .zuojuxing,
  .youjuxing {
    position: absolute;
    top: -2px;
    width: 0px;
    height: 5px;
    background-image: url("../../assets/img/headers/juxing1.png");
    display: flex;
    flex-wrap: wrap;
  }

  .zuojuxing {
    left: 11%;
  }

  .youjuxing {
    right: 11%;
    transform: rotate(180deg);
  }

  .timers {
    position: absolute;
    right: 20px;
    top: 25px;
    font-size: 16px;
    display: flex;
    align-items: center;
    color: #00d4ff;
    text-shadow: 0 0 5px rgba(0, 212, 255, 0.5);
  }
}

.title {
  position: relative;
  text-align: center;
  background-size: cover;
  color: transparent;
  height: 50px;
  line-height: 40px;

  .title-text {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 5px;
    width: 100%;
    background: linear-gradient(92deg, #0072FF 0%, #00EAFF 48.8525390625%, #01AAFF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

.top-nav {
  height: 50px;
  background: rgba(15, 45, 85, 0.7);
  display: flex;
  padding: 0 30px;
  gap: 10px;
  border-bottom: 2px solid #00d4ff;
  box-shadow: 0 4px 15px rgba(0, 212, 255, 0.2);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  
  .nav-item {
    position: relative;
    padding: 0 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #4a90e2;
    font-size: 20px;
    transition: all 0.3s;
    font-weight: bold;
    letter-spacing: 2px;
    border-right: 1px solid rgba(0, 212, 255, 0.2);
    background: rgba(0, 212, 255, 0.1);
    
    &:last-child {
      border-right: none;
    }
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 30%;
      right: 30%;
      height: 2px;
      background: transparent;
      transition: all 0.3s;
    }
    
    &:hover {
      color: #00d4ff;
      background: rgba(0, 212, 255, 0.2);
      text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
      
      &::after {
        background: #00d4ff;
        left: 20%;
        right: 20%;
      }
    }
    
    &.active {
      color: #fff;
      background: rgba(0, 212, 255, 0.3);
      box-shadow: inset 0 0 20px rgba(0, 212, 255, 0.2);
      
      &::after {
        background: #00d4ff;
        left: 0;
        right: 0;
        height: 3px;
        box-shadow: 0 0 10px #00d4ff;
      }
    }
  }
}

.body-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

// 班组快速选择面板
.quick-group-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(15, 45, 85, 0.95);
  border: 2px solid #00d4ff;
  border-radius: 10px;
  padding: 12px 16px;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-group-label {
  color: #00d4ff;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
}

.quick-group-select {
  background: rgba(0, 40, 80, 0.8);
  border: 1px solid rgba(0, 212, 255, 0.5);
  border-radius: 6px;
  color: #fff;
  padding: 6px 12px;
  font-size: 14px;
  min-width: 140px;
  cursor: pointer;

  &:focus {
    border-color: #00d4ff;
    outline: none;
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
  }

  option {
    background: #0f2d55;
    color: #fff;
  }
}
</style>

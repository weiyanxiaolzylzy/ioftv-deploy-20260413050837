<!--
 * @Author: daidai
 * @Date: 2022-02-28 16:16:42
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-07-20 17:57:11
 * @FilePath: \web-pc\src\pages\big-screen\view\indexs\left-center.vue
-->
<template>
    <div ref="overviewContainer" class="user_Overview_container" :class="`is-${layoutMode}`">
        <div class="overview_toolbar">
            <div class="scope_toggle">
                <button class="scope_btn" :class="{ 'is-active': scope === 'all' }" @click="scope = 'all'">总项目</button>
                <button class="scope_btn" :class="{ 'is-active': scope === 'single' }" @click="scope = 'single'">单项目</button>
            </div>
            <select v-if="scope === 'single'" v-model="selectedProjectId" class="project_select">
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
        </div>
        <ul class="user_Overview user_Overview--grid" :class="{ 'is-single': scope === 'single' }">
            <li v-if="scope === 'all'" class="user_Overview-item" style="color: #00fdfa">
                <div v-if="scope === 'all'" class="user_Overview_nums allnum bgdonghua">
                    <dv-digital-flop :config="projectConfig" style="width:100%;height:100%;" />
                </div>
                <div v-if="scope === 'all'" class="metric_label">
                    <span class="metric_label__line">项目</span>
                    <span class="metric_label__line">数量</span>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #07f7a8">
                <div class="user_Overview_nums online bgdonghua">
                    <dv-digital-flop :config="detectedConfig" style="width:100%;height:100%;" />
                </div>
                <div class="metric_label">
                    <span class="metric_label__line">已检测</span>
                    <span class="metric_label__line">构件数量</span>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #e3b337">
                <div class="user_Overview_nums offline bgdonghua">
                    <dv-digital-flop :config="firstPassCountConfig" style="width:100%;height:100%;" />
                </div>
                <div class="metric_label">
                    <span class="metric_label__line">一次装配</span>
                    <span class="metric_label__line">合格数量</span>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #f56c6c">
                <div class="user_Overview_nums passRate bgdonghua">
                    <dv-digital-flop :config="passRateConfig" style="width:100%;height:100%;" />
                </div>
                <div class="metric_label">
                    <span class="metric_label__line">一次装配</span>
                    <span class="metric_label__line">合格率</span>
                </div>
            </li>
        </ul>
    </div>
</template>

<script>
import { getAuthHeaders } from '@/utils'
let style = {
    fontSize: 32,
    fontWeight: 900,
    fill: '#fff'
}
export default {
    data() {
        return {
            scope: 'all',
            selectedProjectId: '',
            projects: [],
            statisticsByProject: {},
            layoutMode: 'regular',
            metricFontSize: 32,
            resizeObserver: null,
            usingWindowResizeFallback: false,
            projectConfig: {
                number: [0],
                content: '{nt}',
                style: {
                    ...style,
                    fill: "#00baff",
                },
            },
            detectedConfig: {
                number: [0],
                content: '{nt}',
                style: {
                    ...style,
                    fill: "#07f7a8",
                },
            },
            firstPassCountConfig: {
                number: [0],
                content: '{nt}',
                style: {
                    ...style,
                    fill: "#e3b337",
                },
            },
            passRateConfig: {
                number: [0],
                content: '{nt}%',
                style: {
                    ...style,
                    fill: "#00baff",
                },
            }
        };
    },
    computed: {
        displayProjectName() {
            if (this.scope !== 'single') return '';
            const p = this.projects.find(x => String(x.id) === String(this.selectedProjectId));
            return (p && p.name) ? p.name : '—';
        }
    },
  created() {
    this.loadProjects();
    if (this.$bus) {
      this.$bus.$on('project-change', this.onProjectChange);
      this.$bus.$on('project-list-update', this.onProjectListUpdate);
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.setupResponsiveLayout();
    });
  },
  beforeDestroy() {
    if (this.$bus) {
      this.$bus.$off('project-change', this.onProjectChange);
      this.$bus.$off('project-list-update', this.onProjectListUpdate);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.usingWindowResizeFallback) {
      window.removeEventListener('resize', this.updateResponsiveLayout);
      this.usingWindowResizeFallback = false;
    }
  },
    watch: {
    scope() {
      if (this.scope === 'single' && !this.selectedProjectId) {
        this.selectedProjectId = this.projects[0] ? this.projects[0].id : '';
      }
      this.refreshConfigs().catch(() => {});
    },
    selectedProjectId() {
      this.refreshConfigs().catch(() => {});
    }
  },
  methods: {
    async loadProjects() {
      try {
        const res = await fetch('/api/projects', { headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.success && Array.isArray(data.data)) {
          this.projects = data.data;
          const aid = data.activeProjectId || '';
          const nextSelectedId = aid || (this.projects[0] ? this.projects[0].id : '');
          this.selectedProjectId = nextSelectedId || '';
          await this.refreshProjectStatistics();
          await this.refreshConfigs();
          return;
        }
      } catch (e) { /* ignore */ }
      this.projects = [];
      this.selectedProjectId = '';
      await this.refreshProjectStatistics();
      await this.refreshConfigs();
    },
    async fetchStatisticsSummary(projectId) {
      if (!projectId) return null;
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/statistics-summary`, { headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.success && data.data) {
          return data.data;
        }
      } catch (e) { /* ignore */ }
      return null;
    },
    async refreshProjectStatistics() {
      const statsMap = {};
      const projectIds = new Set((this.projects || []).map((project) => String(project && project.id != null ? project.id : '')).filter(Boolean));
      if (this.selectedProjectId && !projectIds.has(String(this.selectedProjectId))) {
        this.selectedProjectId = this.projects[0] ? this.projects[0].id : '';
      }
      for (const project of (this.projects || [])) {
        const pid = project && project.id != null ? String(project.id) : '';
        if (!pid) continue;
        const summary = await this.fetchStatisticsSummary(pid);
        if (summary) statsMap[pid] = summary;
      }
      this.statisticsByProject = statsMap;
    },
    setupResponsiveLayout() {
      this.updateResponsiveLayout();
      if (typeof ResizeObserver === 'function' && this.$refs.overviewContainer) {
        this.resizeObserver = new ResizeObserver(() => {
          this.updateResponsiveLayout();
        });
        this.resizeObserver.observe(this.$refs.overviewContainer);
        return;
      }
      window.addEventListener('resize', this.updateResponsiveLayout);
      this.usingWindowResizeFallback = true;
    },
    updateResponsiveLayout() {
      const container = this.$refs.overviewContainer;
      if (!container) return;
      const width = container.clientWidth || 0;
      const height = container.clientHeight || 0;

      let nextMode = 'regular';
      if (width < 330 || height < 210) {
        nextMode = 'tight';
      } else if (width < 420 || height < 255) {
        nextMode = 'compact';
      }

      const nextFontSize = nextMode === 'tight' ? 18 : nextMode === 'compact' ? 22 : 28;
      const modeChanged = this.layoutMode !== nextMode;
      const fontChanged = this.metricFontSize !== nextFontSize;

      if (!modeChanged && !fontChanged) return;

      this.layoutMode = nextMode;
      this.metricFontSize = nextFontSize;
      this.refreshConfigs();
    },
    buildFlopConfig(number, fill, suffix = '') {
      return {
        number: [number],
        content: `{nt}${suffix}`,
        style: {
          ...style,
          fontSize: this.metricFontSize,
          fill,
        },
      };
    },
    setMetricConfig(type, number) {
      switch (type) {
        case 'project':
          this.projectConfig = this.buildFlopConfig(number, '#00baff');
          break;
        case 'detected':
          this.detectedConfig = this.buildFlopConfig(number, '#07f7a8');
          break;
        case 'firstPass':
          this.firstPassCountConfig = this.buildFlopConfig(number, '#e3b337');
          break;
        case 'passRate':
          this.passRateConfig = this.buildFlopConfig(number, '#00baff', '%');
          break;
      }
    },
    onProjectListUpdate(projects) {
      if (Array.isArray(projects)) {
        this.projects = projects;
      } else {
        this.loadProjects();
        return;
      }
      if (this.scope === 'single' && this.selectedProjectId) {
        const exists = this.projects.some(p => String(p.id) === String(this.selectedProjectId));
        if (!exists) this.selectedProjectId = this.projects[0] ? this.projects[0].id : '';
      }
      this.refreshProjectStatistics().then(() => this.refreshConfigs()).catch(() => {});
    },
    onProjectChange(project) {
      if (this.scope !== 'single') return;
      if (project && project.id != null) {
        this.selectedProjectId = project.id;
      } else if (!this.selectedProjectId) {
        this.selectedProjectId = this.projects[0] ? this.projects[0].id : '';
      }
    },
    getStats() {
      const num = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      if (this.scope === 'single') {
        const p = this.projects.find(x => String(x.id) === String(this.selectedProjectId));
        if (!p) return { projectCount: 0, inspectedCount: 0, qualifiedCount: 0, rate: 0 };
        const summary = this.statisticsByProject[String(p.id)] || null;
        const inspected = num(summary ? summary.inspected_count : p.inspectedCount);
        const qualified = num(summary ? summary.qualified_count : p.qualifiedCount);
        const rate = inspected > 0 ? parseFloat(((qualified / inspected) * 100).toFixed(1)) : 0;
        return { projectCount: 0, inspectedCount: inspected, qualifiedCount: qualified, rate };
      }
      const inspectedCount = this.projects.reduce((acc, p) => {
        const summary = this.statisticsByProject[String(p.id)] || null;
        return acc + num(summary ? summary.inspected_count : p.inspectedCount);
      }, 0);
      const qualifiedCount = this.projects.reduce((acc, p) => {
        const summary = this.statisticsByProject[String(p.id)] || null;
        return acc + num(summary ? summary.qualified_count : p.qualifiedCount);
      }, 0);
      const rate = inspectedCount > 0 ? parseFloat(((qualifiedCount / inspectedCount) * 100).toFixed(1)) : 0;
      return { projectCount: this.projects.length, inspectedCount, qualifiedCount, rate };
    },
    async refreshConfigs() {
      const stats = this.getStats();
      this.setMetricConfig('project', stats.projectCount);
      this.setMetricConfig('detected', stats.inspectedCount);
      this.setMetricConfig('firstPass', stats.qualifiedCount);
      this.setMetricConfig('passRate', stats.rate);
    }
        }
};
</script>

<style lang='scss' scoped>
.user_Overview_container {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 6px 4px 4px;
    box-sizing: border-box;
    gap: 6px;
    overflow: hidden;
}

.overview_toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 2px;
    flex-shrink: 0;
}

.scope_toggle {
    display: inline-flex;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(0, 186, 255, 0.25);
    background: rgba(0, 186, 255, 0.10);
    backdrop-filter: blur(6px);
}

.scope_btn {
    appearance: none;
    border: 0;
    padding: 5px 10px;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;

    &.is-active {
        background: linear-gradient(135deg, rgba(0, 234, 255, 0.35), rgba(0, 114, 255, 0.25));
        color: #ffffff;
    }
}

.project_select {
    height: 28px;
    max-width: 190px;
    flex: 1 1 150px;
    min-width: 0;
    padding: 0 8px;
    border-radius: 8px;
    border: 1px solid rgba(0, 186, 255, 0.25);
    background: rgba(0, 20, 40, 0.55);
    color: rgba(255, 255, 255, 0.92);
    font-size: 12px;
    outline: none;
}

.user_Overview {
    margin: 0;
    padding: 0;
    list-style: none;
    flex: 1;
    min-height: 0;

    &--grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        grid-template-rows: minmax(0, 1fr);
        gap: 6px;
        align-items: stretch;
        min-height: 0;

        &.is-single {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }
    
    li {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2px 4px;
        gap: 8px;
        cursor: pointer;
        transition: transform 0.2s;
        min-width: 0;
        min-height: 0;
        overflow: hidden;

        &:hover {
            transform: scale(1.03);
        }

        .metric_label {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 2px;
            flex: 0 1 auto;
            min-width: 0;
            max-width: none;
            margin: 0;
        }

        .metric_label__line {
            display: block;
            text-align: center;
            line-height: 1.15;
            font-size: clamp(11px, 0.8vw, 16px);
            font-weight: 900;
            color: rgba(255, 255, 255, 0.98);
            letter-spacing: 0.8px;
            word-break: keep-all;
            white-space: nowrap;
            text-shadow:
                0 0 2px rgba(0, 0, 0, 0.9),
                0 3px 6px rgba(0, 0, 0, 0.75),
                0 0 20px rgba(0, 0, 0, 0.5);
        }

        .user_Overview_nums {
            width: clamp(56px, 3.4vw, 76px);
            height: clamp(56px, 3.4vw, 76px);
            flex-shrink: 0;
            text-align: center;
            line-height: 1;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;

            &::before {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
                background-size: 100% 100%;
            }

            &.bgdonghua::before {
                animation: rotating 14s linear infinite;
            }
        }
        
        .project_name_card {
            width: min(100%, 150px);
            height: clamp(56px, 3.4vw, 76px);
            max-width: 100%;
            border-radius: 14px;
            padding: 6px 8px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            background:
                radial-gradient(110px 70px at 12% 20%, rgba(0, 234, 255, 0.22), rgba(0, 234, 255, 0) 60%),
                radial-gradient(140px 90px at 82% 88%, rgba(0, 114, 255, 0.20), rgba(0, 114, 255, 0) 62%),
                linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
            border: 1px solid rgba(0, 234, 255, 0.20);
            box-shadow:
                0 10px 22px rgba(0, 0, 0, 0.22),
                inset 0 1px 0 rgba(255, 255, 255, 0.10);
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 6px;
            cursor: default;

            &::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: linear-gradient(180deg, rgba(0, 234, 255, 0.8), rgba(0, 114, 255, 0.35));
                box-shadow: 0 0 12px rgba(0, 234, 255, 0.35);
            }

            &__chip {
                width: fit-content;
                padding: 3px 8px;
                border-radius: 999px;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.5px;
                color: rgba(255, 255, 255, 0.92);
                background: rgba(0, 234, 255, 0.10);
                border: 1px solid rgba(0, 234, 255, 0.22);
                backdrop-filter: blur(6px);
                margin-left: 3px;
            }

            &__name {
                font-size: clamp(12px, 0.9vw, 16px);
                font-weight: 900;
                letter-spacing: 0.5px;
                line-height: 1.15;
                color: rgba(255, 255, 255, 0.96);
                text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 0, 0, 0.3);
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                margin-left: 3px;
            }
        }


        .allnum {
            &::before {
                background-image: url("../../assets/img/left_top_lan.png");
            }
        }

        .online {
            &::before {
                background-image: url("../../assets/img/left_top_lv.png");
            }
        }

        .offline {
            &::before {
                background-image: url("../../assets/img/left_top_huang.png");
            }
        }
        
        .passRate {
            &::before {
                background-image: url("../../assets/img/left_top_lan.png");
                filter: hue-rotate(300deg);
            }
        }
    }
}

.user_Overview_container.is-compact {
    gap: 5px;

    .scope_btn {
        padding: 4px 8px;
        font-size: 11px;
        letter-spacing: 0.5px;
    }

    .project_select {
        height: 26px;
        max-width: 160px;
        font-size: 11px;
    }

    .user_Overview--grid {
        gap: 5px;
    }

    .user_Overview li {
        gap: 5px;
        padding: 1px 2px;
    }

    .user_Overview .metric_label {
        gap: 1px;
    }

    .user_Overview .metric_label__line {
        font-size: 11px;
        line-height: 1.08;
        letter-spacing: 0.5px;
    }

    .user_Overview .user_Overview_nums {
        width: 52px;
        height: 52px;
    }

    .user_Overview .project_name_card {
        width: min(100%, 120px);
        height: 52px;
        padding: 5px 7px;
        gap: 4px;
        border-radius: 12px;
    }

    .user_Overview .project_name_card__chip {
        padding: 2px 6px;
        font-size: 9px;
    }

    .user_Overview .project_name_card__name {
        font-size: 11px;
        line-height: 1.08;
    }
}

.user_Overview_container.is-tight {
    gap: 4px;

    .overview_toolbar {
        gap: 4px;
    }

    .scope_toggle {
        width: 100%;
        justify-content: center;
    }

    .scope_btn {
        flex: 1 1 0;
        padding: 4px 6px;
        font-size: 11px;
        letter-spacing: 0.4px;
    }

    .project_select {
        width: 100%;
        max-width: none;
        height: 26px;
        font-size: 11px;
    }

    .user_Overview--grid {
        gap: 4px;
    }

    .user_Overview li {
        justify-content: center;
        align-items: center;
        gap: 4px;
        padding: 0 1px;

        &:hover {
            transform: none;
        }
    }

    .user_Overview .metric_label {
        align-items: center;
        text-align: center;
        gap: 1px;
    }

    .user_Overview .metric_label__line {
        text-align: center;
        font-size: 11px;
        line-height: 1.05;
        letter-spacing: 0.3px;
    }

    .user_Overview .user_Overview_nums {
        width: 46px;
        height: 46px;
    }

    .user_Overview .project_name_card {
        width: min(100%, 104px);
        height: 46px;
        padding: 4px 6px;
        gap: 3px;
        border-radius: 10px;
    }

    .user_Overview .project_name_card::before {
        width: 2px;
    }

    .user_Overview .project_name_card__chip {
        padding: 2px 5px;
        font-size: 8px;
        margin-left: 2px;
    }

    .user_Overview .project_name_card__name {
        margin-left: 2px;
        font-size: 10px;
        line-height: 1.05;
        -webkit-line-clamp: 2;
    }
}

@keyframes rotating {
    0% {
        transform: rotate(0);
    }
    100% {
        transform: rotate(360deg);
    }
}

</style>

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
                <div v-if="scope === 'all'" class="metric_orbit metric_orbit--cyan">
                    <div class="metric_orbit__badge">
                        <div class="metric_orbit__value-wrap">
                            <div
                                :ref="'metricValue-project'"
                                :class="['metric_orbit__value', metricValueClass(metricValues.project)]"
                                :style="metricValueStyle('project')"
                            ><span class="metric_orbit__value-main">{{ metricDisplayParts(metricValues.project).main }}</span><span v-if="metricDisplayParts(metricValues.project).suffix" class="metric_orbit__value-suffix">{{ metricDisplayParts(metricValues.project).suffix }}</span></div>
                        </div>
                        <div class="metric_orbit__badge-core"></div>
                    </div>
                    <div class="metric_orbit__label">
                        <span class="metric_orbit__line">已检测项目</span>
                        <span class="metric_orbit__line">数量</span>
                    </div>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #07f7a8">
                <div class="metric_orbit metric_orbit--green">
                    <div class="metric_orbit__badge">
                        <div class="metric_orbit__value-wrap">
                            <div
                                :ref="'metricValue-detected'"
                                :class="['metric_orbit__value', metricValueClass(metricValues.detected)]"
                                :style="metricValueStyle('detected')"
                            ><span class="metric_orbit__value-main">{{ metricDisplayParts(metricValues.detected).main }}</span><span v-if="metricDisplayParts(metricValues.detected).suffix" class="metric_orbit__value-suffix">{{ metricDisplayParts(metricValues.detected).suffix }}</span></div>
                        </div>
                        <div class="metric_orbit__badge-core"></div>
                    </div>
                    <div class="metric_orbit__label">
                        <span class="metric_orbit__line">已检测</span>
                        <span class="metric_orbit__line">构件数量</span>
                    </div>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #e3b337">
                <div class="metric_orbit metric_orbit--amber">
                    <div class="metric_orbit__badge">
                        <div class="metric_orbit__value-wrap">
                            <div
                                :ref="'metricValue-firstPass'"
                                :class="['metric_orbit__value', metricValueClass(metricValues.firstPass)]"
                                :style="metricValueStyle('firstPass')"
                            ><span class="metric_orbit__value-main">{{ metricDisplayParts(metricValues.firstPass).main }}</span><span v-if="metricDisplayParts(metricValues.firstPass).suffix" class="metric_orbit__value-suffix">{{ metricDisplayParts(metricValues.firstPass).suffix }}</span></div>
                        </div>
                        <div class="metric_orbit__badge-core"></div>
                    </div>
                    <div class="metric_orbit__label">
                        <span class="metric_orbit__line">一次装配</span>
                        <span class="metric_orbit__line">合格数量</span>
                    </div>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #f56c6c">
                <div class="metric_orbit metric_orbit--lime">
                    <div class="metric_orbit__badge">
                        <div class="metric_orbit__value-wrap">
                            <div
                                :ref="'metricValue-passRate'"
                                :class="['metric_orbit__value', metricValueClass(metricValues.passRate)]"
                                :style="metricValueStyle('passRate')"
                            ><span class="metric_orbit__value-main">{{ metricDisplayParts(metricValues.passRate).main }}</span><span v-if="metricDisplayParts(metricValues.passRate).suffix" class="metric_orbit__value-suffix">{{ metricDisplayParts(metricValues.passRate).suffix }}</span></div>
                        </div>
                        <div class="metric_orbit__badge-core"></div>
                    </div>
                    <div class="metric_orbit__label">
                        <span class="metric_orbit__line">一次装配</span>
                        <span class="metric_orbit__line">合格率</span>
                    </div>
                </div>
            </li>
        </ul>
    </div>
</template>

<script>
import { getAuthHeaders } from '@/utils'
export default {
    data() {
        return {
            scope: 'all',
            selectedProjectId: '',
            projects: [],
            statisticsByProject: {},
            layoutMode: 'regular',
            resizeObserver: null,
            usingWindowResizeFallback: false,
            metricValues: {
                project: '0',
                detected: '0',
                firstPass: '0',
                passRate: '0%'
            },
            metricScaleMap: {
                project: 1,
                detected: 1,
                firstPass: 1,
                passRate: 1
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
      this.scheduleMetricScaleUpdate();
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

      const modeChanged = this.layoutMode !== nextMode;

      if (!modeChanged) return;

      this.layoutMode = nextMode;
      this.refreshConfigs();
      this.scheduleMetricScaleUpdate();
    },
    setMetricValue(type, number, suffix = '') {
      this.metricValues = {
        ...this.metricValues,
        [type]: `${number}${suffix}`
      };
    },
    metricValueStyle(type) {
      const scale = this.metricScaleMap[type] || 1;
      return {
        transform: `scale(${scale})`,
        transformOrigin: 'center center'
      };
    },
    metricDisplayParts(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return { main: '', suffix: '' };
      if (text.endsWith('%')) {
        return {
          main: text.slice(0, -1),
          suffix: '%'
        };
      }
      return { main: text, suffix: '' };
    },
    metricValueClass(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return 'is-short';
      if (text.length >= 7) return 'is-xlong';
      if (text.length >= 5) return 'is-long';
      if (text.length >= 3) return 'is-medium';
      return 'is-short';
    },
    scheduleMetricScaleUpdate() {
      this.$nextTick(() => {
        this.updateMetricScales();
      });
    },
    updateMetricScales() {
      const nextScaleMap = { ...this.metricScaleMap };
      ['project', 'detected', 'firstPass', 'passRate'].forEach((type) => {
        const node = this.$refs[`metricValue-${type}`];
        const el = Array.isArray(node) ? node[0] : node;
        if (!el || !el.parentElement) return;
        const safeWidth = Math.max((el.parentElement.clientWidth || 0) - 12, 20);
        const textWidth = el.scrollWidth || el.getBoundingClientRect().width || 0;
        if (!safeWidth || !textWidth) {
          nextScaleMap[type] = 1;
          return;
        }
        const rawScale = safeWidth / textWidth;
        nextScaleMap[type] = Math.max(Math.min(rawScale, 1), 0.68);
      });
      this.metricScaleMap = nextScaleMap;
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
      this.setMetricValue('project', stats.projectCount);
      this.setMetricValue('detected', stats.inspectedCount);
      this.setMetricValue('firstPass', stats.qualifiedCount);
      this.setMetricValue('passRate', stats.rate, '%');
      this.scheduleMetricScaleUpdate();
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
    padding: 4px 3px 2px;
    box-sizing: border-box;
    gap: 4px;
    overflow: hidden;
}

.overview_toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px;
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
        gap: 4px;
        align-items: stretch;
        min-height: 0;

        &.is-single {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }
    
    li {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        cursor: pointer;
        transition: transform 0.2s;
        min-width: 0;
        min-height: 0;
        overflow: hidden;

        &:hover {
            transform: scale(1.03);
        }

        .metric_orbit {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 98px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 4px 2px 6px;
            box-sizing: border-box;
        }

        .metric_orbit__badge {
            position: relative;
            width: min(100%, 72px);
            aspect-ratio: 1;
            border-radius: 50%;
            border: 2px solid currentColor;
            background: transparent;
            box-shadow:
                0 0 10px rgba(0, 0, 0, 0.18),
                inset 0 0 18px rgba(0, 0, 0, 0.26);
        }

        .metric_orbit__badge::before {
            content: '';
            position: absolute;
            inset: 7px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.20);
        }

        .metric_orbit__badge-core {
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            border: 1px dashed rgba(255, 255, 255, 0.18);
            opacity: 0.65;
        }

        .metric_orbit__value-wrap {
            position: absolute;
            inset: 0;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
            box-sizing: border-box;
        }

        .metric_orbit__value {
            display: inline-flex;
            align-items: flex-start;
            justify-content: center;
            width: auto;
            max-width: 100%;
            line-height: 1;
            white-space: nowrap;
            overflow: visible;
            font-weight: 900;
            font-variant-numeric: tabular-nums;
            letter-spacing: -0.04em;
            color: currentColor;
            text-shadow:
                0 0 8px rgba(0, 0, 0, 0.55),
                0 0 12px rgba(15, 255, 195, 0.2);
        }

        .metric_orbit__value-main,
        .metric_orbit__value-suffix {
            display: inline-block;
            vertical-align: baseline;
        }

        .metric_orbit__value-suffix {
            font-size: 0.72em;
            line-height: 1;
            margin-left: 1px;
            transform: translateY(0.02em);
            opacity: 0.92;
        }

        .metric_orbit__label {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            min-height: 32px;
        }

        .metric_orbit__line {
            display: block;
            text-align: center;
            line-height: 1.1;
            font-size: clamp(11px, 0.8vw, 16px);
            font-size: clamp(10px, 0.72vw, 15px);
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

        .metric_orbit--cyan {
            color: #16e3ff;
        }

        .metric_orbit--green {
            color: #20ffb9;
        }

        .metric_orbit--amber {
            color: #ffb624;
        }

        .metric_orbit--lime {
            color: #4eff63;
        }

        .metric_orbit__value.is-short {
            font-size: clamp(22px, 2.1vw, 32px);
        }

        .metric_orbit__value.is-medium {
            font-size: clamp(18px, 1.8vw, 28px);
        }

        .metric_orbit__value.is-long {
            font-size: clamp(15px, 1.45vw, 22px);
        }

        .metric_orbit__value.is-xlong {
            font-size: clamp(12px, 1.1vw, 16px);
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
        padding: 1px 2px;
    }

    .user_Overview .metric_orbit {
        min-height: 98px;
        gap: 5px;
        padding: 6px 2px 8px;
    }

    .user_Overview .metric_orbit__value.is-short {
        font-size: 26px;
    }

    .user_Overview .metric_orbit__value.is-medium {
        font-size: 22px;
    }

    .user_Overview .metric_orbit__value.is-long {
        font-size: 18px;
    }

    .user_Overview .metric_orbit__value.is-xlong {
        font-size: 14px;
    }

    .user_Overview .metric_orbit__badge {
        width: min(100%, 64px);
    }

    .user_Overview .metric_orbit__badge::before {
        inset: 6px;
    }

    .user_Overview .metric_orbit__label {
        min-height: 32px;
    }

    .user_Overview .metric_orbit__line {
        font-size: 11px;
        line-height: 1.08;
        letter-spacing: 0.5px;
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
        padding: 0 1px;

        &:hover {
            transform: none;
        }
    }

    .user_Overview .metric_orbit {
        min-height: 84px;
        gap: 4px;
        padding: 4px 1px 6px;
    }

    .user_Overview .metric_orbit__value-wrap {
        min-height: 28px;
    }

    .user_Overview .metric_orbit__value.is-short {
        font-size: 20px;
    }

    .user_Overview .metric_orbit__value.is-medium {
        font-size: 17px;
    }

    .user_Overview .metric_orbit__value.is-long {
        font-size: 14px;
    }

    .user_Overview .metric_orbit__value.is-xlong {
        font-size: 11px;
    }

    .user_Overview .metric_orbit__badge {
        width: min(100%, 52px);
    }

    .user_Overview .metric_orbit__badge::before {
        inset: 4px;
    }

    .user_Overview .metric_orbit__label {
        min-height: 26px;
        gap: 1px;
    }

    .user_Overview .metric_orbit__line {
        font-size: 11px;
        line-height: 1.05;
        letter-spacing: 0.3px;
    }
}

</style>

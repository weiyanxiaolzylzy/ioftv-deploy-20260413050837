<!--
 * @Author: daidai
 * @Date: 2022-02-28 16:16:42
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-07-20 17:57:11
 * @FilePath: \web-pc\src\pages\big-screen\view\indexs\left-center.vue
-->
<template>
    <div class="user_Overview_container">
        <div class="overview_toolbar">
            <div class="scope_toggle">
                <button class="scope_btn" :class="{ 'is-active': scope === 'all' }" @click="scope = 'all'">总项目</button>
                <button class="scope_btn" :class="{ 'is-active': scope === 'single' }" @click="scope = 'single'">单项目</button>
            </div>
            <select v-if="scope === 'single'" v-model="selectedProjectId" class="project_select">
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
        </div>
        <ul class="user_Overview user_Overview--grid">
            <li class="user_Overview-item" style="color: #00fdfa" @click="scope === 'all' && openEditModal('project')">
                <div v-if="scope === 'all'" class="user_Overview_nums allnum bgdonghua">
                    <dv-digital-flop :config="projectConfig" style="width:100%;height:100%;" />
                </div>
                <div v-else class="project_name_card" :title="displayProjectName">
                    <div class="project_name_card__chip">当前项目</div>
                    <div class="project_name_card__name">{{ displayProjectName }}</div>
                </div>
                <div v-if="scope === 'all'" class="metric_label">
                    <span class="metric_label__line">项目</span>
                    <span class="metric_label__line">数量</span>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #07f7a8" @click="openEditModal('detected')">
                <div class="user_Overview_nums online bgdonghua">
                    <dv-digital-flop :config="detectedConfig" style="width:100%;height:100%;" />
                </div>
                <div class="metric_label">
                    <span class="metric_label__line">已检测构件</span>
                    <span class="metric_label__line">数量</span>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #e3b337" @click="openEditModal('firstPass')">
                <div class="user_Overview_nums offline bgdonghua">
                    <dv-digital-flop :config="firstPassCountConfig" style="width:100%;height:100%;" />
                </div>
                <div class="metric_label">
                    <span class="metric_label__line">一次装配</span>
                    <span class="metric_label__line">合格数量</span>
                </div>
            </li>
            <li class="user_Overview-item" style="color: #f56c6c" @click="openEditModal('passRate')">
                <div class="user_Overview_nums user_Overview_nums--ring passRate">
                    <svg class="pass_rate_ring" viewBox="0 0 120 120" aria-hidden="true">
                        <circle class="pass_rate_ring__bg" cx="60" cy="60" :r="passRateRadius" />
                        <circle
                            class="pass_rate_ring__bar"
                            cx="60"
                            cy="60"
                            :r="passRateRadius"
                            :stroke-dasharray="passRateCircumference"
                            :stroke-dashoffset="passRateDashoffset"
                        />
                        <text class="pass_rate_ring__value" x="60" y="60">{{ formattedPassRate }}</text>
                    </svg>
                </div>
                <div class="metric_label">
                    <span class="metric_label__line">一次</span>
                    <span class="metric_label__line">合格率</span>
                </div>
            </li>
        </ul>

        <!-- Edit Modal -->
        <div v-if="showModal" class="edit-modal">
                <div class="modal-content">
                    <h3>修改{{ currentEditLabel }}</h3>
                    <input type="number" v-model.number="editValue" class="modal-input" step="0.1" />
                    <div class="modal-actions">
                        <button @click="closeModal" class="cancel-btn">取消</button>
                        <button @click="saveEdit" class="save-btn">保存</button>
                    </div>
                </div>
            </div>
    </div>
</template>

<script>
let style = {
    fontSize: 32,
    fontWeight: 900,
    fill: '#fff'
}
export default {
    data() {
        return {
            showModal: false,
            currentEditType: '',
            editValue: 0,
            scope: 'all',
            selectedProjectId: '',
            projects: [],
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
        passRateRadius() {
            return 46;
        },
        passRateCircumference() {
            return 2 * Math.PI * this.passRateRadius;
        },
        passRateDashoffset() {
            const ratio = Math.min(Math.max(this.getStats().rate, 0), 100) / 100;
            return this.passRateCircumference * (1 - ratio);
        },
        formattedPassRate() {
            return `${this.getStats().rate}%`;
        },
        displayProjectName() {
            if (this.scope !== 'single') return '';
            const p = this.projects.find(x => String(x.id) === String(this.selectedProjectId));
            return (p && p.name) ? p.name : '—';
        },
        currentEditLabel() {
            switch(this.currentEditType) {
                case 'project': return '项目数';
                case 'detected': return '已检测构件数量';
                case 'firstPass': return '一次装配合格数量';
                case 'passRate': return '合格率';
                default: return '';
            }
        }
    },
  created() {
    this.loadProjectsFromStorage();
    if (!this.selectedProjectId) {
      const aid = localStorage.getItem('cm_activeId') || '';
      this.selectedProjectId = aid || (this.projects[0] ? this.projects[0].id : '');
    }
    this.refreshConfigs();
    if (this.$bus) {
      this.$bus.$on('project-change', this.onProjectChange);
      this.$bus.$on('project-list-update', this.onProjectListUpdate);
    }
  },
  beforeDestroy() {
    if (this.$bus) {
      this.$bus.$off('project-change', this.onProjectChange);
      this.$bus.$off('project-list-update', this.onProjectListUpdate);
    }
  },
  watch: {
    scope() {
      if (this.scope === 'single' && !this.selectedProjectId) {
        const aid = localStorage.getItem('cm_activeId') || '';
        this.selectedProjectId = aid || (this.projects[0] ? this.projects[0].id : '');
      }
      this.refreshConfigs();
    },
    selectedProjectId() {
      this.refreshConfigs();
    }
  },
  methods: {
    onProjectListUpdate(projects) {
      if (Array.isArray(projects)) {
        this.projects = projects;
      } else {
        this.loadProjectsFromStorage();
      }
      if (this.scope === 'single' && this.selectedProjectId) {
        const exists = this.projects.some(p => String(p.id) === String(this.selectedProjectId));
        if (!exists) this.selectedProjectId = this.projects[0] ? this.projects[0].id : '';
      }
      this.refreshConfigs();
    },
    onProjectChange(project) {
      if (this.scope !== 'single') return;
      if (project && project.id != null) {
        this.selectedProjectId = project.id;
      } else if (!this.selectedProjectId) {
        const aid = localStorage.getItem('cm_activeId') || '';
        this.selectedProjectId = aid || (this.projects[0] ? this.projects[0].id : '');
      }
    },
    loadProjectsFromStorage() {
      try {
        const p = JSON.parse(localStorage.getItem('cm_projects') || '[]');
        this.projects = Array.isArray(p) ? p : [];
      } catch (e) {
        this.projects = [];
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
        const inspected = num(p.inspectedCount);
        const qualified = num(p.qualifiedCount);
        const rate = inspected > 0 ? parseFloat(((qualified / inspected) * 100).toFixed(1)) : 0;
        return { projectCount: 0, inspectedCount: inspected, qualifiedCount: qualified, rate };
      }
      const inspectedCount = this.projects.reduce((acc, p) => acc + num(p.inspectedCount), 0);
      const qualifiedCount = this.projects.reduce((acc, p) => acc + num(p.qualifiedCount), 0);
      const rate = inspectedCount > 0 ? parseFloat(((qualifiedCount / inspectedCount) * 100).toFixed(1)) : 0;
      return { projectCount: this.projects.length, inspectedCount, qualifiedCount, rate };
    },
    refreshConfigs() {
      const stats = this.getStats();
      if (this.scope === 'all') {
        this.projectConfig = { ...this.projectConfig, number: [stats.projectCount] };
      }
      this.detectedConfig = { ...this.detectedConfig, number: [stats.inspectedCount] };
      this.firstPassCountConfig = { ...this.firstPassCountConfig, number: [stats.qualifiedCount] };
      this.passRateConfig = { ...this.passRateConfig, number: [stats.rate] };
    },
        openEditModal(type) {
            // 暂时禁用手动编辑，或者让手动编辑只在没有数据时生效
            // 这里为了演示联动，我们可以保留手动编辑作为一种 override，
            // 但下一次自动更新会覆盖它。
            this.currentEditType = type;
            this.showModal = true;
            
            switch(type) {
                case 'project': this.editValue = this.projectConfig.number[0]; break;
                case 'detected': this.editValue = this.detectedConfig.number[0]; break;
                case 'firstPass': this.editValue = this.firstPassCountConfig.number[0]; break;
                case 'passRate': this.editValue = this.passRateConfig.number[0]; break;
            }
        },
        closeModal() {
            this.showModal = false;
        },
        saveEdit() {
            const newVal = Number(this.editValue);
            switch(this.currentEditType) {
                case 'project': 
                    this.projectConfig = { ...this.projectConfig, number: [newVal] };
                    break;
                case 'detected': 
                    this.detectedConfig = { ...this.detectedConfig, number: [newVal] };
                    break;
                case 'firstPass': 
                    this.firstPassCountConfig = { ...this.firstPassCountConfig, number: [newVal] };
                    break;
                case 'passRate': 
                    this.passRateConfig = { ...this.passRateConfig, number: [newVal] };
                    break;
            }
            this.closeModal();
        }
    }
};
</script>

<style lang='scss' scoped>
.user_Overview_container {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 6px 4px 4px;
    box-sizing: border-box;
    gap: 6px;
}

.overview_toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 0 2px;
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

    &--grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: repeat(2, auto);
        gap: 6px 8px;
        align-items: stretch;
    }
    
    li {
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        padding: 2px 0;
        gap: 6px;
        cursor: pointer;
        transition: transform 0.2s;
        min-width: 0;

        &:hover {
            transform: scale(1.03);
        }

        .metric_label {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start;
            gap: 2px;
            flex: 1;
            min-width: 0;
            max-width: none;
            margin: 0;
        }

        .metric_label__line {
            display: block;
            text-align: left;
            line-height: 1.15;
            font-size: clamp(12px, 0.95vw, 18px);
            font-weight: 900;
            color: rgba(255, 255, 255, 0.98);
            letter-spacing: 1px;
            word-break: break-word;
            white-space: normal;
            text-shadow:
                0 0 2px rgba(0, 0, 0, 0.9),
                0 3px 6px rgba(0, 0, 0, 0.75),
                0 0 20px rgba(0, 0, 0, 0.5);
        }

        .user_Overview_nums {
            width: clamp(64px, 4vw, 84px);
            height: clamp(64px, 4vw, 84px);
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

        .user_Overview_nums--ring {
            width: clamp(72px, 4.4vw, 92px);
            height: clamp(72px, 4.4vw, 92px);

            &::before {
                display: none;
            }

            .pass_rate_ring {
                width: 100%;
                height: 100%;
                overflow: visible;
            }

            .pass_rate_ring__bg,
            .pass_rate_ring__bar {
                fill: none;
                stroke-width: 10;
            }

            .pass_rate_ring__bg {
                stroke: rgba(255, 255, 255, 0.1);
            }

            .pass_rate_ring__bar {
                stroke: #00baff;
                stroke-linecap: round;
                transform: rotate(-90deg);
                transform-origin: 60px 60px;
                filter: drop-shadow(0 0 8px rgba(0, 186, 255, 0.35));
                transition: stroke-dashoffset 0.35s ease;
            }

            .pass_rate_ring__value {
                fill: #ffffff;
                font-size: 20px;
                font-weight: 900;
                text-anchor: middle;
                dominant-baseline: middle;
            }
        }
        
        .project_name_card {
            width: clamp(102px, 6.5vw, 132px);
            height: clamp(64px, 4vw, 84px);
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
            background:
                radial-gradient(circle at 50% 50%, rgba(0, 186, 255, 0.18) 0%, rgba(0, 186, 255, 0.04) 55%, transparent 72%);
            border-radius: 50%;
        }
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

/* Edit Modal Styles - Teleport 到 body，居中且不超出视口 */
.edit-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.72);
    z-index: 300000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    box-sizing: border-box;

    .modal-content {
        background: #001f3f;
        padding: 20px;
        border-radius: 8px;
        border: 2px solid #00baff;
        box-shadow: 0 0 20px rgba(0, 186, 255, 0.5);
        min-width: 300px;
        max-width: 90vw;
        text-align: center;
        color: #fff;

        h3 {
            margin-bottom: 20px;
            color: #00baff;
        }

        .modal-input {
            width: 80%;
            padding: 10px;
            margin-bottom: 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid #00baff;
            color: #fff;
            border-radius: 4px;
            font-size: 16px;
            
            &:focus {
                outline: none;
                background: rgba(255, 255, 255, 0.2);
            }
        }

        .modal-actions {
            display: flex;
            justify-content: center;
            gap: 15px;

            button {
                padding: 8px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s;

                &.cancel-btn {
                    background: #666;
                    color: #fff;
                    &:hover { background: #888; }
                }

                &.save-btn {
                    background: #00baff;
                    color: #fff;
                    &:hover { background: #009acc; }
                }
            }
        }
    }
}
</style>

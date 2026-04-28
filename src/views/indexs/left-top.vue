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
            <li class="user_Overview-item kpi_card kpi_card--project" @click="scope === 'all' && openEditModal('project')">
                <div class="kpi_card__label">
                    <span class="kpi_card__mark"></span>
                    <span class="kpi_card__title">
                        <span>{{ scope === 'all' ? '项目' : '当前' }}</span>
                        <span>{{ scope === 'all' ? '数量' : '项目' }}</span>
                    </span>
                </div>
                <div v-if="scope === 'all'" class="kpi_card__value">
                    <dv-digital-flop :config="projectConfig" style="width:100%;height:100%;" />
                </div>
                <div v-else class="kpi_card__project_name" :title="displayProjectName">
                    {{ displayProjectName }}
                </div>
            </li>
            <li class="user_Overview-item kpi_card kpi_card--detected" @click="openEditModal('detected')">
                <div class="kpi_card__label">
                    <span class="kpi_card__mark"></span>
                    <span class="kpi_card__title">
                        <span>已检测</span>
                        <span>构件数量</span>
                    </span>
                </div>
                <div class="kpi_card__value">
                    <dv-digital-flop :config="detectedConfig" style="width:100%;height:100%;" />
                </div>
            </li>
            <li class="user_Overview-item kpi_card kpi_card--qualified" @click="openEditModal('firstPass')">
                <div class="kpi_card__label">
                    <span class="kpi_card__mark"></span>
                    <span class="kpi_card__title">
                        <span>一次装配</span>
                        <span>合格数量</span>
                    </span>
                </div>
                <div class="kpi_card__value">
                    <dv-digital-flop :config="firstPassCountConfig" style="width:100%;height:100%;" />
                </div>
            </li>
            <li class="user_Overview-item kpi_card kpi_card--rate" @click="openEditModal('passRate')">
                <div class="kpi_card__label">
                    <span class="kpi_card__mark"></span>
                    <span class="kpi_card__title">
                        <span>一次</span>
                        <span>合格率</span>
                    </span>
                </div>
                <div class="kpi_card__value">
                    <dv-digital-flop :config="passRateConfig" style="width:100%;height:100%;" />
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
    fontSize: 34,
    fontWeight: 800,
    fontFamily: 'DIN Alternate, Bahnschrift, Microsoft YaHei, sans-serif',
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
        grid-template-rows: repeat(2, minmax(68px, 1fr));
        gap: 8px 10px;
        align-items: stretch;
        min-height: 0;
        flex: 1;
    }
    
    li {
        cursor: pointer;
        transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        min-width: 0;

        &:hover {
            transform: translateY(-2px);
        }
    }
}

.kpi_card {
    --kpi-color: #00baff;
    --kpi-rgb: 0, 186, 255;
    min-height: 68px;
    padding: 9px 12px 8px 14px;
    border-radius: 6px;
    border: 1px solid rgba(105, 194, 255, 0.14);
    border-left-color: rgba(var(--kpi-rgb), 0.58);
    background:
        linear-gradient(90deg, rgba(var(--kpi-rgb), 0.14), rgba(6, 34, 96, 0.24) 40%, rgba(4, 22, 72, 0.16)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.015));
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        inset 0 -1px 0 rgba(var(--kpi-rgb), 0.10);
    box-sizing: border-box;
    display: grid;
    // Keep the current compact card style: left two-line label, right aligned number.
    grid-template-columns: minmax(100px, 1fr) minmax(82px, 1fr);
    align-items: center;
    column-gap: 8px;
    position: relative;
    overflow: hidden;

    // Use a slim side accent instead of the previous round ornament to keep the panel clean.
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 8px;
        bottom: 8px;
        width: 2px;
        border-radius: 0 2px 2px 0;
        background: var(--kpi-color);
        box-shadow: 0 0 10px rgba(var(--kpi-rgb), 0.55);
    }

    &::after {
        content: '';
        position: absolute;
        right: 10px;
        top: 9px;
        width: 28px;
        height: 1px;
        background: linear-gradient(90deg, rgba(var(--kpi-rgb), 0), rgba(var(--kpi-rgb), 0.45));
    }

    &:hover {
        border-color: rgba(var(--kpi-rgb), 0.38);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            inset 0 -1px 0 rgba(var(--kpi-rgb), 0.18),
            0 8px 18px rgba(var(--kpi-rgb), 0.10);
    }

    &--project {
        --kpi-color: #00baff;
        --kpi-rgb: 0, 186, 255;
    }

    &--detected {
        --kpi-color: #07f7a8;
        --kpi-rgb: 7, 247, 168;
    }

    &--qualified {
        --kpi-color: #e3b337;
        --kpi-rgb: 227, 179, 55;
    }

    &--rate {
        --kpi-color: #42d7ff;
        --kpi-rgb: 66, 215, 255;
    }

    &__label {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    &__mark {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--kpi-color);
        box-shadow: 0 0 8px rgba(var(--kpi-rgb), 0.75);
        flex-shrink: 0;
    }

    &__title {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        font-size: clamp(14px, 0.86vw, 16px);
        line-height: 1.18;
        font-weight: 600;
        letter-spacing: 1.2px;
        color: rgba(210, 236, 255, 0.78);
        overflow: hidden;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.34);

        span {
            display: block;
            white-space: nowrap;
            overflow: visible;
            text-overflow: clip;

            &:first-child {
                font-size: 0.92em;
                color: rgba(169, 212, 238, 0.72);
            }

            &:last-child {
                font-weight: 700;
                color: rgba(236, 249, 255, 0.92);
            }
        }
    }

    &__value {
        min-width: 0;
        width: 100%;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    &__value ::v-deep .dv-digital-flop {
        width: 100%;
        height: 100%;
    }

    &__project_name {
        min-width: 0;
        justify-self: end;
        font-size: clamp(18px, 1.25vw, 24px);
        line-height: 1.08;
        font-weight: 900;
        color: var(--kpi-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 0 14px rgba(var(--kpi-rgb), 0.38), 0 2px 8px rgba(0, 0, 0, 0.6);
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

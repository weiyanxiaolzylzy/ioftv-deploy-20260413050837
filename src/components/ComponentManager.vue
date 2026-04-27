<!--
  Component Manager - IFC 3D Viewer + Element Detail + Task Assignment
  Opens as a full-screen overlay with:
  - Left: AdvancedIfcViewer (3D model with element picking)
  - Right: Component list + detail panel + task assignment form
-->
<template>
  <transition name="manager-fade">
    <div v-if="visible" class="cm-overlay" @keydown.esc="close">
      <!-- Header -->
      <div class="cm-header">
        <div class="cm-title">
          <span class="cm-icon">🏗️</span>
          <span>构件管理 — {{ project ? project.name : '' }}</span>
          <span class="cm-badge">{{ components.length }} 个构件</span>
        </div>
        <div class="cm-header-actions">
          <button class="cm-btn cm-btn-primary" @click="saveAll">
            保存全部
          </button>
          <button class="cm-btn cm-btn-close" @click="close">关闭</button>
        </div>
      </div>

      <!-- Main body: Viewer + Side panel -->
      <div class="cm-body">
        <!-- Left: IFC Viewer -->
        <div class="cm-viewer-panel">
          <AdvancedIfcViewer
            ref="viewer"
            :ifcUrl="ifcUrl"
            :highlightedIds="highlightedIds"
            :backgroundColor="0x051020"
            :enablePick="true"
            :showElementList="false"
            :showHints="true"
            @element-click="onViewerElementClick"
            @element-dblclick="onViewerElementDblClick"
            @model-loaded="onModelLoaded"
          />
          <!-- Viewer toolbar -->
          <div class="cm-viewer-toolbar">
            <button class="cm-toolbar-btn" @click="resetViewerCamera" title="重置视角">
              🔄 重置视角
            </button>
            <button class="cm-toolbar-btn" @click="fitSelected" :disabled="!selectedComponent" title="聚焦选中构件">
              🎯 聚焦构件
            </button>
            <div class="cm-viewer-hint">
              点击构件可在右侧查看详情并分配任务 | 双击构件全屏查看
            </div>
          </div>
        </div>

        <!-- Right: Component list + Detail -->
        <div class="cm-side-panel">
          <!-- Search and filter -->
          <div class="cm-search-bar">
            <input
              v-model="searchText"
              class="cm-search-input"
              placeholder="搜索：名称 / 类型 / GlobalId"
            />
            <select v-model="filterType" class="cm-type-select">
              <option value="">全部类型</option>
              <option v-for="t in availableTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <!-- Component list -->
          <div class="cm-component-list" ref="componentList">
            <div
              v-if="filteredComponents.length === 0"
              class="cm-empty-list"
            >
              暂无构件
            </div>
            <div
              v-for="comp in filteredComponents"
              :key="comp.id || comp.expressID || comp.ifcElementId"
              class="cm-component-item"
              :class="{
                'is-selected': selectedComponent && (selectedComponent.id === comp.id || selectedComponent.ifcElementId === comp.ifcElementId)
              }"
              @click="selectComponent(comp)"
            >
              <div class="cm-comp-type">{{ comp.ifcType || comp.spec || '未知' }}</div>
              <div class="cm-comp-name">{{ comp.name || '未命名' }}</div>
              <div class="cm-comp-meta">
                <span class="cm-comp-status" :class="getStatusClass(comp.status)">{{ comp.status || '待检测' }}</span>
                <span class="cm-comp-team" v-if="comp.teamLeader">👤 {{ comp.teamLeader }}</span>
              </div>
            </div>
          </div>

          <!-- Selected component detail + assignment form -->
          <div v-if="selectedComponent" class="cm-detail-panel">
            <div class="cm-detail-header">
              <span class="cm-detail-title">构件详情</span>
              <button class="cm-detail-close" @click="selectedComponent = null">×</button>
            </div>
            <div class="cm-detail-body">
              <!-- Basic info -->
              <div class="cm-info-grid">
                <div class="cm-info-item">
                  <span class="cm-info-label">名称</span>
                  <span class="cm-info-value">{{ selectedComponent.name || '未命名' }}</span>
                </div>
                <div class="cm-info-item">
                  <span class="cm-info-label">类型</span>
                  <span class="cm-info-value">{{ selectedComponent.ifcType || selectedComponent.spec || '-' }}</span>
                </div>
                <div class="cm-info-item">
                  <span class="cm-info-label">GlobalId</span>
                  <span class="cm-info-value mono">{{ selectedComponent.ifcGlobalId || selectedComponent.globalId || '-' }}</span>
                </div>
                <div class="cm-info-item">
                  <span class="cm-info-label">ExpressID</span>
                  <span class="cm-info-value mono">{{ selectedComponent.ifcElementId || selectedComponent.expressID || '-' }}</span>
                </div>
              </div>

              <div class="cm-divider">任务分配</div>

              <!-- Assignment form -->
              <div class="cm-form">
                <div class="cm-form-item" v-for="fd in [
                  { key: 'teamLeader', label: '班组长 *', dk: 'editTeamLeader' },
                  { key: 'qualityInspector', label: '质检员', dk: 'editQualityInspector' },
                  { key: 'qualityManager', label: '质量员', dk: 'editQualityManager' }
                ]" :key="fd.key">
                  <label>{{ fd.label }}</label>
                  <div class="cm-preset-dropdown" @click.stop>
                    <div class="cm-preset-trigger" @click="toggleDropdown(fd.dk, $event)">
                      <span :class="{ 'cm-preset-placeholder': !editForm[fd.key] }">{{ editForm[fd.key] || '请选择' }}</span>
                      <span class="cm-preset-arrow" :class="{ 'is-open': dropdownOpen[fd.dk] }">▾</span>
                    </div>
                    <div v-show="dropdownOpen[fd.dk]" class="cm-preset-menu">
                      <div
                        v-for="(item, idx) in presets[fd.key]"
                        :key="idx"
                        class="cm-preset-option"
                        @click="selectPreset('edit', fd.key, item)"
                      >
                        <span>{{ item }}</span>
                        <span class="cm-preset-remove" @click.stop="removePreset(fd.key, idx, $event)">×</span>
                      </div>
                      <div v-if="!addingNew[fd.dk]" class="cm-preset-option cm-preset-add" @click.stop="startAddPreset(fd.dk, $event)">
                        + 添加
                      </div>
                      <div v-else class="cm-preset-add-row" @click.stop>
                        <input
                          v-model="newPresetValue"
                          class="cm-preset-add-input"
                          placeholder="输入名称"
                          @keyup.enter="confirmAddPreset(fd.key, fd.dk, 'edit', $event)"
                        />
                        <button class="cm-preset-add-btn" @click="confirmAddPreset(fd.key, fd.dk, 'edit', $event)">✓</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="cm-form-item">
                  <label>计划检测日期</label>
                  <input
                    type="date"
                    v-model="editForm.planDate"
                    class="cm-input"
                  />
                </div>
                <div class="cm-form-item">
                  <label>状态</label>
                  <select v-model="editForm.status" class="cm-input cm-select">
                    <option value="待检测">待检测</option>
                    <option value="检测中">检测中</option>
                    <option value="合格">合格</option>
                    <option value="不合格">不合格</option>
                  </select>
                </div>
              </div>

              <!-- Actions -->
              <div class="cm-detail-actions">
                <button class="cm-btn cm-btn-secondary" @click="resetForm">重置</button>
                <button class="cm-btn cm-btn-primary" @click="saveComponent">保存此构件</button>
              </div>
            </div>
          </div>

          <!-- Batch assign (shown when no specific component selected) -->
          <div v-else class="cm-batch-section">
            <div class="cm-batch-header">
              <span>批量指派 ({{ selectedForBatch.length }} 个已选) </span>
            </div>
            <div class="cm-form cm-form-compact">
              <div class="cm-form-item" v-for="fd in [
                { key: 'teamLeader', label: '班组长', dk: 'batchTeamLeader' },
                { key: 'qualityInspector', label: '质检员', dk: 'batchQualityInspector' },
                { key: 'qualityManager', label: '质量员', dk: 'batchQualityManager' }
              ]" :key="fd.key">
                <label>{{ fd.label }}</label>
                <div class="cm-preset-dropdown" @click.stop>
                  <div class="cm-preset-trigger" @click="toggleDropdown(fd.dk, $event)">
                    <span :class="{ 'cm-preset-placeholder': !batchForm[fd.key] }">{{ batchForm[fd.key] || '请选择' }}</span>
                    <span class="cm-preset-arrow" :class="{ 'is-open': dropdownOpen[fd.dk] }">▾</span>
                  </div>
                  <div v-show="dropdownOpen[fd.dk]" class="cm-preset-menu">
                    <div
                      v-for="(item, idx) in presets[fd.key]"
                      :key="idx"
                      class="cm-preset-option"
                      @click="selectPreset('batch', fd.key, item)"
                    >
                      <span>{{ item }}</span>
                      <span class="cm-preset-remove" @click.stop="removePreset(fd.key, idx, $event)">×</span>
                    </div>
                    <div v-if="!addingNew[fd.dk]" class="cm-preset-option cm-preset-add" @click.stop="startAddPreset(fd.dk, $event)">
                      + 添加
                    </div>
                    <div v-else class="cm-preset-add-row" @click.stop>
                      <input
                        v-model="newPresetValue"
                        class="cm-preset-add-input"
                        placeholder="输入名称"
                        @keyup.enter="confirmAddPreset(fd.key, fd.dk, 'batch', $event)"
                      />
                      <button class="cm-preset-add-btn" @click="confirmAddPreset(fd.key, fd.dk, 'batch', $event)">✓</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="cm-form-item">
                <label>计划日期</label>
                <input type="date" v-model="batchForm.planDate" class="cm-input" />
              </div>
              <div class="cm-form-item">
                <label>状态</label>
                <select v-model="batchForm.status" class="cm-input cm-select">
                  <option value="">不修改</option>
                  <option value="待检测">待检测</option>
                  <option value="检测中">检测中</option>
                  <option value="合格">合格</option>
                  <option value="不合格">不合格</option>
                </select>
              </div>
            </div>
            <div class="cm-detail-actions">
              <button
                class="cm-btn cm-btn-primary"
                :disabled="selectedForBatch.length === 0"
                @click="applyBatchAssign"
              >
                应用批量指派
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast notification -->
      <transition name="toast-fade">
        <div v-if="toast.show" class="cm-toast" :class="'toast-' + toast.type">
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </transition>
</template>

<script>
import { getAuthHeaders } from '@/utils/index.js'

export default {
  name: 'ComponentManager',
  props: {
    // Parent can open/close via v-model
    value: {
      type: Boolean,
      default: false
    },
    project: {
      type: Object,
      default: null
    },
    ifcUrl: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      visible: false,

      // Component list (working copy)
      components: [],

      // Selected component
      selectedComponent: null,
      selectedForBatch: [],

      // Edit form for selected component
      editForm: {
        teamLeader: '',
        qualityInspector: '',
        qualityManager: '',
        planDate: '',
        status: '待检测'
      },

      // Batch assign form
      batchForm: {
        teamLeader: '',
        qualityInspector: '',
        qualityManager: '',
        planDate: '',
        status: ''
      },

      // Highlight tracking
      highlightedIds: [],

      // Search and filter
      searchText: '',
      filterType: '',

      // Presets for dropdowns (persisted to localStorage)
      presets: {
        teamLeader: [],
        qualityInspector: [],
        qualityManager: []
      },

      // Dropdown open state
      dropdownOpen: {
        editTeamLeader: false,
        editQualityInspector: false,
        editQualityManager: false,
        batchTeamLeader: false,
        batchQualityInspector: false,
        batchQualityManager: false
      },

      // Adding new preset
      addingNew: {
        editTeamLeader: false,
        editQualityInspector: false,
        editQualityManager: false,
        batchTeamLeader: false,
        batchQualityInspector: false,
        batchQualityManager: false
      },
      newPresetValue: '',

      // Toast
      toast: {
        show: false,
        message: '',
        type: 'success'
      }
    };
  },
  computed: {
    availableTypes() {
      const types = new Set(
        (this.components || [])
          .map(c => c.ifcType || c.spec)
          .filter(Boolean)
      );
      return Array.from(types).sort();
    },
    filteredComponents() {
      let list = this.components;
      if (this.searchText) {
        const q = this.searchText.toLowerCase();
        list = list.filter(c =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.ifcType && c.ifcType.toLowerCase().includes(q)) ||
          (c.spec && c.spec.toLowerCase().includes(q)) ||
          (c.ifcGlobalId && c.ifcGlobalId.toLowerCase().includes(q)) ||
          (c.globalId && c.globalId.toLowerCase().includes(q)) ||
          (c.ifcElementId && String(c.ifcElementId).includes(q)) ||
          (c.expressID && String(c.expressID).includes(q))
        );
      }
      if (this.filterType) {
        list = list.filter(c => (c.ifcType || c.spec) === this.filterType);
      }
      return list;
    }
  },
  created() {
    this.loadPresets();
    document.addEventListener('click', this.closeAllDropdowns);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeAllDropdowns);
  },
  watch: {
    value(val) {
      this.visible = val;
      if (val) {
        this.init();
      }
    },
    visible(val) {
      this.$emit('input', val);
    },
    selectedComponent(comp) {
      if (comp) {
        this.editForm = {
          teamLeader: comp.teamLeader || '',
          qualityInspector: comp.qualityInspector || '',
          qualityManager: comp.qualityManager || '',
          planDate: comp.planDate || '',
          status: comp.status || '待检测'
        };
      }
    }
  },
  methods: {
    // ── Init ───────────────────────────────────────────
    init() {
      // Deep copy components from project
      this.components = JSON.parse(JSON.stringify(this.project && this.project.components ? this.project.components : []));
      this.selectedComponent = null;
      this.selectedForBatch = [];
      this.searchText = '';
      this.filterType = '';
      this.resetBatchForm();
    },

    // ── Viewer events ──────────────────────────────────
    onModelLoaded({ modelID, elementCount }) {
      console.log('[ComponentManager] Model loaded:', modelID, elementCount);
      this.$nextTick(() => {
        // Select first component if available
        if (this.filteredComponents.length > 0 && !this.selectedComponent) {
          this.selectComponent(this.filteredComponents[0]);
        }
      });
    },

    onViewerElementClick(row) {
      // Find matching component
      const found = this.components.find(c =>
        String(c.ifcElementId) === String(row.expressID) ||
        String(c.ifcGlobalId) === String(row.globalId)
      );
      if (found) {
        this.selectComponent(found);
          // Scroll into view
          this.$nextTick(() => {
            const el = this.$refs.componentList && this.$refs.componentList.querySelector('.cm-component-item.is-selected');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
      }
    },

    onViewerElementDblClick(row) {
      // Focus the viewer on this element
      const viewer = this.$refs.viewer;
      if (viewer && row) {
        viewer.highlightElement(row.expressID);
      }
    },

    // ── Component selection ─────────────────────────────
    selectComponent(comp) {
      this.selectedComponent = comp;
      // Highlight in viewer
      const id = comp.ifcElementId || comp.expressID;
      if (id) {
        this.highlightedIds = [Number(id)];
        const viewer = this.$refs.viewer;
        if (viewer) {
          viewer.highlightElement(Number(id));
        }
      }
    },

    // ── Viewer controls ─────────────────────────────────
    resetViewerCamera() {
      const viewer = this.$refs.viewer;
      // Reload
      if (viewer && this.ifcUrl) {
        viewer.reload();
      }
    },

    fitSelected() {
      if (!this.selectedComponent) return;
      const id = Number(this.selectedComponent.ifcElementId || this.selectedComponent.expressID);
      const viewer = this.$refs.viewer;
      if (viewer) {
        viewer.highlightElement(id);
      }
    },

    // ── Form operations ────────────────────────────────
    resetForm() {
      if (this.selectedComponent) {
        this.editForm = {
          teamLeader: this.selectedComponent.teamLeader || '',
          qualityInspector: this.selectedComponent.qualityInspector || '',
          qualityManager: this.selectedComponent.qualityManager || '',
          planDate: this.selectedComponent.planDate || '',
          status: this.selectedComponent.status || '待检测'
        };
      }
    },

    resetBatchForm() {
      this.batchForm = {
        teamLeader: '',
        qualityInspector: '',
        qualityManager: '',
        planDate: '',
        status: ''
      };
    },

    saveComponent() {
      if (!this.selectedComponent) return;
      if (!this.editForm.teamLeader) {
        this.showToast('请输入班组长', 'warning');
        return;
      }
      // Apply edits to working copy
      const idx = this.components.findIndex(c =>
        (c.id && c.id === this.selectedComponent.id) ||
        (c.ifcElementId && String(c.ifcElementId) === String(this.selectedComponent.ifcElementId)) ||
        (c.expressID && String(c.expressID) === String(this.selectedComponent.expressID))
      );
      if (idx >= 0) {
        Object.assign(this.components[idx], this.editForm);
        // Sync back to project prop
        if (this.project && this.project.components) {
          const projIdx = this.project.components.findIndex(c =>
            (c.id && c.id === this.components[idx].id) ||
            (c.ifcElementId && String(c.ifcElementId) === String(this.components[idx].ifcElementId)) ||
            (c.expressID && String(c.expressID) === String(this.components[idx].expressID))
          );
          if (projIdx >= 0) {
            Object.assign(this.project.components[projIdx], this.editForm);
          }
        }
        // Update selected
        this.selectedComponent = { ...this.components[idx] };
        this.showToast('保存成功', 'success');
        this.$emit('component-updated', this.components[idx]);
        // 保存到后端
        this.syncToBackend();
      }
    },

    async syncToBackend() {
      if (!this.project || !this.project.id) return;
      try {
        const res = await fetch(`/api/projects/${this.project.id}/components`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ components: this.project.components })
        });
        const data = await res.json();
        if (!data || !data.success) {
          console.warn('[ComponentManager] 保存到后端失败', data);
        }
      } catch (e) {
        console.error('[ComponentManager] 保存到后端失败', e);
      }
    },

    // ── Batch assign ────────────────────────────────────
    toggleBatchSelect(comp) {
      const key = comp.id || comp.ifcElementId || comp.expressID;
      const idx = this.selectedForBatch.findIndex(s =>
        (s.id && s.id === key) ||
        (s.ifcElementId && String(s.ifcElementId) === String(key)) ||
        (s.expressID && String(s.expressID) === String(key))
      );
      if (idx >= 0) {
        this.selectedForBatch.splice(idx, 1);
      } else {
        this.selectedForBatch.push(comp);
      }
    },

    applyBatchAssign() {
      if (this.selectedForBatch.length === 0) return;
      const fields = ['teamLeader', 'qualityInspector', 'qualityManager', 'planDate', 'status'];
      let count = 0;
      this.components.forEach((comp, i) => {
        const key = comp.id || comp.ifcElementId || comp.expressID;
        const inBatch = this.selectedForBatch.some(s =>
          (s.id && s.id === key) ||
          (s.ifcElementId && String(s.ifcElementId) === String(key)) ||
          (s.expressID && String(s.expressID) === String(key))
        );
        if (inBatch) {
          fields.forEach(f => {
            if (this.batchForm[f]) {
              this.components[i][f] = this.batchForm[f];
              count++;
            }
          });
          // Sync to project
          if (this.project && this.project.components) {
            const projIdx = this.project.components.findIndex(c =>
              (c.id && c.id === this.components[i].id) ||
              (c.ifcElementId && String(c.ifcElementId) === String(this.components[i].ifcElementId)) ||
              (c.expressID && String(c.expressID) === String(this.components[i].expressID))
            );
            if (projIdx >= 0) {
              fields.forEach(f => {
                if (this.batchForm[f]) {
                  this.project.components[projIdx][f] = this.batchForm[f];
                }
              });
            }
          }
        }
      });
      if (count > 0) {
        this.showToast(`批量指派成功 (${this.selectedForBatch.length} 个构件)`, 'success');
        this.selectedForBatch = [];
        this.resetBatchForm();
        this.$emit('batch-updated', this.components);
        // 同步到后端
        this.syncToBackend();
      } else {
        this.showToast('请填写至少一项指派信息', 'warning');
      }
    },

    // ── Save all ────────────────────────────────────────
    saveAll() {
      if (!this.project) return;
      // Sync all components back
      this.project.components = JSON.parse(JSON.stringify(this.components));
      this.$emit('save-all', this.project);
      this.showToast('全部保存成功', 'success');
    },
    // ── Utils ───────────────────────────────────────────
    getStatusClass(status) {
      const s = status || '待检测';
      if (s === '合格' || s === '已完成') return 'status-success';
      if (s === '不合格') return 'status-error';
      if (s === '检测中') return 'status-progress';
      return 'status-pending';
    },

    // ── Preset management ───────────────────────────────
    loadPresets() {
      ['teamLeader', 'qualityInspector', 'qualityManager'].forEach(key => {
        try {
          const saved = JSON.parse(localStorage.getItem('cm_preset_' + key) || '[]');
          if (Array.isArray(saved)) this.presets[key] = saved;
        } catch (e) { /* ignore */ }
      });
    },

    savePreset(field) {
      localStorage.setItem('cm_preset_' + field, JSON.stringify(this.presets[field]));
    },

    toggleDropdown(dropdownKey, event) {
      if (event) event.stopPropagation();
      const wasOpen = this.dropdownOpen[dropdownKey];
      this.closeAllDropdowns();
      if (!wasOpen) {
        this.dropdownOpen[dropdownKey] = true;
      }
    },

    closeAllDropdowns() {
      Object.keys(this.dropdownOpen).forEach(k => { this.dropdownOpen[k] = false; });
      Object.keys(this.addingNew).forEach(k => { this.addingNew[k] = false; });
      this.newPresetValue = '';
    },

    selectPreset(formType, field, value) {
      if (formType === 'edit') {
        this.editForm[field] = value;
      } else {
        this.batchForm[field] = value;
      }
      this.closeAllDropdowns();
    },

    startAddPreset(dropdownKey, event) {
      if (event) event.stopPropagation();
      this.addingNew[dropdownKey] = true;
      this.newPresetValue = '';
      this.$nextTick(() => {
        const input = this.$el.querySelector('.cm-preset-add-input:focus, .cm-preset-add-input');
        if (input) input.focus();
      });
    },

    confirmAddPreset(field, dropdownKey, formType, event) {
      if (event) event.stopPropagation();
      const val = this.newPresetValue.trim();
      if (!val) return;
      if (!this.presets[field].includes(val)) {
        this.presets[field].push(val);
        this.savePreset(field);
      }
      if (formType === 'edit') {
        this.editForm[field] = val;
      } else {
        this.batchForm[field] = val;
      }
      this.addingNew[dropdownKey] = false;
      this.newPresetValue = '';
      this.closeAllDropdowns();
    },

    removePreset(field, index, event) {
      if (event) event.stopPropagation();
      this.presets[field].splice(index, 1);
      this.savePreset(field);
    },

    showToast(message, type = 'success') {
      this.toast = { show: true, message, type };
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        this.toast.show = false;
      }, 2500);
    },

    close() {
      this.visible = false;
      this.selectedComponent = null;
      this.highlightedIds = [];
    }
  }
};
</script>

<style scoped>
/* ── Overlay & Layout ──────────────────────────────── */
.cm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(2, 8, 18, 0.96);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ── Header ──────────────────────────────────────── */
.cm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: rgba(5, 16, 36, 0.98);
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
  flex-shrink: 0;
}

.cm-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #00d4ff;
  font-size: 15px;
  font-weight: bold;
}

.cm-icon {
  font-size: 18px;
}

.cm-badge {
  background: rgba(0, 212, 255, 0.15);
  color: #00d4ff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: normal;
}

.cm-header-actions {
  display: flex;
  gap: 10px;
}

/* ── Body ──────────────────────────────────────────── */
.cm-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ── Viewer Panel ──────────────────────────────────── */
.cm-viewer-panel {
  flex: 1;
  position: relative;
  min-width: 0;
  background: #020812;
}

.cm-viewer-toolbar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(5, 16, 36, 0.9);
  border: 1px solid rgba(0, 212, 255, 0.25);
  border-radius: 8px;
  padding: 6px 12px;
  z-index: 5;
}

.cm-toolbar-btn {
  background: transparent;
  border: 1px solid rgba(0, 212, 255, 0.3);
  color: #00d4ff;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.cm-toolbar-btn:hover {
  background: rgba(0, 212, 255, 0.15);
  border-color: #00d4ff;
}

.cm-toolbar-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.cm-viewer-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  white-space: nowrap;
}

/* ── Side Panel ────────────────────────────────────── */
.cm-side-panel {
  width: 340px;
  flex-shrink: 0;
  background: rgba(5, 16, 36, 0.98);
  border-left: 1px solid rgba(0, 212, 255, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Search bar ────────────────────────────────────── */
.cm-search-bar {
  display: flex;
  gap: 6px;
  padding: 10px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.12);
  flex-shrink: 0;
}

.cm-search-input {
  flex: 1;
  background: rgba(0, 40, 80, 0.4);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 4px;
  padding: 5px 8px;
  color: #fff;
  font-size: 12px;
  outline: none;
}

.cm-search-input:focus {
  border-color: #00d4ff;
}

.cm-type-select {
  background: rgba(0, 40, 80, 0.4);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 4px;
  padding: 5px 4px;
  color: #fff;
  font-size: 11px;
  outline: none;
  cursor: pointer;
  max-width: 100px;
}

/* ── Component list ────────────────────────────────── */
.cm-component-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.cm-empty-list {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  padding: 30px 0;
}

.cm-component-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.cm-component-item:hover {
  background: rgba(0, 212, 255, 0.08);
  border-color: rgba(0, 212, 255, 0.2);
}

.cm-component-item.is-selected {
  background: rgba(0, 212, 255, 0.15);
  border-color: rgba(0, 212, 255, 0.5);
}

.cm-comp-type {
  font-size: 10px;
  color: #00d4ff;
  font-weight: bold;
  margin-bottom: 2px;
}

.cm-comp-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.cm-comp-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cm-comp-status {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: bold;
}

.cm-comp-team {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

/* Status colors */
.status-pending { background: rgba(100, 116, 139, 0.3); color: #94a3b8; }
.status-progress { background: rgba(59, 130, 246, 0.3); color: #60a5fa; }
.status-success { background: rgba(34, 197, 94, 0.3); color: #4ade80; }
.status-error { background: rgba(239, 68, 68, 0.3); color: #f87171; }

/* ── Detail panel ──────────────────────────────────── */
.cm-detail-panel {
  border-top: 1px solid rgba(0, 212, 255, 0.15);
  background: rgba(5, 20, 40, 0.95);
  display: flex;
  flex-direction: column;
  max-height: 50%;
  flex-shrink: 0;
}

.cm-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.12);
}

.cm-detail-title {
  color: #00d4ff;
  font-size: 12px;
  font-weight: bold;
}

.cm-detail-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}

.cm-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

/* ── Info grid ─────────────────────────────────────── */
.cm-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}

.cm-info-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cm-info-label {
  font-size: 10px;
  color: rgba(0, 212, 255, 0.6);
}

.cm-info-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
}

.cm-info-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 10px;
  word-break: break-all;
}

.cm-divider {
  font-size: 11px;
  color: #00d4ff;
  font-weight: bold;
  margin: 8px 0 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}

/* ── Form ──────────────────────────────────────────── */
.cm-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cm-form-compact {
  gap: 5px;
}

.cm-form-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cm-form-item label {
  font-size: 10px;
  color: rgba(0, 212, 255, 0.7);
}

.cm-input {
  background: rgba(0, 40, 80, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 4px;
  padding: 5px 8px;
  color: #fff;
  font-size: 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.cm-input:focus {
  border-color: #00d4ff;
}

.cm-select {
  cursor: pointer;
}

/* ── Actions ───────────────────────────────────────── */
.cm-detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

/* ── Batch section ─────────────────────────────────── */
.cm-batch-section {
  border-top: 1px solid rgba(0, 212, 255, 0.15);
  padding: 10px 12px;
  background: rgba(5, 16, 36, 0.95);
  flex-shrink: 0;
}

.cm-batch-header {
  font-size: 12px;
  color: #00d4ff;
  font-weight: bold;
  margin-bottom: 8px;
}

/* ── Buttons ───────────────────────────────────────── */
.cm-btn {
  padding: 6px 16px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s;
}

.cm-btn-primary {
  background: linear-gradient(135deg, #0066cc, #00d4ff);
  color: #fff;
  border: 1px solid rgba(0, 212, 255, 0.3);
}

.cm-btn-primary:hover {
  background: linear-gradient(135deg, #0088ee, #00eeff);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.3);
}

.cm-btn-primary:disabled {
  opacity: 0.4;
  cursor: default;
  box-shadow: none;
}

.cm-btn-secondary {
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cm-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
}

.cm-btn-close {
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cm-btn-close:hover {
  background: rgba(245, 108, 108, 0.15);
  border-color: rgba(245, 108, 108, 0.5);
  color: #f56c6c;
}

/* ── Toast ─────────────────────────────────────────── */
.cm-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: bold;
  z-index: 99999;
  pointer-events: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.toast-success {
  background: rgba(34, 197, 94, 0.9);
  color: #fff;
  border: 1px solid rgba(74, 222, 128, 0.5);
}

.toast-warning {
  background: rgba(245, 158, 11, 0.9);
  color: #fff;
  border: 1px solid rgba(252, 211, 77, 0.5);
}

.toast-error {
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  border: 1px solid rgba(252, 165, 165, 0.5);
}

/* ── Scrollbar ─────────────────────────────────────── */
.cm-component-list::-webkit-scrollbar,
.cm-detail-body::-webkit-scrollbar {
  width: 4px;
}

.cm-component-list::-webkit-scrollbar-track,
.cm-detail-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.cm-component-list::-webkit-scrollbar-thumb,
.cm-detail-body::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 255, 0.3);
  border-radius: 2px;
}

/* ── Transitions ────────────────────────────────────── */
.manager-fade-enter-active,
.manager-fade-leave-active {
  transition: opacity 0.3s;
}

.manager-fade-enter,
.manager-fade-leave-to {
  opacity: 0;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.toast-fade-enter,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* ── Preset Dropdown ──────────────────────────────── */
.cm-preset-dropdown {
  position: relative;
  width: 100%;
}

.cm-preset-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 40, 80, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 4px;
  padding: 5px 8px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 26px;
  box-sizing: border-box;
}

.cm-preset-trigger:hover {
  border-color: rgba(0, 212, 255, 0.5);
}

.cm-preset-placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.cm-preset-arrow {
  font-size: 10px;
  color: rgba(0, 212, 255, 0.6);
  transition: transform 0.2s;
  flex-shrink: 0;
  margin-left: 4px;
}

.cm-preset-arrow.is-open {
  transform: rotate(180deg);
}

.cm-preset-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 2px;
  background: rgba(5, 20, 40, 0.98);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  z-index: 100;
  max-height: 180px;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.cm-preset-menu::-webkit-scrollbar {
  width: 3px;
}

.cm-preset-menu::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 255, 0.3);
  border-radius: 2px;
}

.cm-preset-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: background 0.15s;
}

.cm-preset-option:hover {
  background: rgba(0, 212, 255, 0.12);
}

.cm-preset-remove {
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  transition: color 0.15s;
}

.cm-preset-remove:hover {
  color: #f56c6c;
}

.cm-preset-add {
  color: rgba(0, 212, 255, 0.7);
  border-top: 1px solid rgba(0, 212, 255, 0.1);
  font-weight: bold;
}

.cm-preset-add:hover {
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.08);
}

.cm-preset-add-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-top: 1px solid rgba(0, 212, 255, 0.1);
}

.cm-preset-add-input {
  flex: 1;
  background: rgba(0, 40, 80, 0.6);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 3px;
  padding: 4px 6px;
  color: #fff;
  font-size: 11px;
  outline: none;
  min-width: 0;
}

.cm-preset-add-input:focus {
  border-color: #00d4ff;
}

.cm-preset-add-btn {
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid rgba(0, 212, 255, 0.4);
  border-radius: 3px;
  color: #00d4ff;
  font-size: 12px;
  padding: 3px 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.cm-preset-add-btn:hover {
  background: rgba(0, 212, 255, 0.35);
}
</style>

<template>
  <div class="monthly_performance_container" :class="{ 'light-theme': isLightTheme }">
    <div class="performance_content">
      <!-- 左侧：本月标兵 -->
      <div class="pioneer_section">
        <div class="section_title">本月标兵</div>
        <div class="pioneer_info">
          <div class="pioneer_image" :style="{ cursor: canEditPioneer ? 'pointer' : 'default' }" @click="openEditModal('pioneer')">
            <img :src="pioneer.photoUrl || '/people.jpg'" alt="班组照片" />
          </div>
          <div class="pioneer_details">
            <div class="pioneer_name">{{ pioneer.groupName || '未分配班组' }}</div>
            <div class="pioneer_stat">
              <span class="label">装配合格率</span>
              <span class="value">{{ pioneer.passingRate }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑弹窗 -->
      <div v-if="showModal" class="edit-modal">
        <div class="modal-content">
          <h3>{{ editType === 'pioneer' ? '修改标兵信息' : '修改排名信息' }}</h3>
          
          <template v-if="editType === 'pioneer'">
            <div class="form-item">
              <label>预设班组</label>
              <div class="group-select-wrapper">
                <select v-model="selectedGroupId" @change="onGroupSelect" class="modal-select" :disabled="!canEditPioneer">
                  <option value="">-- 请选择 --</option>
                  <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
                <button v-if="canEditGroups" @click="openGroupSettingsPanel" class="manage-btn">管理</button>
              </div>
            </div>

            <div class="form-item">
              <label>班组名称</label>
              <input type="text" v-model="editForm.groupName" class="modal-input" :disabled="!canEditPioneer" />
            </div>

            <div class="form-item">
              <label>装配合格率 (%)</label>
              <input type="number" v-model.number="editForm.passingRate" class="modal-input" step="0.1" :disabled="!canEditPioneer" />
            </div>
            <div class="form-item form-tip-block">
              <label>班组照片</label>
              <div class="inline-tip">照片请到“班组设置”里统一维护，这里不再单独上传。</div>
            </div>
          </template>

          <template v-else-if="editType === 'ranking'">
            <div class="form-item">
              <label>预设班组</label>
              <div class="group-select-wrapper">
                <select v-model="selectedGroupId" @change="onRankingGroupSelect" class="modal-select" :disabled="!canEditRanking">
                  <option value="">-- 请选择 --</option>
                  <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
                <button v-if="canEditGroups" @click="openGroupSettingsPanel" class="manage-btn">管理</button>
              </div>
            </div>

            <div class="form-item">
              <label>班组名称</label>
              <input type="text" v-model="rankEditForm.name" class="modal-input" :disabled="!canEditRanking" />
            </div>

            <div class="form-item">
              <label>完成率/数值 (%)</label>
              <input type="number" v-model.number="rankEditForm.value" class="modal-input" step="0.1" :disabled="!canEditRanking" />
            </div>
          </template>

          <div class="modal-actions">
            <button @click="closeModal" class="cancel-btn">取消</button>
            <button v-if="(editType === 'pioneer' && canEditPioneer) || (editType === 'ranking' && canEditRanking)" @click="saveData" class="save-btn">保存</button>
          </div>
        </div>
      </div>

      <div v-if="showGroupSettingsPanel" class="group-settings-overlay">
        <div class="group-settings-modal">
          <GroupSettingsView @close="closeGroupSettingsPanel" />
        </div>
      </div>

      <!-- 中间分割线 -->
      <div class="divider"></div>

      <!-- 右侧：生产合格率排名 -->
      <div class="ranking_section">
        <div class="section_title">本月生产合格率排名</div>
        <div class="ranking_list">
          <div class="ranking_item" v-for="(item, index) in rankingList" :key="index" @click="openEditModal('ranking', index)" :style="{ cursor: canEditRanking ? 'pointer' : 'default' }">
            <div class="rank_num" :class="'top-' + (index + 1)">{{ index + 1 }}</div>
            <div class="rank_name">{{ item.name }}</div>
            <div class="rank_bar">
              <div class="bar_inner" :style="{ width: item.value + '%', background: getBarGradient(index), boxShadow: getBarShadow(index) }"></div>
            </div>
            <div class="rank_value">{{ item.value }}%</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { canEditFeature, getAuthHeaders } from '@/utils'
import GroupSettingsView from '@/views/secondview/group-settings-view.vue'

export default {
  components: {
    GroupSettingsView
  },
  data() {
    return {
      isLightTheme: false,
      showModal: false,
      editType: 'pioneer', // 'pioneer' | 'ranking'
      editIndex: -1,
      editForm: {
        groupName: '',
        passingRate: 0,
        photoUrl: '',
        photoFile: null,
        photoPreview: ''
      },
      rankEditForm: {
        name: '',
        value: 0
      },
      pioneer: {
        groupName: '',
        passingRate: 0,
        photoUrl: '/people.jpg'
      },
      rankingList: [],
      showGroupSettingsPanel: false,
      groups: [],
      selectedGroupId: ''
    };
  },
  computed: {
    canEditPioneer() {
      return canEditFeature('monthly_star')
    },
    canEditRanking() {
      return canEditFeature('monthly_ranking')
    },
    canEditGroups() {
      return canEditFeature('groups')
    }
  },
  created() {
    this.handleThemeChange();
    this.fetchData();
    if (this.$bus) {
      this.$bus.$on('project-list-update', this.fetchData)
    }
  },
  mounted() {
    window.addEventListener('themeChange', this.handleThemeChange);
    if (this.$bus) {
      this.$bus.$on('groups-updated', this.handleGroupsUpdated)
    }
  },
  beforeDestroy() {
    window.removeEventListener('themeChange', this.handleThemeChange);
    if (this.$bus) {
      this.$bus.$off('project-list-update', this.fetchData)
      this.$bus.$off('groups-updated', this.handleGroupsUpdated)
    }
  },
  methods: {
    notifyNoPermission() {
      if (this.$Message && this.$Message.warning) this.$Message.warning('当前账号仅支持查看')
      else alert('当前账号仅支持查看')
    },
    normalizeRankingList(list) {
      const incoming = Array.isArray(list) ? list : []
      const groupNames = Array.isArray(this.groups)
        ? this.groups
            .map((g) => (g && g.name != null ? String(g.name).trim() : ''))
            .filter(Boolean)
        : []

      const sanitize = (it) => {
        const rawName = it && it.name != null ? String(it.name).trim() : ''
        const name = rawName || ''
        const n = it && it.value != null ? Number(it.value) : NaN
        const value = Number.isFinite(n) ? n : null
        return { name, value }
      }

      const taken = new Set()
      const result = []

      for (const it of incoming) {
        const s = sanitize(it)
        if (!s.name) continue
        if (taken.has(s.name)) continue
        taken.add(s.name)
        result.push(s)
        if (result.length >= 5) break
      }

      for (const name of groupNames) {
        if (result.length >= 5) break
        if (taken.has(name)) continue
        taken.add(name)
        result.push({ name, value: 0 })
      }

      return result.slice(0, 5).map((it) => ({
        name: it.name,
        value: it.value != null ? it.value : 0
      }))
    },
    handleThemeChange() {
      const savedTheme = localStorage.getItem('themeMode');
      this.isLightTheme = savedTheme === 'light';
    },
    async fetchData() {
        try {
            await this.fetchGroups()
            // 获取标兵信息
            const res = await fetch('/api/star', { headers: getAuthHeaders() });
            const data = await res.json();
            if (data) {
                this.pioneer = { ...(data.star || data) };
            }
            
            // 获取排名信息
            const rankRes = await fetch('/api/ranking', { headers: getAuthHeaders() });
            const rankData = await rankRes.json();
            if (rankData.success) {
                this.rankingList = this.normalizeRankingList(rankData.data);
            }
        } catch (err) {
            console.error('Fetch data failed:', err);
        }
    },
    async fetchGroups() {
        try {
            const response = await fetch('/api/groups', { headers: getAuthHeaders() });
            const data = await response.json();
            this.groups = data || [];
        } catch (err) {
            console.error('Fetch groups failed:', err);
        }
    },
    onGroupSelect() {
        if (!this.selectedGroupId) return;
        const group = this.groups.find(g => g.id == this.selectedGroupId);
        if (group) {
            this.editForm.groupName = group.name;
            this.editForm.photoUrl = group.photoUrl;
            this.editForm.photoPreview = group.photoUrl;
            // 清空手动选择的文件，因为我们使用了预设的URL
            this.editForm.photoFile = null;
        }
    },
    onRankingGroupSelect() {
        if (!this.selectedGroupId) return;
        const group = this.groups.find(g => g.id == this.selectedGroupId);
        if (group) {
            this.rankEditForm.name = group.name;
        }
    },
    openGroupSettingsPanel() {
        if (!this.canEditGroups) {
          this.notifyNoPermission()
          return
        }
        this.showGroupSettingsPanel = true
    },
    closeGroupSettingsPanel() {
        this.showGroupSettingsPanel = false
        this.fetchGroups()
        this.fetchData()
    },
    handleGroupsUpdated() {
        this.fetchGroups()
        this.fetchData()
    },
    openEditModal(type, index = -1) {
      if (type === 'pioneer' && !this.canEditPioneer) {
        this.notifyNoPermission()
        return
      }
      if (type === 'ranking' && !this.canEditRanking) {
        this.notifyNoPermission()
        return
      }
      this.editType = type;
      this.editIndex = index;
      this.showModal = true;
      
      if (type === 'pioneer') {
        // Initialize pioneer form
        this.editForm = {
          groupName: this.pioneer.groupName || '',
          passingRate: this.pioneer.passingRate,
          photoUrl: this.pioneer.photoUrl || '',
          photoFile: null,
          photoPreview: this.pioneer.photoUrl || ''
        };
        this.fetchGroups(); // 获取班组列表
      } else if (type === 'ranking' && index > -1) {
        // Initialize ranking form
        const item = this.rankingList[index];
        this.rankEditForm = {
          name: item.name,
          value: item.value
        };
        this.fetchGroups(); // 获取班组列表
      }
    },
    closeModal() {
      this.showModal = false;
    },
    saveData() {
      if (this.editType === 'pioneer') {
        this.savePioneer();
      } else if (this.editType === 'ranking') {
        this.saveRanking();
      }
    },
    async savePioneer() {
      if (!this.canEditPioneer) {
        this.notifyNoPermission()
        return
      }
      const formData = new FormData();
      formData.append('groupName', this.editForm.groupName);
      formData.append('passingRate', this.editForm.passingRate);
      if (this.editForm.photoUrl) {
        formData.append('photoUrl', this.editForm.photoUrl);
      }

      try {
        const response = await fetch('/api/star', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });
        const data = await response.json();
        
        if (data.success || data.data) {
            this.pioneer = { ...(data.data || data) };
            await this.fetchData();
            this.closeModal();
        } else {
            alert('保存失败: ' + (data.message || '未知错误'));
        }
      } catch (err) {
        console.error('保存失败', err);
        alert('保存失败');
      }
    },
    async saveRanking() {
      if (!this.canEditRanking) {
        this.notifyNoPermission()
        return
      }
      if (this.editIndex > -1) {
        const base = this.normalizeRankingList(this.rankingList)
        const next = (base || []).map((it, idx) => {
          if (idx !== this.editIndex) return { ...it }
          return { name: this.rankEditForm.name, value: this.rankEditForm.value }
        })
        next.sort((a, b) => Number(b.value) - Number(a.value))
        try {
          const response = await fetch('/api/ranking', {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ ranking: next })
          })
          const res = await response.json()
          if (res && res.success) {
            this.rankingList = this.normalizeRankingList(res.data || next)
            await this.fetchData()
            this.closeModal()
            return
          }
          alert('保存失败: ' + ((res && res.message) || '未知错误'))
          return
        } catch (e) {
          console.error('保存失败', e)
          alert('保存失败')
          return
        }
      }
      this.closeModal();
    },
    getBarGradient(index) {
      // Top 1: 金色渐变
      if (index === 0) return 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)';
      // Top 2: 银色渐变 (偏蓝灰更有质感)
      if (index === 1) return 'linear-gradient(90deg, #C0C0C0 0%, #E0E0E0 100%)';
      // Top 3: 铜色渐变
      if (index === 2) return 'linear-gradient(90deg, #CD7F32 0%, #FF8C00 100%)';
      // 其他: 默认蓝绿渐变
      return 'linear-gradient(90deg, #00baff 0%, #00ff00 100%)';
    },
    getBarShadow(index) {
      if (index === 0) return '0 0 10px rgba(255, 215, 0, 0.6)';
      if (index === 1) return '0 0 10px rgba(192, 192, 192, 0.6)';
      if (index === 2) return '0 0 10px rgba(205, 127, 50, 0.6)';
      return 'none';
    }
  }
};
</script>

<style lang="scss" scoped>
.monthly_performance_container {
  width: 100%;
  height: 100%;
  padding: 4px 8px 6px;
  box-sizing: border-box;
  
  .performance_content {
    display: flex;
    flex-direction: column; // 改为垂直排列
    height: 100%;
    min-height: 0;
    align-items: center;
    padding: 2px 0;
  }

  .section_title {
    font-size: 22px;
    font-weight: 900;
    color: #00baff;
    margin-bottom: 6px;
    text-align: center;
    text-shadow: 0 0 10px rgba(0, 186, 255, 0.8);
    flex-shrink: 0;
    letter-spacing: 3px;
  }

  /* 上部：标兵部分 */
  .pioneer_section {
    width: 100%;
    flex: 0 0 auto;
    max-height: 66%;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 4px 10px 4px;
    box-sizing: border-box;

    .pioneer_info {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 4px;
      margin-top: 2px;
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }

    .pioneer_image {
      width: 88%;
      max-width: 100%;
      aspect-ratio: 16 / 9;
      max-height: 140px;
      flex-shrink: 0;
      border-radius: 6px;
      border: 1px solid rgba(0, 234, 255, 0.55);
      overflow: hidden;
      box-shadow: 
        0 0 25px rgba(0, 234, 255, 0.4),
        inset 0 0 15px rgba(0, 0, 0, 0.3);
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
      background: linear-gradient(135deg, rgba(0, 40, 60, 0.6) 0%, rgba(0, 20, 40, 0.4) 100%);

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 6px;
        box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4);
        pointer-events: none;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .pioneer_details {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      flex-wrap: wrap;
      gap: 6px 12px;
      width: 100%;
      padding-bottom: 0;

      .pioneer_name {
        font-size: 22px;
        font-weight: 900;
        color: #fff;
        text-align: center;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
        line-height: 1.25;
      }

      .pioneer_stat {
        background: linear-gradient(
          135deg,
          rgba(0, 186, 255, 0.2) 0%,
          rgba(0, 100, 150, 0.15) 100%
        );
        border: 1px solid rgba(0, 234, 255, 0.3);
        padding: 4px 14px;
        border-radius: 8px;
        text-align: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        flex-shrink: 0;

        .label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          margin-right: 8px;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
          font-weight: 600;
        }

        .value {
          font-size: 22px;
          color: #00ff00;
          font-weight: 900;
          text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        }
      }
    }
  }

  /* 中间分割线 */
  .divider {
    width: 90%;
    height: 1px; // 改为横向分割线
    background: linear-gradient(to right, transparent, rgba(0, 186, 255, 0.5), transparent);
    margin: 3px 0;
  }

  /* 下部：排名部分 */
  .ranking_section {
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding-top: 2px;

    .ranking_list {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 2px;
      padding: 0 8px 2px;
      min-height: 0;
    }

    .ranking_item {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;

      .rank_num {
        width: 28px;
        height: 28px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 900;

        &.top-1 { background: #ffd700; color: #000; text-shadow: 0 1px 3px rgba(255, 255, 255, 0.35); box-shadow: 0 0 10px rgba(255, 215, 0, 0.6); }
        &.top-2 { background: #c0c0c0; color: #000; text-shadow: 0 1px 3px rgba(255, 255, 255, 0.35); }
        &.top-3 { background: #cd7f32; color: #000; text-shadow: 0 1px 3px rgba(255, 255, 255, 0.3); }
      }

      .rank_name {
        width: 80px;
        flex-shrink: 0;
        color: rgba(255, 255, 255, 0.95);
        font-size: 15px;
        font-weight: 700;
      }

      .rank_bar {
        flex: 1;
        min-width: 0;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        /* overflow: hidden; Removed to show box-shadow */

        .bar_inner {
          height: 100%;
          background: linear-gradient(90deg, #00baff, #00ff00);
          border-radius: 4px;
          transition: width 1s ease;
        }
      }

      .rank_value {
        width: 56px;
        flex-shrink: 0;
        text-align: right;
        color: #00baff;
        font-weight: 900;
        font-size: 15px;
        text-shadow: 0 0 8px rgba(0, 186, 255, 0.5);
      }
    }
  }

  /* 亮色模式适配 */
  &.light-theme {
    .section_title { color: #37a2da; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2); font-size: 19px; }
    .pioneer_image {
      border-color: #37a2da;
      box-shadow: 0 0 20px rgba(55, 162, 218, 0.5);
      &::after { border-radius: 8px; }
    }
    .pioneer_details {
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 20px;
      .pioneer_name { color: #333; text-align: center; }
      .pioneer_stat {
        background: rgba(55, 162, 218, 0.1);
        border-color: rgba(55, 162, 218, 0.3);
        flex-shrink: 0;
        .label { color: #666; }
        .value { color: #37a2da; }
      }
    }
    .divider { background: linear-gradient(to bottom, transparent, rgba(55, 162, 218, 0.5), transparent); }
    .ranking_item {
      .rank_num { color: #fff; &.top-1, &.top-2, &.top-3 { color: #fff; } }
      .rank_name { color: #333; }
      .rank_bar { background: rgba(0, 0, 0, 0.05); }
      .rank_value { color: #37a2da; }
    }
  }
}

/* Edit Modal Styles - 居中、不超出视口 */
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
        position: relative;
        z-index: 300001;
        background: #001f3f;
        padding: 20px;
        border-radius: 8px;
        border: 2px solid #00baff;
        box-shadow: 0 0 20px rgba(0, 186, 255, 0.5);
        min-width: 320px;
        max-width: 90vw;
        max-height: 85vh;
        overflow-y: auto;
        text-align: center;
        color: #fff;

        h3 {
            margin-bottom: 20px;
            color: #00baff;
            font-size: 18px;
        }

        .form-item {
            margin-bottom: 15px;
            text-align: left;
            
            label {
                display: block;
                margin-bottom: 5px;
                color: #00baff;
                font-size: 14px;
            }

            .modal-input {
                width: 100%;
                padding: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #00baff;
                color: #fff;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
                
                &:focus {
                    outline: none;
                    background: rgba(255, 255, 255, 0.2);
                }
            }

            .file-input-wrapper {
                margin-top: 5px;
                
                .file-input {
                    color: #fff;
                    font-size: 12px;
                }

                .file-preview {
                    margin-top: 10px;
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 2px solid #00baff;
                    margin-left: auto;
                    margin-right: auto;

                    img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                }
            }
            
            .group-select-wrapper {
                display: flex;
                gap: 10px;
                
                .modal-select {
                    flex: 1;
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid #00baff;
                    color: #fff;
                    border-radius: 4px;
                    font-size: 14px;
                    outline: none;
                    
                    option {
                        background: #001f3f;
                        color: #fff;
                    }
                }
                
                .manage-btn {
                    padding: 0 10px;
                    background: rgba(0, 186, 255, 0.2);
                    border: 1px solid #00baff;
                    color: #00baff;
                    border-radius: 4px;
                    cursor: pointer;
                    white-space: nowrap;
                    
                    &:hover { background: rgba(0, 186, 255, 0.4); }
                }
            }
        }

        .modal-actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 20px;

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

.group-settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    z-index: 300002;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
    box-sizing: border-box;
}

.group-settings-modal {
    width: min(1200px, 94vw);
    height: min(780px, 88vh);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 0 28px rgba(0, 186, 255, 0.35);
}
</style>

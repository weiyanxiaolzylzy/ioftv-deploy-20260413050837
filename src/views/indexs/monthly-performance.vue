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
            <div class="pioneer_name">{{ pioneer.groupName }}</div>
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
                <button v-if="canEditGroups" @click="openGroupManager" class="manage-btn">管理</button>
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

            <div class="form-item">
              <label>更换照片</label>
              <div class="file-input-wrapper">
                <input type="file" @change="handleFileChange" accept="image/*" class="file-input" :disabled="!canEditPioneer" />
                <div class="file-preview" v-if="editForm.photoPreview">
                  <img :src="editForm.photoPreview" alt="Preview" />
                </div>
              </div>
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
                <button v-if="canEditGroups" @click="openGroupManager" class="manage-btn">管理</button>
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

      <!-- 班组管理弹窗 -->
      <div v-if="showGroupManager" class="group-manager-modal">
        <div class="manager-content">
          <div class="manager-header">
            <h3>班组管理</h3>
            <span class="close-icon" @click="closeGroupManager">×</span>
          </div>
          
          <div class="group-list">
            <div v-if="groups.length === 0" class="empty-tip">暂无预设班组</div>
            <div v-for="g in groups" :key="g.id" class="group-item">
              <img :src="g.photoUrl" class="group-img">
              <span class="group-name">{{ g.name }}</span>
              <span v-if="canEditGroups" class="delete-btn" @click="deleteGroup(g.id)">删除</span>
            </div>
          </div>
          
          <div class="add-group-form" v-if="canEditGroups">
            <input type="text" v-model="newGroup.name" placeholder="班组名称" class="name-input">
            <div class="file-select-box">
               <button @click="$refs.newGroupFile.click()" class="file-btn">{{ newGroup.file ? '已选图' : '选图' }}</button>
               <input type="file" ref="newGroupFile" style="display:none" @change="handleNewGroupFile" accept="image/*">
            </div>
            <button @click="addGroup" class="add-btn">添加</button>
          </div>
        </div>
      </div>

      <!-- 中间分割线 -->
      <div class="divider"></div>

      <!-- 右侧：生产排名 -->
      <div class="ranking_section">
        <div class="section_title">本月生产排名</div>
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

export default {
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
        groupName: '一班组',
        passingRate: 99.2,
        photoUrl: '' // 使用默认图片
      },
      rankingList: [
        { name: '一班组', value: 99.2 },
        { name: '二班组', value: 98.5 },
        { name: '三班组', value: 97.8 },
        { name: '四班组', value: 96.5 },
        { name: '五班组', value: 95.2 }
      ],
      // 班组管理相关
      showGroupManager: false,
      groups: [],
      selectedGroupId: '',
      newGroup: {
        name: '',
        file: null
      }
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
  },
  mounted() {
    window.addEventListener('themeChange', this.handleThemeChange);
  },
  beforeDestroy() {
    window.removeEventListener('themeChange', this.handleThemeChange);
  },
  methods: {
    notifyNoPermission() {
      if (this.$Message && this.$Message.warning) this.$Message.warning('当前账号仅支持查看')
      else alert('当前账号仅支持查看')
    },
    normalizeRankingList(list) {
      const rankDefaults = [99.2, 98.5, 97.8, 96.5, 95.2]
      const incoming = Array.isArray(list) ? list : []

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

      const groupNames = Array.isArray(this.groups) ? this.groups.map((g) => (g && g.name != null ? String(g.name).trim() : '')).filter(Boolean) : []
      const fallbackNames = ['A1班组', 'A2班组', 'A3班组', 'A4班组', 'A5班组', '一班组', '二班组', '三班组', '四班组', '五班组']
      const candidates = groupNames.length ? groupNames : fallbackNames

      for (const n of candidates) {
        if (result.length >= 5) break
        if (!n) continue
        if (taken.has(n)) continue
        taken.add(n)
        result.push({ name: n, value: null })
      }

      while (result.length < 5) {
        result.push({ name: `第${result.length + 1}名`, value: null })
      }

      return result.slice(0, 5).map((it, idx) => ({
        name: it.name,
        value: it.value != null ? it.value : rankDefaults[idx]
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
                this.pioneer = data.star || data;
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
    openGroupManager() {
        if (!this.canEditGroups) {
          this.notifyNoPermission()
          return
        }
        this.showGroupManager = true;
        this.fetchGroups();
    },
    closeGroupManager() {
        this.showGroupManager = false;
        // 刷新下拉列表
        this.fetchGroups();
    },
    async addGroup() {
        if (!this.canEditGroups) {
          this.notifyNoPermission()
          return
        }
        if (!this.newGroup.name) {
            alert('请输入班组名称');
            return;
        }
        
        const formData = new FormData();
        formData.append('name', this.newGroup.name);
        if (this.newGroup.file) {
            formData.append('photo', this.newGroup.file);
        }

        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData
            });
            const res = await response.json();
            if (res.success) {
                this.groups = res.data;
                this.newGroup = { name: '', file: null };
            } else {
                alert('添加失败');
            }
        } catch (err) {
            console.error('添加班组失败', err);
        }
    },
    async deleteGroup(id) {
        if (!this.canEditGroups) {
          this.notifyNoPermission()
          return
        }
        if (!confirm('确定删除该班组吗？')) return;
        try {
            const response = await fetch(`/api/groups/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const res = await response.json();
            if (res.success) {
                this.groups = res.data;
            }
        } catch (err) {
            console.error('删除班组失败', err);
        }
    },
    handleNewGroupFile(event) {
        const file = event.target.files[0];
        if (file) {
            this.newGroup.file = file;
        }
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
          groupName: this.pioneer.groupName,
          passingRate: this.pioneer.passingRate,
          photoUrl: this.pioneer.photoUrl,
          photoFile: null,
          photoPreview: this.pioneer.photoUrl || '/people.jpg'
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
    handleFileChange(e) {
      const file = e.target.files[0];
      if (file) {
        this.editForm.photoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.editForm.photoPreview = e.target.result;
        };
        reader.readAsDataURL(file);
      }
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
      // 准备提交数据
      const formData = new FormData();
      formData.append('groupName', this.editForm.groupName);
      formData.append('passingRate', this.editForm.passingRate);
      
      if (this.editForm.photoFile) {
        formData.append('photo', this.editForm.photoFile);
      } else if (this.editForm.photoUrl) {
        // 如果没有新文件，但有 URL（比如选了预设班组），传 URL
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
            this.pioneer = data.data || data;
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

        &.top-1 { background: #ffd700; color: #000; text-shadow: none; box-shadow: 0 0 10px rgba(255, 215, 0, 0.6); }
        &.top-2 { background: #c0c0c0; color: #000; text-shadow: none; }
        &.top-3 { background: #cd7f32; color: #000; text-shadow: none; }
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
    .section_title { color: #37a2da; text-shadow: none; font-size: 19px; }
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

.group-manager-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 300002;
      display: flex;
      justify-content: center;
      align-items: center;

      .manager-content {
        background: #001f3f;
        padding: 20px;
        border-radius: 8px;
        border: 2px solid #00baff;
        box-shadow: 0 0 20px rgba(0, 186, 255, 0.5);
        width: 400px;
        max-width: 90%;
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 15px;

        .manager-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(0, 186, 255, 0.3);
            padding-bottom: 10px;

            h3 {
                color: #00baff;
                font-size: 18px;
                margin: 0;
            }

            .close-icon {
                cursor: pointer;
                font-size: 24px;
                &:hover { color: #00baff; }
            }
        }

        .group-list {
            max-height: 300px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-height: 100px;
            background: rgba(0, 0, 0, 0.2);
            padding: 10px;
            border-radius: 4px;

            .empty-tip {
                text-align: center;
                color: rgba(255, 255, 255, 0.5);
                padding: 20px;
            }

            .group-item {
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(255, 255, 255, 0.05);
                padding: 8px;
                border-radius: 4px;

                .group-img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 1px solid #00baff;
                }

                .group-name {
                    flex: 1;
                    color: #fff;
                    font-size: 14px;
                }

                .delete-btn {
                    color: #ff4d4f;
                    cursor: pointer;
                    font-size: 12px;
                    &:hover { text-decoration: underline; }
                }
            }
        }

        .add-group-form {
            display: flex;
            gap: 10px;
            border-top: 1px solid rgba(0, 186, 255, 0.3);
            padding-top: 15px;

            .name-input {
                flex: 1;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(0, 186, 255, 0.5);
                color: #fff;
                padding: 6px;
                border-radius: 4px;
                outline: none;
                &:focus { border-color: #00baff; }
            }

            .file-select-box {
                display: flex;
                align-items: center;
            }

            .file-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: #fff;
                padding: 6px 10px;
                border-radius: 4px;
                cursor: pointer;
                white-space: nowrap;
                font-size: 12px;
                &:hover { background: rgba(255, 255, 255, 0.2); }
            }

            .add-btn {
                background: #00baff;
                color: #fff;
                border: none;
                padding: 0 15px;
                border-radius: 4px;
                font-weight: bold;
                cursor: pointer;
                white-space: nowrap;
                &:hover { background: #009acc; }
            }
        }
      }
    }
</style>

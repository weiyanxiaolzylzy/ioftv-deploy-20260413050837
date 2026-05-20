<template>
  <div class="group-settings-view">
    <div class="settings-header">
      <h2 class="settings-title">班组设置</h2>
      <button class="close-btn" @click="handleClose">返回</button>
    </div>

    <div class="settings-content">
      <!-- 左侧：班组列表 -->
      <div class="group-list-panel">
        <div class="panel-header">
          <span>班组列表</span>
          <button v-if="canEditGroups" class="btn-add" @click="showAddForm = true">+ 添加班组</button>
        </div>

        <div class="group-list">
          <div v-if="groups.length === 0" class="empty-tip">暂无班组，请添加</div>
          <div
            v-for="g in groups"
            :key="g.id"
            class="group-item"
            :class="{ selected: selectedGroup && selectedGroup.id === g.id }"
            @click="selectGroup(g)"
          >
            <img :src="g.photoUrl || '/people.jpg'" class="group-avatar" alt="">
            <div class="group-info">
              <div class="group-name">{{ g.name }}</div>
            </div>
            <div class="group-actions" v-if="canEditGroups">
              <button class="btn-edit" @click.stop="editGroup(g)">编辑</button>
              <button class="btn-delete" @click.stop="deleteGroup(g.id)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：班组详情/编辑表单 -->
      <div class="group-detail-panel">
        <div v-if="!selectedGroup && !isEditing" class="no-selection">
          <div class="no-selection-icon">👆</div>
          <div class="no-selection-text">请从左侧选择一个班组</div>
        </div>

        <!-- 添加/编辑表单 -->
        <div v-else-if="showAddForm || isEditing" class="group-form">
          <h3 class="form-title">{{ isEditing ? '编辑班组' : '添加班组' }}</h3>

          <div class="form-item">
            <label>班组名称</label>
            <input type="text" v-model="formData.name" class="form-input" placeholder="请输入班组名称" />
          </div>

          <div class="form-item">
            <label>班组照片</label>
            <div class="photo-upload">
              <div class="photo-stage">
                <div class="photo-preview" v-if="formData.photoPreview">
                  <img :src="formData.photoPreview" alt="预览" />
                </div>
                <div class="photo-placeholder" v-else>
                  <span>📷</span>
                  <span>暂无照片</span>
                </div>
              </div>
              <div class="photo-toolbar">
                <input
                  type="file"
                  ref="photoInput"
                  @change="handlePhotoChange"
                  accept="image/*"
                  class="photo-native-input"
                />
                <span class="photo-tip">支持 jpg/png，选择文件后会立即显示预览</span>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-cancel" @click="cancelForm">取消</button>
            <button class="btn-save" @click="saveGroup">{{ isEditing ? '保存修改' : '添加' }}</button>
          </div>
        </div>

        <!-- 班组详情 -->
        <div v-else class="group-detail">
          <div class="detail-header">
            <img :src="selectedGroup.photoUrl || '/people.jpg'" class="detail-avatar" alt="">
            <div class="detail-info">
              <h3 class="detail-name">{{ selectedGroup.name }}</h3>
            </div>
          </div>

          <div class="detail-stats" v-if="groupStats">
            <div class="stat-item">
              <span class="stat-label">检测数量</span>
              <span class="stat-value">{{ groupStats.totalCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">合格数量</span>
              <span class="stat-value">{{ groupStats.qualifiedCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">合格率</span>
              <span class="stat-value">{{ groupStats.passRate || '0%' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getAuthHeaders, canEditFeature } from '@/utils'

export default {
  name: 'GroupSettingsView',
  emits: ['close'],
  data() {
    return {
      groups: [],
      selectedGroup: null,
      isEditing: false,
      showAddForm: false,
      canEditGroups: false,
      formData: {
        id: '',
        name: '',
        photo: null,
        photoUrl: '',
        photoPreview: ''
      },
      groupStats: null
    }
  },
  created() {
    this.canEditGroups = canEditFeature('groups')
    this.fetchGroups()
    this.fetchGroupStats()
  },
  mounted() {
    // 监听添加成功事件，刷新列表
    if (this.$bus) {
      this.$bus.$on('groups-updated', this.fetchGroups)
    }
  },
  beforeDestroy() {
    if (this.$bus) {
      this.$bus.$off('groups-updated', this.fetchGroups)
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    async fetchGroups() {
      try {
        const response = await fetch('/api/groups', { headers: getAuthHeaders() });
        const data = await response.json();
        this.groups = Array.isArray(data) ? data : [];
        if (this.selectedGroup && this.selectedGroup.id) {
          const matched = this.groups.find((group) => String(group.id) === String(this.selectedGroup.id))
          if (matched) {
            this.selectedGroup = { ...matched }
          }
        }
      } catch (err) {
        console.error('获取班组列表失败', err);
      }
    },
    async fetchGroupStats() {
      // 从 server 获取班组统计数据
      try {
        const response = await fetch('/api/star', { headers: getAuthHeaders() });
        const data = await response.json();
        // 统计数据可以从 ranking 接口获取
        const rankRes = await fetch('/api/ranking', { headers: getAuthHeaders() });
        const rankData = await rankRes.json();
        if (rankData.success && Array.isArray(rankData.data)) {
          // 将排名数据转换为班组统计数据格式
          this.groupStats = {}
        }
      } catch (err) {
        console.warn('获取班组统计数据失败', err);
      }
    },
    selectGroup(group) {
      this.selectedGroup = group
      this.isEditing = false
      this.showAddForm = false
      // 获取该班组的统计数据
      this.fetchGroupStatsById(group.id)
    },
    async fetchGroupStatsById(groupId) {
      // 根据班组名称获取统计数据
      if (!this.selectedGroup) return
      try {
        const rankRes = await fetch('/api/ranking', { headers: getAuthHeaders() });
        const rankData = await rankRes.json();
        if (rankData.success && Array.isArray(rankData.data)) {
          const groupRank = rankData.data.find(r => r.name === this.selectedGroup.name)
          if (groupRank) {
            this.groupStats = {
              totalCount: 0,
              qualifiedCount: 0,
              passRate: groupRank.value + '%'
            }
          }
        }
      } catch (err) {
        console.warn('获取班组统计数据失败', err);
      }
    },
    editGroup(group) {
      this.isEditing = true
      this.showAddForm = false
      this.formData = {
        id: group.id,
        name: group.name,
        photo: null,
        photoUrl: group.photoUrl || '',
        photoPreview: group.photoUrl || ''
      }
    },
    handlePhotoChange(event) {
      const file = event.target.files[0]
      if (file) {
        this.formData.photo = file
        const reader = new FileReader()
        reader.onload = (e) => {
          this.formData.photoPreview = e.target.result
        }
        reader.readAsDataURL(file)
      }
    },
    cancelForm() {
      this.showAddForm = false
      this.isEditing = false
      this.formData = {
        id: '',
        name: '',
        photo: null,
        photoUrl: '',
        photoPreview: ''
      }
    },
    async saveGroup() {
      if (!this.formData.name || !this.formData.name.trim()) {
        alert('请输入班组名称')
        return
      }

      const formData = new FormData()
      formData.append('name', this.formData.name.trim())

      if (this.formData.photo) {
        formData.append('photo', this.formData.photo)
      } else if (this.formData.photoUrl) {
        formData.append('photoUrl', this.formData.photoUrl)
      }

      try {
        if (this.isEditing) {
          // 更新班组
          const response = await fetch(`/api/groups/${this.formData.id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: formData
          })
          const res = await response.json()
          if (res.success || res.data) {
            const updatedGroup = res.data ? { ...res.data } : null
            if (updatedGroup) {
              this.groups = this.groups.map((group) =>
                String(group.id) === String(updatedGroup.id) ? updatedGroup : group
              )
              this.selectedGroup = updatedGroup
            }
            await this.fetchGroups()
            this.cancelForm()
            if (this.$bus) this.$bus.$emit('groups-updated')
          } else {
            alert('更新失败')
          }
        } else {
          // 添加班组
          const response = await fetch('/api/groups', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
          })
          const res = await response.json()
          if (res.success || res.data) {
            this.groups = Array.isArray(res.data) ? res.data : []
            this.showAddForm = false
            this.formData = {
              id: '',
              name: '',
              photo: null,
              photoUrl: '',
              photoPreview: ''
            }
            this.selectedGroup = null
            if (this.$bus) this.$bus.$emit('groups-updated')
          } else {
            alert('添加失败')
          }
        }
      } catch (err) {
        console.error('保存班组失败', err)
        alert('保存失败，请重试')
      }
    },
    async deleteGroup(id) {
      if (!confirm('确定删除该班组吗？')) return

      try {
        const response = await fetch(`/api/groups/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
        const res = await response.json()
        if (res.success) {
          this.groups = Array.isArray(res.data) ? res.data : []
          if (this.selectedGroup && this.selectedGroup.id === id) {
            this.selectedGroup = null
          }
          if (this.$bus) this.$bus.$emit('groups-updated')
        } else {
          alert('删除失败')
        }
      } catch (err) {
        console.error('删除班组失败', err)
        alert('删除失败，请重试')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.group-settings-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(15, 45, 85, 0.9) 0%, rgba(10, 30, 60, 0.95) 100%);
  border-radius: 12px;
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgba(0, 40, 80, 0.6);
  border-bottom: 2px solid rgba(0, 212, 255, 0.3);
}

.settings-title {
  color: #00d4ff;
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.close-btn {
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid #00d4ff;
  color: #00d4ff;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(0, 212, 255, 0.3);
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.4);
  }
}

.settings-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// 班组列表
.group-list-panel {
  width: 350px;
  border-right: 1px solid rgba(0, 212, 255, 0.2);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(0, 40, 80, 0.4);
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
  color: #00d4ff;
  font-size: 16px;
  font-weight: bold;
}

.btn-add {
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid rgba(0, 212, 255, 0.5);
  color: #00d4ff;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(0, 212, 255, 0.3);
  }
}

.group-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-tip {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 40px 20px;
  font-size: 14px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(0, 40, 80, 0.3);
  border: 1px solid transparent;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 60, 120, 0.4);
    border-color: rgba(0, 212, 255, 0.3);
  }

  &.selected {
    background: rgba(0, 80, 160, 0.5);
    border-color: #00d4ff;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
  }
}

.group-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 212, 255, 0.3);
}

.group-info {
  flex: 1;
}

.group-name {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.group-actions {
  display: flex;
  gap: 6px;
}

.btn-edit, .btn-delete {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit {
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid rgba(0, 212, 255, 0.4);
  color: #00d4ff;

  &:hover {
    background: rgba(0, 212, 255, 0.3);
  }
}

.btn-delete {
  background: rgba(255, 80, 80, 0.15);
  border: 1px solid rgba(255, 80, 80, 0.4);
  color: #ff6b6b;

  &:hover {
    background: rgba(255, 80, 80, 0.3);
  }
}

// 右侧详情/编辑面板
.group-detail-panel {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.5);
}

.no-selection-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.no-selection-text {
  font-size: 16px;
}

// 表单样式
.group-form {
  max-width: 500px;
  margin: 0 auto;
}

.form-title {
  color: #00d4ff;
  font-size: 20px;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
}

.form-item {
  margin-bottom: 20px;

  label {
    display: block;
    color: #fff;
    font-size: 14px;
    margin-bottom: 8px;
    font-weight: 500;
  }
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  background: rgba(0, 40, 80, 0.6);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;

  &:focus {
    border-color: #00d4ff;
    outline: none;
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
}

.photo-upload {
  width: 100%;
  max-width: 360px;
}

.photo-stage {
  position: relative;
  width: 100%;
  height: 220px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}

.photo-preview, .photo-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 2px dashed rgba(0, 212, 255, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(0, 40, 80, 0.4);
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  gap: 4px;

  span:first-child {
    font-size: 34px;
  }
}

.photo-toolbar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.photo-native-input {
  width: 100%;
  max-width: 320px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid rgba(0, 212, 255, 0.65);
  background: rgba(0, 40, 80, 0.5);
  color: #fff;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 212, 255, 0.9);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
  }
}

.photo-tip {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel, .btn-save {
  flex: 1;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: rgba(100, 100, 100, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;

  &:hover {
    background: rgba(100, 100, 100, 0.5);
  }
}

.btn-save {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.8), rgba(0, 150, 255, 0.8));
  border: 1px solid #00d4ff;
  color: #fff;

  &:hover {
    background: linear-gradient(135deg, rgba(0, 212, 255, 1), rgba(0, 150, 255, 1));
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
  }
}

// 班组详情
.group-detail {
  max-width: 500px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
  margin-bottom: 24px;
}

.detail-avatar {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  object-fit: cover;
  border: 3px solid #00d4ff;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.detail-name {
  color: #fff;
  font-size: 24px;
  margin: 0;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  background: rgba(0, 40, 80, 0.5);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-label {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  color: #00d4ff;
  font-size: 24px;
  font-weight: bold;
}
</style>

<template>
  <div class="workspace-view">
    <!-- 主体内容 -->
    <div class="content-body">
      <!-- 左侧工件信息和相机视图 -->
      <div class="left-section">
        <!-- 工件详情面板 -->
        <div class="work-detail-section">
          <div class="section-header">
            <span class="header-icon">⚙</span>
            <span>工件详情</span>
          </div>
        </div>

        <!-- 四个相机视图 -->
        <div class="camera-grid">
          <div class="camera-item">
            <div class="camera-label camera-label--ifc">
              <span>设计图（IFC）</span>
              <div v-if="todayPlanList.length > 0" class="ifc-plan-nav">
                <button class="nav-btn" :disabled="currentPlanIndex <= 0" @click.stop="prevPlan">‹</button>
                <span class="nav-count">{{ currentPlanIndex + 1 }}/{{ todayPlanList.length }}</span>
                <button class="nav-btn" :disabled="currentPlanIndex >= todayPlanList.length - 1" @click.stop="nextPlan">›</button>
              </div>
            </div>
            <div class="camera-display ifc-display">
              <ComponentDetailViewport
                v-if="currentPlanItem && currentPlanItem.ifcUrl && currentPlanItem.ifcElementId"
                :key="'ws-cdv-' + currentPlanItem.ifcElementId"
                :ifcUrl="resolveAbsUrl(currentPlanItem.ifcUrl)"
                :expressID="Number(currentPlanItem.ifcElementId)"
                @loaded="onWsComponentLoaded"
                @error="onWsComponentError"
              />
              <div v-else class="click-hint">
                <div>暂无今日检测计划</div>
                <div style="font-size:10px;margin-top:4px;color:#3a5370;">在「项目构件管理」中设置检测日期为今天</div>
              </div>
            </div>
          </div>
          <div class="camera-item">
            <div class="camera-label">单目相机拍摄组图</div>
            <div class="camera-display" @click="handleImageClick(1)">
              <img v-if="cameraImages[1]" :src="cameraImages[1]" alt="单目相机" />
            </div>
            <input 
              type="file" 
              ref="fileInput1" 
              @change="handleFileChange($event, 1)" 
              accept="image/*" 
              style="display: none" 
            />
          </div>
          <div class="camera-item">
            <div class="camera-label">双目相机拍摄组图</div>
            <div class="camera-display" @click="handleImageClick(2)">
              <img v-if="cameraImages[2]" :src="cameraImages[2]" alt="双目相机" />
            </div>
            <input 
              type="file" 
              ref="fileInput2" 
              @change="handleFileChange($event, 2)" 
              accept="image/*" 
              style="display: none" 
            />
          </div>
          <div class="camera-item">
            <div class="camera-label">3D相机拍摄组图</div>
            <div class="camera-display ply-display">
              <PlyViewer
                ref="plyViewer3d"
                :plyFileId="ply3dFileId"
                :maxPoints="100000"
                :voxelSize="0.01"
                :emptyTitle="ply3dEmptyTitle"
                :emptySub="ply3dEmptySub"
                :showUpload="true"
                backgroundColor="#0a0f1a"
                @loaded="onPly3dLoaded"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧信息和操作区（可折叠） -->
      <div class="right-wrapper" :class="{ 'is-collapsed': rightCollapsed }">
        <!-- 折叠/展开按钮 -->
        <button class="collapse-toggle" @click="rightCollapsed = !rightCollapsed" :title="rightCollapsed ? '展开操作面板' : '收起操作面板'">
          <svg v-if="rightCollapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <div class="right-section">
          <!-- 当前班组信息 -->
          <div class="info-panel current-group-panel" v-if="currentGroupName">
            <div class="panel-header">
              <span>当前检测班组</span>
            </div>
            <div class="current-group-info">
              <img :src="currentGroupPhoto || '/people.jpg'" class="current-group-avatar" alt="">
              <div>
                <div class="current-group-name">{{ currentGroupName }}</div>
                <div class="current-group-meta" v-if="currentTeamLeader || currentQualityInspector || currentQualityManager">
                  <span v-if="currentTeamLeader">班组长：{{ currentTeamLeader }}</span>
                  <span v-if="currentQualityInspector">质检员：{{ currentQualityInspector }}</span>
                  <span v-if="currentQualityManager">质量员：{{ currentQualityManager }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 工件详情 -->
          <div class="info-panel">
            <div class="panel-header">工件详情</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">亮度：</span>
                <span class="info-value">{{ params.brightness }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">曝光：</span>
                <span class="info-value">{{ params.exposure }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">焦距：</span>
                <span class="info-value">{{ params.contrast }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">全景：</span>
                <span class="info-value">{{ params.openCloseDegree }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">色调：</span>
                <span class="info-value">{{ params.colorTemp }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">清晰度：</span>
                <span class="info-value">{{ params.sharpness }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">垂直旋转角度：</span>
                <span class="info-value">{{ params.apertureRatio }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">水平旋转角度：</span>
                <span class="info-value">{{ params.virtualPoint }}</span>
              </div>
            </div>
          </div>

          <!-- 操作栏 -->
          <div class="operation-panel">
            <div class="panel-header-line">操作栏</div>
            <div class="operation-grid">
              <div class="op-row">
                <button class="op-btn import-btn" @click="openUploadModal">
                  <span class="icon">📥</span> 批量导入模型
                </button>
              </div>
              <div class="op-row">
                <button class="op-btn">开始</button>
                <button class="op-btn">拍摄</button>
              </div>
              <div class="op-row">
                <button class="op-btn">旋转</button>
                <button class="op-btn">计算</button>
              </div>
              <div class="op-row">
                <button class="op-btn">预设计算</button>
              </div>
              <div class="angle-row">
                <button class="op-btn angle-btn">角度</button>
                <input type="text" v-model="angle" class="angle-value" />
                <div class="angle-arrows">
                  <button class="arrow-btn" @click="adjustAngle(1)">▲</button>
                  <button class="arrow-btn" @click="adjustAngle(-1)">▼</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- IFC查看弹窗 -->
    <div v-if="showIfcModal" class="dxf-modal" @click.self="closeIfcModal">
      <div class="dxf-modal-content" style="width: 80%; height: 80%;">
        <div class="dxf-modal-header">
          <span>IFC模型查看</span>
          <button class="close-btn" @click="closeIfcModal">×</button>
        </div>
        <div class="dxf-modal-body" style="display: flex;">
          <!-- 左侧文件列表 -->
          <div class="ifc-list" style="width: 250px; background: rgba(0,0,0,0.3); border-right: 1px solid #333; overflow-y: auto;">
            <div 
              v-for="file in ifcList" 
              :key="file.filename"
              class="ifc-item"
              :class="{ active: currentIfcUrl === file.url }"
              @click="selectIfc(file.url)"
              style="padding: 10px; cursor: pointer; color: #ccc; border-bottom: 1px solid rgba(255,255,255,0.1);"
            >
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="min-width: 0; flex: 1;">
                  <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ file.originalName }}</div>
                  <div style="font-size: 10px; color: #666;">{{ new Date(file.uploadTime).toLocaleString() }}</div>
                </div>
                <button
                  v-if="canEdit"
                  @click.stop="deleteIfc(file)"
                  style="background: transparent; border: 1px solid rgba(255,255,255,0.25); color: #ccc; font-size: 12px; padding: 2px 6px; border-radius: 4px; cursor: pointer;"
                >
                  删除
                </button>
              </div>
            </div>
            <div v-if="ifcList.length === 0" style="padding: 20px; text-align: center; color: #666;">暂无文件</div>
          </div>
          
          <!-- 右侧预览 -->
          <div style="flex: 1; position: relative;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #666;">选择左侧文件后关闭弹窗即可</div>
          </div>
        </div>
        <div class="dxf-modal-footer">
          <span>鼠标拖动旋转 | 滚轮缩放 | 右键平移</span>
        </div>
      </div>
    </div>

    <!-- 批量上传弹窗 -->
    <div v-if="showUploadModal" class="upload-modal" @click.self="closeUploadModal">
      <div class="upload-modal-content">
        <div class="upload-modal-header">
          <div class="header-title">
            <span class="icon">📥</span>
            <span>批量导入 IFC 模型</span>
          </div>
          <button class="close-btn" @click="closeUploadModal">×</button>
        </div>
        
        <div class="upload-modal-body">
          <!-- 上传区域 -->
          <div 
            class="upload-dropzone" 
            :class="{ 'dragging': isDragging, 'disabled': isUploading }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="triggerFileSelect"
          >
            <div class="dropzone-content">
              <div class="upload-icon">☁️</div>
              <div class="upload-text">点击或拖拽 IFC 文件到此处</div>
              <div class="upload-subtext">支持多文件批量上传，仅限 .ifc 格式</div>
            </div>
            <input 
              type="file" 
              ref="ifcUploadInput" 
              multiple 
              accept=".ifc" 
              style="display: none" 
              @change="handleFileSelect"
            />
          </div>

          <!-- 文件列表 -->
          <div class="file-list-container" v-if="uploadFiles.length > 0">
            <div class="list-header">
              <span>待上传列表 ({{ uploadFiles.length }})</span>
              <button class="clear-btn" @click="clearFiles" :disabled="isUploading">清空列表</button>
            </div>
            <div class="file-list">
              <div class="file-item" v-for="(file, index) in uploadFiles" :key="index">
                <div class="file-icon">📄</div>
                <div class="file-info">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-size">{{ formatSize(file.size) }}</div>
                </div>
                <div class="file-status">
                  <span v-if="file.status === 'pending'" class="status-pending">等待中</span>
                  <span v-else-if="file.status === 'success'" class="status-success">✓ 成功</span>
                  <span v-else-if="file.status === 'error'" class="status-error">✗ 失败</span>
                </div>
                <button class="remove-btn" @click.stop="removeFile(index)" :disabled="isUploading">×</button>
              </div>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="upload-progress" v-if="isUploading || uploadProgress > 0">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <div class="progress-text">{{ uploadProgress }}%</div>
          </div>

          <!-- 结果统计 -->
          <div class="upload-result" v-if="uploadResult">
            <div class="result-item success">
              <span class="count">{{ uploadResult.success }}</span>
              <span class="label">成功导入</span>
            </div>
            <div class="result-item fail">
              <span class="count">{{ uploadResult.fail }}</span>
              <span class="label">失败</span>
            </div>
          </div>
        </div>

        <div class="upload-modal-footer">
          <button class="btn btn-cancel" @click="closeUploadModal" :disabled="isUploading">取消</button>
          <button 
            class="btn btn-primary" 
            @click="startUpload" 
            :disabled="isUploading || uploadFiles.length === 0"
          >
            {{ isUploading ? '上传中...' : '开始导入' }}
          </button>
        </div>
      </div>

      <!-- 批量选择后的构件管理器弹窗 -->
      <ComponentManager
        v-if="showComponentManager"
        v-model="showComponentManager"
        :project="componentManagerProject"
        :ifcUrl="currentIfcUrl"
        @save-all="onComponentManagerSave"
        @batch-updated="onBatchUpdated"
        @component-updated="onComponentUpdated"
      />
    </div>
  </div>
</template>

<script>
import AdvancedIfcViewer from '@/components/AdvancedIfcViewer.vue';
import ComponentManager from '@/components/ComponentManager.vue';
import ComponentDetailViewport from '@/components/ComponentDetailViewport.vue';
import PlyViewer from '@/components/PlyViewer.vue';
import axios from 'axios';
import { canEditFeature, getAuthHeaders } from '@/utils'

export default {
  name: 'WorkspaceView',
  components: {
    AdvancedIfcViewer,
    ComponentManager,
    ComponentDetailViewport,
    PlyViewer,
  },
  props: {
    params: {
      type: Object,
      default: () => ({
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
      })
    }
  },
  data() {
    return {
      currentTime: '',
      angle: '60°',
      timer: null,
      cameraImages: [null, null, null, null],
      showIfcModal: false,
      ifcList: [],
      currentIfcUrl: '',
      showUploadModal: false,
      isDragging: false,
      isUploading: false,
      uploadProgress: 0,
      uploadFiles: [],
      uploadResult: null,
      rightCollapsed: false,
      // 当前选中的 IFC 构件
      currentSelectedElement: null,

      // 今日检测计划（与主页面联动）
      todayPlanList: [],
      currentPlanIndex: 0,

      // 批量选择模式
      batchSelectMode: false,
      selectedBatchIds: [],

      // ComponentManager 弹窗
      showComponentManager: false,
      componentManagerProject: null,

      // 当前班组信息
      currentGroupName: '',
      currentGroupPhoto: '',
      currentTeamLeader: '',
      currentQualityInspector: '',
      currentQualityManager: '',
      groups: [],

      // 3D相机点云视图
      ply3dFileId: '',
      ply3dLoadedFileId: '',
      ply3dEmptyTitle: '暂无点云数据',
      ply3dEmptySub: '上传 PLY 文件查看 3D 点云',
    }
  },
  computed: {
    canEdit() {
      return canEditFeature('qa_only')
    },
    currentPlanItem() {
      return this.todayPlanList[this.currentPlanIndex] || null;
    }
  },

  watch: {
    ply3dLoadedFileId(val) {
      if (val) {
        this.$bus.$emit('ply-cloud-loaded', {
          fileId: val,
          filename: this.ply3dEmptyTitle,
          syncSource: 'workspace-view',
        });
      }
    },
  },

  mounted() {
    this.updateTime()
    this.timer = setInterval(this.updateTime, 1000)
    this.fetchIfcList()
    this.loadTodayPlan()
    this.loadGroupFromStorage()
    if (this.$bus) {
      this.$bus.$on('current-plan-item-change', this.onPlanItemChange)
      this.$bus.$on('project-list-update', this.loadTodayPlan)
      this.$bus.$on('component-ifc-sync', this.onBusComponentHighlight)
      this.$bus.$on('component-ifc-request', this.onBusComponentHighlight)
      this.$bus.$on('current-group-changed', this.onCurrentGroupChanged)
      this.$bus.$on('groups-updated', this.fetchGroups)
      this.$bus.$on('ply-cloud-loaded', this.onPlyCloudLoaded)
      this.$bus.$on('ply-cloud-load', this.onPlyCloudLoad)
    }
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
    if (this.$bus) {
      this.$bus.$off('current-plan-item-change', this.onPlanItemChange)
      this.$bus.$off('project-list-update', this.loadTodayPlan)
      this.$bus.$off('component-ifc-sync', this.onBusComponentHighlight)
      this.$bus.$off('component-ifc-request', this.onBusComponentHighlight)
      this.$bus.$off('current-group-changed', this.onCurrentGroupChanged)
      this.$bus.$off('groups-updated', this.fetchGroups)
      this.$bus.$off('ply-cloud-loaded', this.onPlyCloudLoaded)
      this.$bus.$off('ply-cloud-load', this.onPlyCloudLoad)
    }
  },
  methods: {
    notifyNoPermission() {
      if (this.$Message && this.$Message.warning) this.$Message.warning('当前账号仅支持查看')
      else alert('当前账号仅支持查看')
    },
    loadGroupFromStorage() {
      this.syncCurrentGroupFromPlan()
    },
    async fetchGroupPhoto(groupId) {
      try {
        const response = await fetch('/api/groups', { headers: getAuthHeaders() });
        const data = await response.json();
        const groups = Array.isArray(data) ? data : [];
        const group = groups.find(g => String(g.id) === String(groupId))
        if (group) {
          this.currentGroupPhoto = group.photoUrl || ''
          localStorage.setItem('currentGroupPhoto', this.currentGroupPhoto)
        }
      } catch (err) {
        console.warn('获取班组照片失败', err)
      }
    },
    async fetchGroups() {
      try {
        const response = await fetch('/api/groups', { headers: getAuthHeaders() });
        const data = await response.json();
        this.groups = Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn('获取班组列表失败', err)
      }
    },
    onCurrentGroupChanged() {
      this.syncCurrentGroupFromPlan()
    },
    syncCurrentGroupFromPlan() {
      const current = this.currentPlanItem || {}
      this.currentGroupName = current.teamName || current.teamLeader || ''
      this.currentTeamLeader = current.teamLeader || ''
      this.currentQualityInspector = current.qualityInspector || ''
      this.currentQualityManager = current.qualityManager || ''
      if (!this.currentGroupName) {
        this.currentGroupPhoto = ''
        return
      }
      const group = this.groups.find(g => g.name === this.currentGroupName)
      this.currentGroupPhoto = group ? (group.photoUrl || '') : ''
    },
    normalizeAxiosPayload(res) {
      if (res && typeof res === 'object' && 'status' in res && 'headers' in res && 'config' in res) return res.data
      return res
    },
    updateTime() {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      this.currentTime = `${hours}:${minutes}`
    },
    adjustAngle(delta) {
      const current = parseInt(this.angle)
      const newValue = current + delta
      this.angle = `${newValue}°`
    },
    openIfcModal() {
      this.showIfcModal = true;
      this.fetchIfcList();
    },
    async fetchIfcList() {
      try {
        const res = await axios.get('/api/ifc/list', { headers: getAuthHeaders() });
        const payload = this.normalizeAxiosPayload(res)
        if (payload && payload.success) {
          const origin = window.location.origin
          this.ifcList = (payload.data || []).map(f => ({
            ...f,
            url: `${origin}${f.url}`
          }));
          // Default to the first file if available
          if (this.ifcList.length > 0) {
            this.currentIfcUrl = this.ifcList[0].url;
          }
        }
      } catch (e) {
        console.error('Failed to fetch IFC list', e);
      }
    },
    selectIfc(url) {
      this.currentIfcUrl = url;
    },
    async deleteIfc(file) {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      const name = file && file.originalName ? String(file.originalName) : '该文件'
      const ok = window.confirm(`确认删除：${name}？`)
      if (!ok) return
      try {
        const filename = file && file.filename ? String(file.filename) : ''
        if (!filename) throw new Error('缺少文件名')
        const res = await axios.delete(`/api/ifc/${encodeURIComponent(filename)}`, { headers: getAuthHeaders() })
        const payload = this.normalizeAxiosPayload(res)
        if (payload && payload.success === false) throw new Error(payload.message || '删除失败')
        if (this.$Message && this.$Message.success) this.$Message.success('删除成功')
        await this.fetchIfcList()
      } catch (e) {
        const msg = e && e.message ? e.message : '删除失败'
        if (this.$Message && this.$Message.error) this.$Message.error(msg)
        else alert(msg)
      }
    },
    closeIfcModal() {
      this.showIfcModal = false;
    },
    openUploadModal() {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      this.showUploadModal = true;
      this.uploadFiles = [];
      this.uploadProgress = 0;
      this.uploadResult = null;
    },
    closeUploadModal() {
      if (this.isUploading) return;
      this.showUploadModal = false;
    },
    triggerFileSelect() {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      this.$refs.ifcUploadInput.click();
    },
    handleFileSelect(event) {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      const files = event.target.files;
      if (files) {
        this.addFiles(files);
      }
    },
    handleDrop(event) {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      this.isDragging = false;
      const files = event.dataTransfer.files;
      if (files) {
        this.addFiles(files);
      }
    },
    addFiles(files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().endsWith('.ifc')) {
          this.uploadFiles.push({
            name: file.name,
            size: file.size,
            file: file,
            status: 'pending'
          });
        } else {
          this.$Message.error(`文件 ${file.name} 格式错误，仅支持 .ifc`);
        }
      }
    },
    removeFile(index) {
      this.uploadFiles.splice(index, 1);
    },
    clearFiles() {
      this.uploadFiles = [];
    },
    formatSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    async startUpload() {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      if (this.uploadFiles.length === 0) return;
      
      this.isUploading = true;
      this.uploadProgress = 0;
      this.uploadResult = null;
      
      const formData = new FormData();
      this.uploadFiles.forEach(f => {
        formData.append('files', f.file);
      });
      
      try {
        const response = await axios.post('/api/ifc/batch', formData, {
          headers: getAuthHeaders({ 'Content-Type': 'multipart/form-data' }),
          timeout: 600000, // 10 minutes timeout for large files
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            this.uploadProgress = percentCompleted;
          }
        });

        const payload = this.normalizeAxiosPayload(response)
        if (payload && payload.success) {
          const result = payload.data;
          this.uploadResult = {
            success: result.length,
            fail: 0
          };
          this.uploadFiles = []; // Clear file list on success
          this.$Message.success('导入完成');
          this.fetchIfcList(); // Refresh list
          
          // Close modal after short delay
          setTimeout(() => {
            this.showUploadModal = false;
          }, 1500);
        } else {
          this.uploadResult = {
            success: 0,
            fail: this.uploadFiles.length
          };
          this.uploadFiles.forEach(f => {
             // Mark all as error for now, or use index from response if available
             // For simple implementation, we mark all
          });
          this.$Message.error('导入失败: ' + ((payload && payload.message) || (payload && payload.msg) || '未知错误'));
        }
      } catch (error) {
        console.error('Upload error:', error);
        this.uploadResult = {
          success: 0,
          fail: this.uploadFiles.length
        };
        this.$Message.error('网络错误: ' + ((error && (error.message || error.msg)) || '服务器连接失败'));
      } finally {
        this.isUploading = false;
      }
    },
    handleImageClick(index) {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      const input = this.$refs[`fileInput${index}`]
      if (input) {
        if (Array.isArray(input)) {
          input[0].click()
        } else {
          input.click()
        }
      }
    },
    handleFileChange(event, index) {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      const file = event.target.files[0]
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.$set(this.cameraImages, index, e.target.result)
        }
        reader.readAsDataURL(file)
      }
    },

    // ─── 今日检测计划（与主页面联动） ─────────────────────────────────────
    async loadTodayPlan() {
      try {
        const res = await fetch('/api/today-plan', { headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.success && Array.isArray(data.data)) {
          this.todayPlanList = data.data.map((item) => ({
            projectName: item.project || '',
            projectId: item.projectId || '',
            componentName: item.componentName || '',
            ifcUrl: item.ifcUrl || '',
            ifcElementId: item.ifcElementId || '',
            teamName: item.teamName || '',
            teamLeader: item.teamLeader || '',
            qualityInspector: item.qualityInspector || '',
            qualityManager: item.qualityManager || '',
          }));
          this.currentPlanIndex = 0;
          this.syncCurrentGroupFromPlan();
          return;
        }
      } catch (e) { /* ignore */ }
      this.todayPlanList = [];
      this.currentPlanIndex = 0;
      this.syncCurrentGroupFromPlan();
    },

    onPlanItemChange({ index }) {
      if (index >= 0 && index < this.todayPlanList.length) {
        this.currentPlanIndex = index;
        this.syncCurrentGroupFromPlan();
      }
    },

    emitPlanChange() {
      if (this.$bus) {
        this.$bus.$emit('current-plan-item-change', { index: this.currentPlanIndex });
      }
    },

    /** 与主屏「构件模型」等板块对齐：按 expressID / IFC URL 跳到今日计划中对应条目 */
    onBusComponentHighlight(payload) {
      if (!payload) return;
      this.loadTodayPlan();
      const expressID =
        payload.expressID != null
          ? Number(payload.expressID)
          : payload.element && payload.element.expressID != null
            ? Number(payload.element.expressID)
            : NaN;
      if (expressID == null || Number.isNaN(expressID)) return;
      const targetUrl = payload.ifcUrl || (payload.element && payload.element.ifcUrl) || '';
      const norm = (u) => {
        if (!u) return '';
        const s = String(u).trim();
        if (!s) return '';
        try {
          if (/^https?:\/\//i.test(s)) {
            const path = s.replace(/^https?:\/\/[^/]+/i, '');
            return path.replace(/\/$/, '') || s.replace(/\/$/, '');
          }
          return s.replace(/^\//, '').replace(/\/$/, '');
        } catch (e) {
          return s;
        }
      };
      const nu = norm(targetUrl);
      let idx = this.todayPlanList.findIndex((item) => {
        const idMatch = Number(item.ifcElementId) === expressID;
        if (!idMatch) return false;
        if (!nu) return true;
        const iu = norm(item.ifcUrl || '');
        return iu === nu || (iu && nu && (iu.endsWith(nu) || nu.endsWith(iu)));
      });
      if (idx < 0) {
        idx = this.todayPlanList.findIndex((item) => Number(item.ifcElementId) === expressID);
      }
      if (idx >= 0) {
        this.currentPlanIndex = idx;
        this.syncCurrentGroupFromPlan();
      }
    },

    prevPlan() {
      if (this.currentPlanIndex > 0) {
        this.currentPlanIndex--;
        this.syncCurrentGroupFromPlan();
        this.emitPlanChange();
      }
    },

    nextPlan() {
      if (this.currentPlanIndex < this.todayPlanList.length - 1) {
        this.currentPlanIndex++;
        this.syncCurrentGroupFromPlan();
        this.emitPlanChange();
      }
    },

    resolveAbsUrl(u) {
      if (!u) return '';
      if (/^https?:\/\//i.test(u)) return u;
      const base = (process.env.VUE_APP_BACKEND_URL || process.env.VUE_APP_BASE_API || 'http://localhost:8890').replace(/\/$/, '');
      return `${base}/${u.replace(/^\//, '')}`;
    },

    onWsComponentLoaded() {},
    onWsComponentError() {},
    onPly3dLoaded({ count, info }) {
      console.log(`[WorkspaceView] 3D PLY loaded: ${count} points`, info);
      this.ply3dLoadedFileId = this.ply3dFileId || `local-${Date.now()}`;
    },
    onPlyCloudLoaded({ fileId, filename, info, syncSource }) {
      // 避免回环：只接受来自其他页面的同步（不处理自己发出的事件）
      if (syncSource && syncSource !== 'workspace-view') {
        this.ply3dFileId = fileId;
        this.ply3dEmptyTitle = filename || '点云已加载';
        this.ply3dEmptySub = `已从主页面同步: ${filename}`;
      }
    },
    onPlyCloudLoad({ fileId, syncSource }) {
      if (syncSource && syncSource !== 'workspace-view') {
        this.ply3dFileId = fileId;
        this.ply3dEmptyTitle = '正在加载...';
        this.ply3dEmptySub = '从主页面同步点云数据';
      }
    },

    // ─── IFC 构件交互 ───────────────────────────────────────────────────────
    onIfcElementClick(element) {
      this.currentSelectedElement = element;
      console.log('[Workspace] IFC element clicked:', element);
      // 可以在这里显示构件简要信息到工件详情面板
      if (this.$bus) {
        this.$bus.$emit('detection-element-selected', {
          element,
          ifcUrl: this.currentIfcUrl,
          source: 'workspace'
        });
      }
    },

    onIfcElementDblClick(element) {
      this.currentSelectedElement = element;
      console.log('[Workspace] IFC element double-clicked:', element);
      // 双击时弹出构件小窗口（AdvancedIfcViewer 组件自带）
      // 推送选中构件到主页面的"构件模型"板块
      if (this.$bus) {
        this.$bus.$emit('detection-element-selected', {
          element,
          ifcUrl: this.currentIfcUrl,
          source: 'workspace'
        });
        this.$bus.$emit('component-ifc-sync', {
          ifcUrl: this.currentIfcUrl,
          expressID: element.expressID,
          element
        });
      }
    },

    onIfcModelLoaded({ modelID, elementCount }) {
      console.log(`[Workspace] IFC model loaded: ${elementCount} elements`);
    },

    // ─── 推送当前检测构件到主页面 ───────────────────────────────────────────
    pushComponentToHomepage(element, ifcUrl) {
      if (this.$bus) {
        this.$bus.$emit('component-ifc-sync', {
          ifcUrl: ifcUrl,
          expressID: element.expressID,
          element
        });
      }
    },

    // ─── 批量选择模式 ─────────────────────────────────────────────────────
    toggleBatchSelectMode() {
      if (this.batchSelectMode) {
        // 退出多选模式
        if (this.selectedBatchIds.length > 0) {
          // 有已选构件，打开 ComponentManager 进行批量指派
          this.openComponentManagerForBatch();
        } else {
          this.batchSelectMode = false;
          const viewer = this.$refs.ifcViewer;
          if (viewer) viewer.clearMultiSelection();
        }
      } else {
        // 进入多选模式
        this.batchSelectMode = true;
        this.selectedBatchIds = [];
      }
    },

    onBatchSelected({ ids }) {
      this.selectedBatchIds = ids || [];
      // 如果已经有选中的，直接打开管理器（用户点击"完成选择"）
    },

    async openComponentManagerForBatch() {
      if (this.selectedBatchIds.length === 0) return;

      // 加载当前项目数据
      const project = await this.loadCurrentProject();
      if (!project) {
        alert('未找到关联项目，请先在地图上选择项目');
        this.batchSelectMode = false;
        const viewer = this.$refs.ifcViewer;
        if (viewer) viewer.clearMultiSelection();
        this.selectedBatchIds = [];
        return;
      }

      // 只保留与当前 IFC 模型中 expressID 匹配的构件
      const matchedComponents = project.components ? project.components.filter(c =>
        this.selectedBatchIds.some(id => String(id) === String(c.ifcElementId))
      ) : [];

      this.componentManagerProject = { ...project, components: matchedComponents };
      this.showComponentManager = true;
      this.batchSelectMode = false;

      const viewer = this.$refs.ifcViewer;
      if (viewer) viewer.clearMultiSelection();
      this.selectedBatchIds = [];
    },

    async loadCurrentProject() {
      try {
        const res = await fetch('/api/projects', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          const normalizeUrl = (u) => {
            const s = String(u || '').trim();
            if (!s) return '';
            return s.replace(/^https?:\/\/[^/]+/i, '').replace(/\/$/, '');
          };
          const current = normalizeUrl(this.currentIfcUrl);
          return data.data.find(p => normalizeUrl(p.ifcUrl) === current) || data.data[0] || null;
        }
      } catch (e) {
        console.error('加载项目数据失败', e);
      }
      return null;
    },

    // ComponentManager 保存后的回调
    async onComponentManagerSave(project) {
      // 保存到后端
      try {
        const res = await fetch(`/api/projects/${project.id}/components`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ components: project.components })
        });
        const data = await res.json();
        if (data && data.success) {
          this.$Message && this.$Message.success('保存成功');
          // 通知主页面刷新数据
          if (this.$bus) {
            this.$bus.$emit('project-list-update');
            this.$bus.$emit('project-change', project);
          }
        } else {
          this.$Message && this.$Message.error('保存失败');
        }
      } catch (e) {
        this.$Message && this.$Message.error('保存失败');
      }
    },

    onBatchUpdated(components) {
      // 批量指派完成，同步到后端并通知主页面
      if (!this.componentManagerProject) return
      this.saveProjectToBackend(this.componentManagerProject)
      if (this.$bus) {
        this.$bus.$emit('project-list-update')
      }
    },

    onComponentUpdated(component) {
      // 单个构件更新，同步到后端
      if (this.componentManagerProject) {
        this.saveProjectToBackend(this.componentManagerProject)
      }
      if (this.$bus) {
        this.$bus.$emit('project-list-update')
      }
    },

    async saveProjectToBackend(project) {
      try {
        const res = await fetch(`/api/projects/${project.id}/components`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ components: project.components })
        })
        const data = await res.json()
        if (data && data.success) {
          this.$Message && this.$Message.success('保存成功')
        } else {
          this.$Message && this.$Message.error('保存失败')
        }
      } catch (e) {
        this.$Message && this.$Message.error('保存失败')
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.workspace-view {
  width: 100%;
  height: 100%;
  background: transparent;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px;
  box-sizing: border-box;
  
  .content-body {
    flex: 1;
    display: flex;
    gap: 10px;
    overflow: hidden;
    min-height: 0;
  }
  
  .left-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
    min-width: 0;
  }
  
  .work-detail-section {
    background: rgba(15, 35, 60, 0.7);
    border-radius: 4px;
    border: 1px solid rgba(0, 212, 255, 0.3);
    flex-shrink: 0;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.1);
    
    .section-header {
      height: 32px;
      background: rgba(0, 212, 255, 0.15);
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-size: 13px;
      color: #00d4ff;
      font-weight: bold;
      
      .header-icon {
        margin-right: 6px;
        font-size: 14px;
        color: #00d4ff;
        text-shadow: 0 0 8px #00d4ff;
      }
    }
  }
  
  .camera-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 8px;
    overflow: hidden;
    min-height: 0;
    
    .camera-item {
      background: rgba(15, 35, 60, 0.7);
      border-radius: 4px;
      border: 1px solid rgba(0, 212, 255, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.1);
      
      .camera-label {
        height: 32px;
        background: rgba(0, 212, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: #00d4ff;
        font-weight: bold;
        flex-shrink: 0;
        border-bottom: 1px solid rgba(0, 212, 255, 0.2);

        &.camera-label--ifc {
          justify-content: space-between;
          padding: 0 8px;
        }

        .ifc-plan-nav {
          display: flex;
          align-items: center;
          gap: 3px;

          .nav-btn {
            width: 20px;
            height: 20px;
            background: rgba(0, 186, 255, 0.15);
            border: 1px solid rgba(0, 186, 255, 0.4);
            border-radius: 3px;
            color: #00d4ff;
            font-size: 14px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            &:disabled { opacity: 0.3; cursor: default; }
            &:not(:disabled):hover { background: rgba(0, 186, 255, 0.3); }
          }

          .nav-count {
            font-size: 10px;
            color: rgba(0, 212, 255, 0.6);
            min-width: 24px;
            text-align: center;
          }
        }
      }
      
      .camera-display.ifc-display {
        cursor: default;
        padding: 0;
        align-items: stretch;
        justify-content: stretch;
        min-height: 0;
        :deep(.cdv-wrapper) {
          border-radius: 0;
          flex: 1;
          min-height: 0;
          width: 100%;
          align-self: stretch;
        }
      }

      .camera-display {
        flex: 1;
        background: #000;
        min-height: 60px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.3s;
        overflow: hidden;

        &.ply-display {
          cursor: default;
          align-items: stretch;
          justify-content: stretch;
          padding: 0;
          :deep(.ply-viewer) {
            flex: 1;
            min-height: 0;
          }
        }
        
        &:hover {
          background: #000;
          border: 1px solid #00d4ff;
          box-shadow: inset 0 0 15px rgba(0, 212, 255, 0.2);
        }
        
        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
        }
        
        .upload-hint {
          color: #5a7390;
          font-size: 11px;
          user-select: none;
        }
      }
    }
  }
  
  .right-wrapper {
    position: relative;
    display: flex;
    align-items: stretch;
    transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);

    &.is-collapsed {
      .right-section {
        width: 0;
        min-width: 0;
        max-width: 0;
        opacity: 0;
        pointer-events: none;
        overflow: hidden;
      }
    }
  }

  .collapse-toggle {
    width: 28px;
    min-width: 28px;
    background: rgba(0, 212, 255, 0.15);
    border: 1px solid rgba(0, 212, 255, 0.35);
    border-right: none;
    border-radius: 8px 0 0 8px;
    color: #00d4ff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;

    &:hover {
      background: rgba(0, 212, 255, 0.3);
      border-color: rgba(0, 212, 255, 0.6);
    }
  }

  .right-section {
    width: 240px;
    min-width: 240px;
    max-width: 240px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
    min-height: 0;
    transition: opacity 0.3s ease, width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      min-width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .info-panel {
    flex: 1;
    background: rgba(15, 35, 60, 0.7);
    border-radius: 4px;
    border: 1px solid rgba(0, 212, 255, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.1);
    
    .panel-header {
      height: 32px;
      background: rgba(0, 212, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #00d4ff;
      font-weight: bold;
      border-bottom: 1px solid rgba(0, 212, 255, 0.2);
      flex-shrink: 0;
    }

    .current-group-panel {
      margin-bottom: 8px;
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 6px;
      overflow: hidden;
    }

    .current-group-info {
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .current-group-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(0, 212, 255, 0.5);
    }

    .current-group-name {
      color: #fff;
      font-size: 16px;
      font-weight: bold;
    }

    .current-group-meta {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      color: rgba(255, 255, 255, 0.78);
      font-size: 11px;
      line-height: 1.4;
    }
    
    .info-grid {
      flex: 1;
      padding: 8px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(4, 1fr);
      gap: 6px;
      overflow: hidden;
      
      .info-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        font-size: 11px;
        background: rgba(0, 212, 255, 0.05);
        padding: 0 8px;
        border-radius: 3px;
        border: 1px solid rgba(0, 212, 255, 0.1);
        min-height: 0;
        
        .info-label {
          color: #4a90e2;
          white-space: nowrap;
          font-size: 10px;
        }
        
        .info-value {
          color: #00d4ff;
          font-weight: bold;
          font-size: 12px;
          text-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
        }
      }
    }
  }
  
  .operation-panel {
    flex: 1;
    background: rgba(15, 35, 60, 0.7);
    border-radius: 4px;
    border: 1px solid rgba(0, 212, 255, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.1);
    
    .panel-header-line {
      height: 32px;
      background: rgba(0, 212, 255, 0.1);
      border-bottom: 2px solid #00d4ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #00d4ff;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .operation-grid {
      flex: 1;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow: hidden;
      min-height: 0;
      
      .op-row {
        display: flex;
        gap: 6px;
        flex: 1;
        min-height: 0;
        
        .op-btn {
          flex: 1;
          background: linear-gradient(180deg, #00d4ff 0%, #0072ff 100%);
          border: none;
          border-radius: 4px;
          color: #fff;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 114, 255, 0.4);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          
          &:hover {
            background: linear-gradient(180deg, #33e1ff 0%, #1a8cff 100%);
          }
        }
      }
      
      .angle-row {
        display: flex;
        gap: 6px;
        flex: 1;
        min-height: 0;
        
        .angle-btn {
          width: 45px;
          flex-shrink: 0;
          background: linear-gradient(180deg, #00d4ff 0%, #0072ff 100%);
          border: none;
          border-radius: 4px;
          color: #fff;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 114, 255, 0.4);
          
          &:hover {
            background: linear-gradient(180deg, #33e1ff 0%, #1a8cff 100%);
          }
        }
        
        .angle-value {
          flex: 1;
          min-width: 0;
          background: #000;
          border: 2px solid #00d4ff;
          border-radius: 4px;
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          color: #00d4ff;
          padding: 0;
          box-shadow: 0 0 8px rgba(0, 212, 255, 0.2);
          
          &:focus {
            outline: none;
            border-color: #33e1ff;
          }
        }
        
        .angle-arrows {
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 28px;
          flex-shrink: 0;
          
          .arrow-btn {
            flex: 1;
            background: linear-gradient(180deg, #00d4ff 0%, #0072ff 100%);
            border: none;
            border-radius: 3px;
            color: #fff;
            font-size: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            
            &:hover {
              background: linear-gradient(180deg, #33e1ff 0%, #1a8cff 100%);
            }
          }
        }
      }
    }
  }
}

.click-hint {
  color: #5a7390;
  font-size: 14px;
}

.dxf-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  
  .dxf-modal-content {
    width: 80vw;
    height: 80vh;
    background: #0f1923;
    border-radius: 8px;
    border: 1px solid #1a2942;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .dxf-modal-header {
      height: 40px;
      background: #1a2942;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 15px;
      color: #fff;
      font-size: 14px;
      
      .close-btn {
        width: 28px;
        height: 28px;
        background: transparent;
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        border-radius: 4px;
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }
    
    .dxf-modal-body {
      flex: 1;
      background: #1a1a2e;
    }
    
    .dxf-modal-footer {
      height: 30px;
      background: #1a2942;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #5a7390;
      font-size: 12px;
    }
  }
}

.upload-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
  
  .upload-modal-content {
    width: 600px;
    max-height: 80vh;
    background: #0f1923;
    border-radius: 8px;
    border: 1px solid #1a2942;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 30px rgba(0, 212, 255, 0.15);
    
    .upload-modal-header {
      height: 50px;
      background: linear-gradient(90deg, #1a2942 0%, #0f1923 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      color: #fff;
      font-size: 16px;
      border-bottom: 1px solid #1a2942;
      
      .header-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: bold;
        color: #00d4ff;
        
        .icon {
          font-size: 18px;
        }
      }
      
      .close-btn {
        width: 30px;
        height: 30px;
        background: transparent;
        border: none;
        color: #5a7390;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
        
        &:hover {
          color: #fff;
        }
      }
    }
    
    .upload-modal-body {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      
      .upload-dropzone {
        border: 2px dashed rgba(0, 212, 255, 0.3);
        border-radius: 8px;
        padding: 40px 20px;
        text-align: center;
        background: rgba(0, 212, 255, 0.02);
        cursor: pointer;
        transition: all 0.3s;
        
        &:hover, &.dragging {
          border-color: #00d4ff;
          background: rgba(0, 212, 255, 0.08);
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.1);
        }
        
        &.disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        
        .upload-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        
        .upload-text {
          font-size: 16px;
          color: #fff;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .upload-subtext {
          font-size: 12px;
          color: #5a7390;
        }
      }
      
      .file-list-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
        min-height: 0;
        
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: #00d4ff;
          
          .clear-btn {
            background: transparent;
            border: none;
            color: #5a7390;
            font-size: 12px;
            cursor: pointer;
            
            &:hover {
              color: #ff5252;
              text-decoration: underline;
            }
            
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
        
        .file-list {
          background: #151f2b;
          border-radius: 6px;
          border: 1px solid #1a2942;
          max-height: 200px;
          overflow-y: auto;
          
          .file-item {
            display: flex;
            align-items: center;
            padding: 10px 15px;
            border-bottom: 1px solid #1a2942;
            gap: 12px;
            
            &:last-child {
              border-bottom: none;
            }
            
            .file-icon {
              font-size: 20px;
            }
            
            .file-info {
              flex: 1;
              min-width: 0;
              
              .file-name {
                color: #e8fbff;
                font-size: 13px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              
              .file-size {
                color: #5a7390;
                font-size: 11px;
                margin-top: 2px;
              }
            }
            
            .file-status {
              font-size: 12px;
              
              .status-pending { color: #5a7390; }
              .status-success { color: #00ff9d; }
              .status-error { color: #ff5252; }
            }
            
            .remove-btn {
              background: transparent;
              border: none;
              color: #5a7390;
              font-size: 18px;
              cursor: pointer;
              padding: 0 5px;
              
              &:hover {
                color: #ff5252;
              }
              
              &:disabled {
                opacity: 0.3;
                cursor: not-allowed;
              }
            }
          }
        }
      }
      
      .upload-progress {
        display: flex;
        align-items: center;
        gap: 15px;
        
        .progress-bar {
          flex: 1;
          height: 8px;
          background: #1a2942;
          border-radius: 4px;
          overflow: hidden;
          
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00d4ff 0%, #0072ff 100%);
            transition: width 0.3s ease;
          }
        }
        
        .progress-text {
          font-size: 13px;
          color: #00d4ff;
          font-weight: bold;
          min-width: 40px;
          text-align: right;
        }
      }
      
      .upload-result {
        display: flex;
        gap: 20px;
        justify-content: center;
        padding: 10px 0;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        
        .result-item {
          display: flex;
          align-items: baseline;
          gap: 6px;
          
          .count {
            font-size: 24px;
            font-weight: bold;
          }
          
          .label {
            font-size: 12px;
            color: #8a9bad;
          }
          
          &.success .count { color: #00ff9d; }
          &.fail .count { color: #ff5252; }
        }
      }
    }
    
    .upload-modal-footer {
      height: 60px;
      background: #1a2942;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 20px;
      gap: 12px;
      
      .btn {
        height: 36px;
        padding: 0 20px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        
        &.btn-cancel {
          background: transparent;
          border: 1px solid #5a7390;
          color: #8a9bad;
          
          &:hover {
            border-color: #fff;
            color: #fff;
          }
        }
        
        &.btn-primary {
          background: linear-gradient(180deg, #00d4ff 0%, #0072ff 100%);
          color: #fff;
          box-shadow: 0 2px 8px rgba(0, 114, 255, 0.4);
          
          &:hover {
            background: linear-gradient(180deg, #33e1ff 0%, #1a8cff 100%);
          }
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #5a7390;
            box-shadow: none;
          }
        }
      }
    }
    // IFC Modal styles
    .ifc-item {
      &:hover {
        background: rgba(0, 212, 255, 0.1);
      }
      &.active {
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
      }
    }
  }
}

// 批量选择按钮
.batch-select-btn {
  background: rgba(0, 212, 255, 0.1);
  color: rgba(0, 212, 255, 0.7);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(0, 212, 255, 0.2);
    color: #00d4ff;
  }
  &.active {
    background: rgba(255, 136, 0, 0.15);
    color: #ff8800;
    border-color: rgba(255, 136, 0, 0.5);
    animation: batch-btn-pulse 1.5s ease-in-out infinite;
  }
}

@keyframes batch-btn-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 136, 0, 0.3); }
  50% { box-shadow: 0 0 10px rgba(255, 136, 0, 0.6); }
}
</style>

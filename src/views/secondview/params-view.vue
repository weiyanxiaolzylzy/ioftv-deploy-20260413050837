<template>
  <div class="params-view">
    <!-- 顶部标题 -->
    <div class="page-header">
      <h2>相机参数配置面板</h2>
    </div>

    <!-- 参数设置网格 -->
    <div class="params-grid">
      <!-- 第一行 -->
      <div class="param-item">
        <label class="param-label">误差阈值(mm)</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.projectionImage" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('projectionImage', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('projectionImage', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <div class="param-item">
        <label class="param-label">对比度</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.contrast" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('contrast', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('contrast', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <div class="param-item">
        <label class="param-label">逆光对比</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.edgeLightFit" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('edgeLightFit', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('edgeLightFit', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <!-- 第二行 -->
      <div class="param-item">
        <label class="param-label">亮度</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.brightness" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('brightness', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('brightness', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <div class="param-item">
        <label class="param-label">清晰度</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.openCloseDegree" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('openCloseDegree', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('openCloseDegree', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <div class="param-item">
        <label class="param-label">缩放</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.saturation" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('saturation', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('saturation', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <!-- 第三行 -->
      <div class="param-item">
        <label class="param-label">色调</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.colorTemp" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('colorTemp', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('colorTemp', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <div class="param-item">
        <label class="param-label">伽马</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.fineCode" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('fineCode', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('fineCode', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <div class="param-item">
        <label class="param-label">焦距</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.virtualPoint" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('virtualPoint', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('virtualPoint', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <!-- 第四行 -->
      <div class="param-item">
        <label class="param-label">饱和度</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.sharpness" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('sharpness', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('sharpness', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <div class="param-item">
        <label class="param-label">白平衡</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.apertureRatio" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('apertureRatio', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('apertureRatio', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>

      <div class="param-item">
        <label class="param-label">曝光</label>
        <div class="param-control">
          <input type="number" v-model.number="localParams.exposure" class="param-input" @input="emitUpdate" :disabled="!canEdit" />
          <div class="btn-group-vertical">
            <button class="btn-adjust" @click="adjustParam('exposure', 1)" :disabled="!canEdit">▲</button>
            <button class="btn-adjust" @click="adjustParam('exposure', -1)" :disabled="!canEdit">▼</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="bottom-actions">
      <button class="btn-action" @click="confirmSettings" :disabled="!canEdit">操作确定</button>
      <button class="btn-action" @click="resetToDefault" :disabled="!canEdit">重置默认</button>
      <button class="btn-action btn-primary" @click="applyHistoryConfig" :disabled="!canEdit">应用历史配置</button>
    </div>
  </div>
</template>

<script>
import { canEditFeature } from '@/utils'

export default {
  name: 'ParamsView',
  props: {
    params: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      localParams: { ...this.params }
    }
  },
  computed: {
    canEdit() {
      return canEditFeature('qa_only')
    }
  },
  watch: {
    params: {
      handler(newVal) {
        this.localParams = { ...newVal }
      },
      deep: true
    }
  },
  methods: {
    notifyNoPermission() {
      if (this.$Message && this.$Message.warning) this.$Message.warning('当前账号仅支持查看')
      else alert('当前账号仅支持查看')
    },
    adjustParam(key, delta) {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      this.localParams[key] = (this.localParams[key] || 0) + delta
      this.emitUpdate()
    },
    emitUpdate() {
      if (!this.canEdit) return
      this.$emit('update:params', this.localParams)
    },
    confirmSettings() {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      this.$Message({
        text: '参数设置已确认',
        type: 'success'
      })
    },
    resetToDefault() {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      this.localParams = {
        projectionImage: 0,
        contrast: 32,
        edgeLightFit: 1,
        brightness: 128,
        openCloseDegree: 3,
        saturation: 100,
        colorTemp: 0,
        fineCode: 120,
        virtualPoint: 10,
        sharpness: 64,
        apertureRatio: 4600,
        exposure: -6
      }
      this.emitUpdate()
      this.$Message({
        text: '已重置为默认参数',
        type: 'success'
      })
    },
    applyHistoryConfig() {
      if (!this.canEdit) {
        this.notifyNoPermission()
        return
      }
      this.$Message({
        text: '历史配置已应用',
        type: 'success'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.params-view {
  width: 100%;
  height: 100%;
  background: transparent;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
  padding: 10px;
  
  .page-header {
    padding: 15px 25px;
    flex-shrink: 0;
    
    h2 {
      font-size: 22px;
      font-weight: bold;
      color: #00d4ff;
      margin: 0;
      text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    }
  }
  
  .params-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 20px 25px;
    padding: 20px 25px;
    overflow: hidden;
    
    .param-item {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 0;
      
      .param-label {
        min-width: 130px;
        max-width: 130px;
        background: linear-gradient(90deg, #0072ff 0%, #00d4ff 100%);
        padding: 14px 15px;
        border-radius: 4px;
        font-size: 16px;
        text-align: center;
        color: #fff;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0, 114, 255, 0.3);
      }
      
      .param-control {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        
        .param-input {
          flex: 1;
          height: 50px;
          background: #000;
          border: 2px solid #00d4ff;
          border-radius: 4px;
          padding: 0 15px;
          font-size: 18px;
          color: #00d4ff;
          text-align: center;
          font-weight: bold;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.1);
          
          &:focus {
            outline: none;
            border-color: #33e1ff;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
          }
        }
        
        .btn-group-vertical {
          display: flex;
          flex-direction: column;
          gap: 2px;
          
          .btn-adjust {
            width: 35px;
            height: 23px;
            background: #00d4ff;
            border: none;
            border-radius: 2px;
            color: #fff;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
            
            &:hover {
              background: #33e1ff;
              transform: scale(1.05);
            }
            
            &:active {
              transform: scale(0.95);
            }
          }
        }
      }
    }
  }
  
  .bottom-actions {
    display: flex;
    justify-content: center;
    gap: 25px;
    padding: 25px;
    border-top: 1px solid #1a2942;
    flex-shrink: 0;
    
    .btn-action {
      min-width: 160px;
      height: 50px;
      background: rgba(15, 35, 60, 0.8);
      border: 2px solid #00d4ff;
      border-radius: 6px;
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(0, 212, 255, 0.2);
      
      &:hover {
        background: rgba(0, 212, 255, 0.1);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
      }
      
      &.btn-primary {
        background: linear-gradient(180deg, #00d4ff 0%, #0072ff 100%);
        border-color: #00d4ff;
        
        &:hover {
          background: linear-gradient(180deg, #33e1ff 0%, #1a8cff 100%);
        }
      }
    }
  }
}
</style>

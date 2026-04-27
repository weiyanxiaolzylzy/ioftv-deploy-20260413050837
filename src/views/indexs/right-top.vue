<template>
  <div class="monthly_pioneer">
    <!-- 编辑按钮 -->
    <div v-if="canEdit" class="edit_btn" @click.stop="toggleEdit">
      {{ isEditing ? '保存' : '编辑' }}
    </div>

    <!-- 展示模式 -->
    <div v-if="!isEditing && starInfo" class="display_mode">
      <div class="pioneer_image">
        <img :src="starInfo.photoUrl || '/people.jpg'" alt="班组照片" />
      </div>
      <div class="pioneer_info">
        <div class="pioneer_name">{{ starInfo.groupName }}</div>
        <div class="pioneer_title">本月标兵</div>
        <div class="rates_container">
          <div class="rate_circle">
            <div class="circle_box">
              <svg viewBox="0 0 100 100">
                <circle class="bg" cx="50" cy="50" r="45" />
                <circle 
                  class="bar" 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  :style="{ strokeDashoffset: 283 - (283 * starInfo.passingRate) / 100 }"
                />
              </svg>
              <div class="rate_val">{{ starInfo.passingRate }}%</div>
            </div>
            <div class="rate_label">装配合格率</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑模式 -->
    <div v-else class="edit_mode">
      <div class="input_item">
        <span>班组名称：</span>
        <input type="text" v-model="tempInfo.groupName" />
      </div>
      <div class="input_item">
        <span>装配合格率(%)：</span>
        <input type="number" v-model="tempInfo.passingRate" />
      </div>
      <div class="input_item">
        <span>更换照片：</span>
        <div class="preview_box">
           <img :src="starInfo && starInfo.photoUrl ? starInfo.photoUrl : '/people.jpg'" alt="预览" class="preview_img" />
           <button class="upload_btn" @click="triggerUpload">上传</button>
        </div>
      </div>
      <input 
        type="file" 
        ref="fileInput" 
        style="display: none" 
        @change="handleFileUpload" 
        accept="image/*" 
      />
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { canEditFeature, getAuthHeaders } from '@/utils'

export default {
  data() {
    return {
      isEditing: false,
      canEdit: false,
      starInfo: {
        groupName: '一班组',
        passingRate: 98,
        photoUrl: '/people.jpg'
      },
      tempInfo: {
        groupName: '',
        passingRate: 0
      }
    };
  },
  watch: {
    isEditing(val) {
      if (val) {
        this.tempInfo = { ...this.starInfo };
      } else {
        this.saveData();
      }
    }
  },
  created() {
    this.canEdit = canEditFeature('monthly_star');
    this.fetchData();
  },
  methods: {
    toggleEdit() {
      this.isEditing = !this.isEditing;
    },
    async fetchData() {
      try {
        // 使用相对路径，让浏览器自动处理域名和端口
        const response = await fetch('/api/star', { headers: getAuthHeaders() });
        const data = await response.json();
        if (data) {
          this.starInfo = data.star || data; // Handle both wrapper format and direct data
        }
      } catch (err) {
        console.error('获取标兵信息失败', err);
      }
    },
    async saveData() {
      if (!this.canEdit) {
        if (this.$Message && this.$Message.warning) this.$Message.warning('当前账号仅支持查看')
        else alert('当前账号仅支持查看')
        return
      }
      try {
        const formData = new FormData();
        formData.append('groupName', this.tempInfo.groupName);
        formData.append('passingRate', this.tempInfo.passingRate);
        
        console.log('Sending saveData:', {
          groupName: this.tempInfo.groupName,
          passingRate: this.tempInfo.passingRate
        });

        // 使用相对路径，让浏览器自动处理域名和端口
        const response = await fetch('/api/star', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        });
        
        const data = await response.json();
        
        if (data.success || data.photoUrl) {
          this.starInfo = data.data || data;
          this.$Message.success('保存成功');
        } else {
          throw new Error(data.message || '保存失败');
        }
      } catch (err) {
        console.error('保存标兵信息失败', err);
        this.$Message.error('保存失败: ' + err.message);
      }
    },
    triggerUpload() {
      console.log('triggerUpload called');
      this.$refs.fileInput.click();
    },
    async handleFileUpload(event) {
      console.log('handleFileUpload called');
      const file = event.target.files[0];
      if (!file) {
        console.log('No file selected');
        return;
      }
      if (!this.canEdit) {
        if (this.$Message && this.$Message.warning) this.$Message.warning('当前账号仅支持查看')
        else alert('当前账号仅支持查看')
        event.target.value = '';
        return
      }
      console.log('File selected:', file);

      const formData = new FormData();
      formData.append('photo', file);
      formData.append('groupName', this.tempInfo.groupName || this.starInfo.groupName);
      formData.append('passingRate', this.tempInfo.passingRate || this.starInfo.passingRate);

      try {
        // 使用相对路径，让浏览器自动处理域名和端口
        const response = await fetch('/api/star', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        });
        
        const data = await response.json();
        console.log('Upload response data:', data);

        if (data.success || data.photoUrl || (data.data && data.data.photoUrl)) {
          this.starInfo = data.data || data;
          this.tempInfo = { ...this.starInfo };
          this.$Message.success('照片上传成功');
        } else {
          console.error('Upload failed with success: false');
          this.$Message.error('上传失败: ' + (data.message || '未知异常，请联系管理员！'));
        }
      } catch (err) {
        console.error('上传图片失败', err);
        this.$Message.error('上传失败: ' + err.message);
      }
      
      event.target.value = '';
    }
  }
};
</script>

<style lang='scss' scoped>
.monthly_pioneer {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  // z-index: 10;

  .edit_btn {
    position: absolute;
    top: 5px;
    right: 5px;
    padding: 6px 14px;
    background: #00baff;
    border: 1px solid #fff;
    color: #fff;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    z-index: 99999 !important;
    pointer-events: auto !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    
    &:hover {
      background: #4cd3ff;
      transform: scale(1.05);
    }
    
    &:active {
      transform: scale(0.95);
    }
  }

  .display_mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .pioneer_image {
    width: 110px;
    height: 110px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 12px;
    border: 3px solid #00baff;
    box-shadow: 0 0 15px rgba(0, 186, 255, 0.5);
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .pioneer_info {
    text-align: center;
    width: 100%;
    
    .pioneer_name {
      font-size: 20px;
      color: #fff;
      margin-bottom: 4px;
      font-weight: bold;
    }
    
    .pioneer_title {
      font-size: 15px;
      color: #00baff;
      margin-bottom: 14px;
    }
  }

  .rates_container {
    display: flex;
    justify-content: center;
    gap: 20px;
    width: 100%;
  }

  .rate_circle {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .circle_box {
      position: relative;
      width: 70px;
      height: 70px;
      
      svg {
        transform: rotate(-90deg);
        width: 100%;
        height: 100%;
      }
      
      circle {
        fill: none;
        stroke-width: 8;
      }
      
      .bg {
        stroke: rgba(255, 255, 255, 0.1);
      }
      
      .bar {
        stroke: #00baff;
        stroke-linecap: round;
        stroke-dasharray: 283;
        transition: stroke-dashoffset 0.5s ease;
      }
      
      .rate_val {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        color: #fff;
        font-weight: bold;
      }
    }
    
    .rate_label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 4px;
      white-space: nowrap;
    }
  }

  .edit_mode {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 90%;
    
    .input_item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      
      span {
        font-size: 11px;
        color: #00baff;
      }
      
      input {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 186, 255, 0.5);
        color: #fff;
        padding: 4px 6px;
        border-radius: 4px;
        outline: none;
        font-size: 12px;
        &:focus {
          border-color: #00baff;
        }
      }

      .preview_box {
        display: flex;
        align-items: center;
        gap: 10px;

        .preview_img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid #00baff;
          object-fit: cover;
        }

        .upload_btn {
          background: #00baff;
          color: #000;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          font-size: 12px;
          flex: 1;
        }
      }
    }
  }
}
</style>

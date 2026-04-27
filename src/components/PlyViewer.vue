<template>
  <div class="ply-viewer" ref="containerRef">
    <!-- Three.js Canvas -->
    <canvas ref="canvasRef" class="ply-canvas"></canvas>

    <!-- Loading overlay -->
    <transition name="fade">
      <div v-if="loading" class="ply-overlay">
        <div class="ply-spinner"></div>
        <div class="ply-loading-text">{{ loadingText }}</div>
      </div>
    </transition>

    <!-- Empty state -->
    <div v-if="!hasData && !loading" class="ply-empty">
      <div class="ply-empty-icon">☁️</div>
      <div class="ply-empty-title">{{ emptyTitle }}</div>
      <div class="ply-empty-sub">{{ emptySub }}</div>
      <label class="ply-upload-btn" v-if="showUpload">
        <input type="file" accept=".ply" @change="handleFileUpload" style="display:none" />
        上传 PLY 文件
      </label>
    </div>

    <!-- Control Panel -->
    <div class="ply-controls" v-if="hasData && !loading">
      <div class="ply-ctrl-header">
        <span class="ply-ctrl-title">视图控制</span>
        <button class="ply-ctrl-close" @click="showControls = !showControls">
          {{ showControls ? '▼' : '▲' }}
        </button>
      </div>
      <div class="ply-ctrl-body" v-show="showControls">
        <!-- Point size -->
        <div class="ply-ctrl-row">
          <span class="ply-ctrl-label">点大小</span>
          <input
            type="range"
            :min="0.5"
            :max="10"
            :step="0.5"
            :value="pointSize"
            @input="setPointSize"
            class="ply-range"
          />
          <span class="ply-ctrl-val">{{ pointSize }}</span>
        </div>

        <!-- Color scheme -->
        <div class="ply-ctrl-row">
          <span class="ply-ctrl-label">颜色</span>
          <select :value="colorScheme" @change="setColorScheme" class="ply-select">
            <option value="default">默认蓝</option>
            <option value="height">高度渐变</option>
            <option value="rainbow">彩虹</option>
          </select>
        </div>

        <!-- Grid -->
        <div class="ply-ctrl-row">
          <label class="ply-check-label">
            <input type="checkbox" :checked="showGrid" @change="toggleGrid" />
            网格
          </label>
          <label class="ply-check-label" style="margin-left: 8px;">
            <input type="checkbox" :checked="visible" @change="toggleVisible" />
            点云
          </label>
        </div>

        <!-- View presets -->
        <div class="ply-ctrl-row ply-ctrl-views">
          <button class="ply-view-btn" @click="setView('top')">顶</button>
          <button class="ply-view-btn" @click="setView('bottom')">底</button>
          <button class="ply-view-btn" @click="setView('front')">前</button>
          <button class="ply-view-btn" @click="setView('back')">后</button>
          <button class="ply-view-btn" @click="setView('left')">左</button>
          <button class="ply-view-btn" @click="setView('right')">右</button>
          <button class="ply-view-btn ply-view-btn--primary" @click="setView('iso')">等轴</button>
        </div>

        <!-- Upload new file -->
        <label class="ply-upload-link" v-if="showUpload">
          <input type="file" accept=".ply" @change="handleFileUpload" style="display:none" />
          📁 加载新文件
        </label>
      </div>
    </div>

    <!-- Point info badge -->
    <div class="ply-info-badge" v-if="hasData && !loading">
      <span>{{ pointCount.toLocaleString() }} 点</span>
      <span v-if="plyInfo && plyInfo.dimensions">
        · {{ plyInfo.dimensions.length.toFixed(0) }} × {{ plyInfo.dimensions.width.toFixed(0) }} × {{ plyInfo.dimensions.height.toFixed(0) }}
      </span>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { parsePLY, computeHeightColors, voxelDownsample } from '@/utils/plyParser.js';

export default {
  name: 'PlyViewer',
  props: {
    plyUrl: { type: String, default: '' },
    plyFileId: { type: String, default: '' },
    maxPoints: { type: Number, default: 200000 },
    voxelSize: { type: Number, default: 0.005 },
    emptyTitle: { type: String, default: '暂无点云数据' },
    emptySub: { type: String, default: '上传 PLY 文件查看点云模型' },
    showUpload: { type: Boolean, default: true },
    pointCloudData: { type: Array, default: () => [] },
    plyInfoData: { type: Object, default: null },
    backgroundColor: { type: Number, default: 0x0a1929 },
  },
  data() {
    return {
      hasData: false,
      loading: false,
      loadingText: '加载中...',
      pointSize: 2,
      colorScheme: 'default',
      showGrid: true,
      visible: true,
      showControls: true,
      pointCount: 0,
      plyInfo: null,
      rawPositions: null,
      rawColors: null,
      rawCount: 0,
      // Three.js objects
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      pointsMesh: null,
      gridHelper: null,
      animationId: null,
      resizeObserver: null,
    };
  },
  computed: {
    containerRef() { return this.$refs.containerRef; },
    canvasRef() { return this.$refs.canvasRef; },
  },
  watch: {
    plyUrl(val) { if (val) this.loadFromUrl(); },
    plyFileId(val) { if (val) this.loadFromApi(); },
    pointCloudData: {
      handler(val) { if (val && val.length > 0) this.loadFromArray(); },
      deep: true,
    },
    pointSize() { this.rebuildMesh(); },
    colorScheme() { this.rebuildMesh(); },
    showGrid() { this.updateGrid(); },
    visible() { if (this.pointsMesh) this.pointsMesh.visible = this.visible; },
  },
  mounted() {
    this.initThree();
    this.setupResize();
    if (this.plyUrl) this.loadFromUrl();
    else if (this.plyFileId) this.loadFromApi();
    else if (this.pointCloudData && this.pointCloudData.length > 0) this.loadFromArray();
    else if (this.plyInfoData) {
      this.plyInfo = this.plyInfoData;
    }
  },
  beforeDestroy() {
    this.dispose();
  },
  methods: {
    // ─── Three.js Init ──────────────────────────────────────────────────────

    initThree() {
      const container = this.containerRef;
      if (!container) return;

      const w = container.clientWidth;
      const h = container.clientHeight;

      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.backgroundColor);

      // Camera
      this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100000);
      this.camera.position.set(500, 500, 500);
      this.camera.lookAt(0, 0, 0);

      // Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvasRef,
        antialias: true,
        alpha: false,
      });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Controls
      this.controls = new OrbitControls(this.camera, this.canvasRef);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.rotateSpeed = 0.5;
      this.controls.zoomSpeed = 0.8;
      this.controls.panSpeed = 0.5;
      this.controls.minDistance = 1;
      this.controls.maxDistance = 50000;

      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambient);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(1000, 1000, 1000);
      this.scene.add(directional);
      const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
      backLight.position.set(-1000, -1000, -1000);
      this.scene.add(backLight);

      // Animation loop
      const animate = () => {
        this.animationId = requestAnimationFrame(animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      animate();
    },

    setupResize() {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      if (this.containerRef) this.resizeObserver.observe(this.containerRef);
    },

    handleResize() {
      const container = this.containerRef;
      if (!container || !this.camera || !this.renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    },

    dispose() {
      if (this.animationId) cancelAnimationFrame(this.animationId);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.controls) this.controls.dispose();
      if (this.pointsMesh) {
        this.pointsMesh.geometry.dispose();
        if (Array.isArray(this.pointsMesh.material)) {
          this.pointsMesh.material.forEach(m => m.dispose());
        } else {
          this.pointsMesh.material.dispose();
        }
      }
      if (this.gridHelper) this.gridHelper.dispose();
      if (this.renderer) this.renderer.dispose();
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
    },

    // ─── Data Loading ───────────────────────────────────────────────────────

    setLoading(text) {
      this.loading = true;
      this.loadingText = text || '加载中...';
    },

    clearLoading() {
      this.loading = false;
    },

    async loadFromUrl() {
      if (!this.plyUrl) return;
      this.setLoading('下载中...');
      try {
        const resp = await fetch(this.plyUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        this.parseAndRender(buf, this.plyUrl.split('/').pop() || 'model.ply');
      } catch (e) {
        console.error('[PlyViewer] Load from URL failed:', e);
        this.clearLoading();
      }
    },

    async loadFromApi() {
      if (!this.plyFileId) return;
      this.setLoading('从服务器加载...');
      try {
        // Try to get processed point cloud from PlyCloudWeb backend
        const resp = await fetch(`/api/ply/process/${this.plyFileId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voxel_size: this.voxelSize, max_points: this.maxPoints }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.point_cloud_data && data.point_cloud_data.length > 0) {
          const positions = new Float32Array(data.point_cloud_data.length * 3);
          const colors = new Float32Array(data.point_cloud_data.length * 3);
          for (let i = 0; i < data.point_cloud_data.length; i++) {
            positions[i * 3] = data.point_cloud_data[i][0];
            positions[i * 3 + 1] = data.point_cloud_data[i][1];
            positions[i * 3 + 2] = data.point_cloud_data[i][2];
          }
          this.buildScene(positions, colors, data.point_cloud_data.length, data.info || null);
        }
      } catch (e) {
        console.error('[PlyViewer] Load from API failed:', e);
        this.clearLoading();
      }
    },

    loadFromArray() {
      const arr = this.pointCloudData;
      if (!arr || arr.length === 0) return;
      this.setLoading('渲染中...');
      try {
        const positions = new Float32Array(arr.length * 3);
        const colors = new Float32Array(arr.length * 3);
        for (let i = 0; i < arr.length; i++) {
          positions[i * 3] = arr[i][0];
          positions[i * 3 + 1] = arr[i][1];
          positions[i * 3 + 2] = arr[i][2];
          colors[i * 3] = 0.3;
          colors[i * 3 + 1] = 0.6;
          colors[i * 3 + 2] = 0.9;
        }
        this.buildScene(positions, colors, arr.length, this.plyInfoData);
      } catch (e) {
        console.error('[PlyViewer] Load from array failed:', e);
        this.clearLoading();
      }
    },

    async handleFileUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      this.setLoading('解析中...');
      try {
        const buf = await file.arrayBuffer();
        this.parseAndRender(buf, file.name);
      } catch (e) {
        console.error('[PlyViewer] File upload failed:', e);
        this.clearLoading();
      }
      if (event.target) event.target.value = '';
    },

    parseAndRender(buffer, filename) {
      const fileId = `local-${Date.now()}`;
      const { positions, colors, count, info } = parsePLY(buffer, filename, fileId);
      this.plyInfo = info;
      this.pointCount = count;

      if (count === 0) {
        this.clearLoading();
        return;
      }

      // Downsample if needed
      let finalPositions = positions;
      let finalColors = colors;
      let finalCount = count;

      if (count > this.maxPoints) {
        const downsampled = voxelDownsample(positions, colors, count, this.voxelSize);
        finalPositions = downsampled.positions;
        finalColors = downsampled.colors;
        finalCount = downsampled.count;
      }

      this.rawPositions = finalPositions;
      this.rawColors = finalColors;
      this.rawCount = finalCount;

      this.buildScene(finalPositions, finalColors, finalCount, info);
    },

    buildScene(positions, colors, count, info) {
      // Remove old mesh
      if (this.pointsMesh) {
        this.scene.remove(this.pointsMesh);
        this.pointsMesh.geometry.dispose();
        if (!Array.isArray(this.pointsMesh.material)) {
          this.pointsMesh.material.dispose();
        }
        this.pointsMesh = null;
      }

      // Build geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));

      // Apply color scheme
      let finalColors = colors;
      if (this.colorScheme === 'height') {
        finalColors = computeHeightColors(positions, count);
        geometry.setAttribute('color', new THREE.BufferAttribute(finalColors, 3));
      } else if (this.colorScheme === 'rainbow') {
        finalColors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const t = i / count;
          const c = new THREE.Color().setHSL(t, 1, 0.5);
          finalColors[i * 3] = c.r;
          finalColors[i * 3 + 1] = c.g;
          finalColors[i * 3 + 2] = c.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(finalColors, 3));
      }

      const material = new THREE.PointsMaterial({
        size: this.pointSize,
        vertexColors: true,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });

      this.pointsMesh = new THREE.Points(geometry, material);
      this.scene.add(this.pointsMesh);

      // Grid
      this.updateGrid();

      // Camera target
      if (info && info.centroid) {
        const c = info.centroid;
        const dist = Math.max(...(info.boundingBox?.size || [500, 500, 500])) * 2 || 500;
        this.camera.position.set(c[0] + dist, c[1] + dist, c[2] + dist);
        this.camera.lookAt(c[0], c[1], c[2]);
        if (this.controls) {
          this.controls.target.set(c[0], c[1], c[2]);
          this.controls.update();
        }
      }

      this.pointCount = count;
      this.hasData = true;
      this.clearLoading();

      this.$emit('loaded', { count, info });
    },

    rebuildMesh() {
      if (!this.rawPositions || !this.rawColors || !this.rawCount) return;

      let colors = this.rawColors;
      if (this.colorScheme === 'height') {
        colors = computeHeightColors(this.rawPositions, this.rawCount);
      } else if (this.colorScheme === 'rainbow') {
        colors = new Float32Array(this.rawCount * 3);
        for (let i = 0; i < this.rawCount; i++) {
          const t = i / this.rawCount;
          const c = new THREE.Color().setHSL(t, 1, 0.5);
          colors[i * 3] = c.r;
          colors[i * 3 + 1] = c.g;
          colors[i * 3 + 2] = c.b;
        }
      } else {
        // Default: revert to stored raw colors
        colors = this.rawColors;
      }

      this.buildScene(this.rawPositions, colors, this.rawCount, this.plyInfo);
    },

    updateGrid() {
      if (this.gridHelper) {
        this.scene.remove(this.gridHelper);
        this.gridHelper.dispose();
        this.gridHelper = null;
      }
      if (!this.showGrid || !this.hasData) return;

      const target = this.plyInfo?.centroid || [0, 0, 0];
      this.gridHelper = new THREE.GridHelper(5000, 50, 0x1a3a5a, 0x0f2a40);
      this.gridHelper.position.set(target[0], target[1] - 10, target[2]);
      this.scene.add(this.gridHelper);
    },

    // ─── View presets ───────────────────────────────────────────────────────

    setView(preset) {
      if (!this.plyInfo?.centroid) return;
      const [cx, cy, cz] = this.plyInfo.centroid;
      const dist = Math.max(...(this.plyInfo.boundingBox?.size || [500, 500, 500])) * 2.5 || 800;

      switch (preset) {
        case 'top':
          this.camera.position.set(cx, cy + dist, cz);
          this.controls?.target.set(cx, cy, cz);
          break;
        case 'bottom':
          this.camera.position.set(cx, cy - dist, cz);
          this.controls?.target.set(cx, cy, cz);
          break;
        case 'front':
          this.camera.position.set(cx, cy, cz + dist);
          this.controls?.target.set(cx, cy, cz);
          break;
        case 'back':
          this.camera.position.set(cx, cy, cz - dist);
          this.controls?.target.set(cx, cy, cz);
          break;
        case 'left':
          this.camera.position.set(cx - dist, cy, cz);
          this.controls?.target.set(cx, cy, cz);
          break;
        case 'right':
          this.camera.position.set(cx + dist, cy, cz);
          this.controls?.target.set(cx, cy, cz);
          break;
        case 'iso':
          this.camera.position.set(cx + dist * 0.7, cy + dist * 0.7, cz + dist * 0.7);
          this.controls?.target.set(cx, cy, cz);
          break;
      }
      if (this.controls) this.controls.update();
    },

    // ─── Controls ────────────────────────────────────────────────────────────

    setPointSize(e) { this.pointSize = parseFloat(e.target.value); },
    setColorScheme(e) { this.colorScheme = e.target.value; },
    toggleGrid(e) { this.showGrid = e.target.checked; },
    toggleVisible(e) { this.visible = e.target.checked; },

    // ─── Public API ─────────────────────────────────────────────────────────

    loadPlyUrl(url) { this.plyUrl = url; },
    loadPlyFileId(id) { this.plyFileId = id; },
    loadPlyData(data, info) {
      this.pointCloudData = data;
      this.plyInfoData = info;
    },
    reload() {
      if (this.plyUrl) this.loadFromUrl();
      else if (this.plyFileId) this.loadFromApi();
      else if (this.pointCloudData.length > 0) this.loadFromArray();
    },
  },
};
</script>

<style scoped>
.ply-viewer {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  background: #0a1929;
}

.ply-canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
  cursor: grab;
}
.ply-canvas:active { cursor: grabbing; }

/* Empty state */
.ply-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
}
.ply-empty-icon {
  font-size: 36px;
  opacity: 0.5;
}
.ply-empty-title {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
}
.ply-empty-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.25);
}
.ply-upload-btn {
  margin-top: 8px;
  padding: 6px 18px;
  border-radius: 6px;
  border: 1px solid rgba(0, 212, 255, 0.5);
  background: rgba(0, 212, 255, 0.12);
  color: #00d4ff;
  font-size: 13px;
  cursor: pointer;
  pointer-events: all;
  transition: all 0.2s;
}
.ply-upload-btn:hover {
  background: rgba(0, 212, 255, 0.25);
  border-color: #00d4ff;
}

/* Loading overlay */
.ply-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5, 16, 32, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 100;
}
.ply-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 212, 255, 0.2);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: ply-spin 0.8s linear infinite;
}
@keyframes ply-spin {
  to { transform: rotate(360deg); }
}
.ply-loading-text {
  font-size: 13px;
  color: rgba(0, 212, 255, 0.8);
}

/* Control panel */
.ply-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(5, 16, 40, 0.92);
  border: 1px solid rgba(0, 186, 255, 0.25);
  border-radius: 8px;
  min-width: 180px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 10;
}
.ply-ctrl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 186, 255, 0.12);
  border-bottom: 1px solid rgba(0, 186, 255, 0.15);
}
.ply-ctrl-title {
  font-size: 12px;
  font-weight: 600;
  color: #00eaff;
  letter-spacing: 0.5px;
}
.ply-ctrl-close {
  background: none;
  border: none;
  color: rgba(0, 234, 255, 0.6);
  font-size: 10px;
  cursor: pointer;
  padding: 0;
}
.ply-ctrl-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ply-ctrl-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ply-ctrl-label {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  min-width: 42px;
}
.ply-ctrl-val {
  font-size: 11px;
  color: #00d4ff;
  min-width: 20px;
  text-align: right;
}
.ply-range {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  background: rgba(0, 186, 255, 0.2);
  border-radius: 2px;
  outline: none;
}
.ply-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
}
.ply-select {
  flex: 1;
  background: rgba(0, 40, 80, 0.8);
  border: 1px solid rgba(0, 186, 255, 0.3);
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
  padding: 3px 6px;
  cursor: pointer;
  outline: none;
}
.ply-select:focus { border-color: #00d4ff; }
.ply-select option { background: #0f2d55; }

.ply-check-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  user-select: none;
}
.ply-check-label input[type="checkbox"] {
  accent-color: #00d4ff;
}

.ply-ctrl-views {
  flex-wrap: wrap;
  gap: 4px;
}
.ply-view-btn {
  padding: 3px 7px;
  border-radius: 4px;
  border: 1px solid rgba(0, 186, 255, 0.3);
  background: rgba(0, 60, 100, 0.5);
  color: rgba(255,255,255,0.7);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.ply-view-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  color: #fff;
}
.ply-view-btn--primary {
  background: rgba(0, 150, 200, 0.3);
  color: #00eaff;
}
.ply-view-btn--primary:hover {
  background: rgba(0, 212, 255, 0.35);
}

.ply-upload-link {
  font-size: 11px;
  color: rgba(0, 212, 255, 0.7);
  cursor: pointer;
  padding: 3px 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s;
}
.ply-upload-link:hover { color: #00d4ff; }

/* Info badge */
.ply-info-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(5, 16, 40, 0.85);
  border: 1px solid rgba(0, 186, 255, 0.2);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  color: rgba(0, 212, 255, 0.8);
  z-index: 10;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

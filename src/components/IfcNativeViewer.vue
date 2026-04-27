<template>
  <div class="ifc-native-viewer" ref="containerRef">
    <!-- Canvas 层 -->
    <canvas ref="canvasRef" class="ifc-native-canvas" />

    <!-- 加载中遮罩 -->
    <transition name="fade">
      <div v-if="loading" class="ifc-overlay">
        <div class="ifc-spinner" />
        <p class="ifc-overlay-text">{{ loadingText }}</p>
      </div>
    </transition>

    <!-- 错误提示 -->
    <transition name="fade">
      <div v-if="errorMsg" class="ifc-overlay ifc-error-overlay">
        <p class="ifc-error-text">⚠ {{ errorMsg }}</p>
        <button class="ifc-retry-btn" @click="retryLoad">重试</button>
      </div>
    </transition>

    <!-- 底部工具栏 -->
    <div v-if="modelLoaded && !errorMsg" class="ifc-toolbar">
      <button class="ifc-tool-btn" @click="resetCamera" title="重置视角">🏠 重置</button>
      <button class="ifc-tool-btn" @click="toggleWireframe" :class="{ active: wireframe }">线框</button>
      <button class="ifc-tool-btn" @click="fitAll">自适应</button>
      <span class="ifc-tool-sep" />
      <span class="ifc-tool-info">{{ meshCount }} 构件</span>
    </div>

    <!-- 构件列表面板（左侧抽屉） -->
    <transition name="slide-left">
      <div v-if="showElementList && elementList.length > 0" class="ifc-element-panel">
        <div class="ifc-panel-head">
          <span>构件列表</span>
          <span class="ifc-panel-count">{{ elementList.length }}</span>
          <button class="ifc-panel-close" @click="showElementList = false">×</button>
        </div>
        <div class="ifc-panel-search">
          <input v-model="elementFilter" placeholder="搜索构件名称 / 类型…" class="ifc-search-input" />
        </div>
        <div class="ifc-panel-list">
          <div
            v-for="el in filteredElements"
            :key="el.expressID"
            class="ifc-element-item"
            :class="{ selected: selectedId === el.expressID }"
            @click="onElementClick(el)"
            @dblclick="onElementDblClick(el)"
          >
            <span class="ifc-el-type">{{ el.typeName }}</span>
            <span class="ifc-el-name">{{ el.name || `ID ${el.expressID}` }}</span>
            <span class="ifc-el-id">#{{ el.expressID }}</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- 展开列表按钮（列表隐藏时显示） -->
    <button
      v-if="modelLoaded && elementList.length > 0 && !showElementList"
      class="ifc-list-toggle"
      @click="showElementList = true"
    >
      📋 构件列表 ({{ elementList.length }})
    </button>

    <!-- 构件信息浮层 -->
    <transition name="fade">
      <div v-if="hoveredElement" class="ifc-tooltip">
        <div class="ifc-tooltip-type">{{ hoveredElement.typeName }}</div>
        <div class="ifc-tooltip-id">#{{ hoveredElement.expressID }}</div>
        <div v-if="hoveredElement.name" class="ifc-tooltip-name">{{ hoveredElement.name }}</div>
      </div>
    </transition>
  </div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { IfcModelLoader, IFC_TYPES } from '@/utils/IfcModelLoader.js'

// IFC 类型 ID → 中文名称映射
const IFC_TYPE_NAMES = {
  [IFC_TYPES.COLUMN]:          '柱',
  [IFC_TYPES.BEAM]:            '梁',
  [IFC_TYPES.SLAB]:            '板',
  [IFC_TYPES.WALL]:            '墙',
  [IFC_TYPES.WALL_STANDARD]:   '标准墙',
  [IFC_TYPES.DOOR]:            '门',
  [IFC_TYPES.DOOR_STANDARD]:   '标准门',
  [IFC_TYPES.WINDOW]:          '窗',
  [IFC_TYPES.WINDOW_STANDARD]: '标准窗',
  [IFC_TYPES.ROOF]:            '屋顶',
  [IFC_TYPES.RAMP]:            '坡道',
  [IFC_TYPES.RAMP_FLIGHT]:     '坡道梯段',
  [IFC_TYPES.STAIR]:           '楼梯',
  [IFC_TYPES.STAIR_FLIGHT]:    '楼梯梯段',
  [IFC_TYPES.BUILDING]:        '建筑',
  [IFC_TYPES.BUILDING_STOREY]: '楼层',
  [IFC_TYPES.ELEMENT]:         '构件',
  [IFC_TYPES.PROXY]:           '代理',
  [IFC_TYPES.BRIDGE]:          '桥梁',
  [IFC_TYPES.RAIL]:            '轨道',
  [IFC_TYPES.ROAD]:            '道路',
}

function getTypeName(typeID) {
  return IFC_TYPE_NAMES[typeID] || `Type#${typeID}`
}

export default {
  name: 'IfcNativeViewer',
  props: {
    // IFC 文件 URL
    ifcUrl: { type: String, default: '' },
    // 是否启用点击拾取
    enablePick: { type: Boolean, default: true },
    // 是否显示左侧构件列表
    showElementList: { type: Boolean, default: false },
    // 是否显示操作提示
    showHints: { type: Boolean, default: true },
    // 背景色
    backgroundColor: { type: Number, default: 0x051020 },
    // 选中高亮色
    highlightColor: { type: Number, default: 0x00d4ff },
    // 是否多选
    multiSelectMode: { type: Boolean, default: false },
  },
  data() {
    return {
      loading:        false,
      loadingText:    '加载模型…',
      errorMsg:       '',
      modelLoaded:    false,
      meshCount:      0,
      wireframe:      false,
      elementList:   [],   // [{ expressID, name, typeName }]
      showElementList: false,
      elementFilter: '',
      selectedId:    null,
      hoveredElement: null,
      _loader:       null,
      _scene:        null,
      _camera:       null,
      _renderer:     null,
      _controls:     null,
      _ifcGroup:     null,
      _animId:       null,
      _raycaster:    new THREE.Raycaster(),
      _mouse:        new THREE.Vector2(),
      _resizeObserver: null,
      _prevMaterialMap: new Map(), // expressID → original material
      _originMaterials: new Map(), // expressID → saved material
    }
  },
  computed: {
    filteredElements() {
      const q = this.elementFilter.toLowerCase()
      if (!q) return this.elementList
      return this.elementList.filter(el =>
        (el.name || '').toLowerCase().includes(q) ||
        (el.typeName || '').toLowerCase().includes(q) ||
        String(el.expressID).includes(q)
      )
    },
  },
  watch: {
    ifcUrl(url) {
      if (url) this.loadModel(url)
    },
  },
  mounted() {
    this._initThree()
    this._addEventListeners()
    if (this.ifcUrl) this.loadModel(this.ifcUrl)
  },
  beforeDestroy() {
    this._cleanup()
  },
  methods: {
    // ────────────────────────────────────────────────────────────
    //  Three.js 初始化
    // ────────────────────────────────────────────────────────────
    _initThree() {
      const container = this.$refs.containerRef
      const canvas    = this.$refs.canvasRef
      const w = container.clientWidth  || 800
      const h = container.clientHeight || 600

      // Scene
      this._scene = new THREE.Scene()
      this._scene.background = new THREE.Color(this.backgroundColor)

      // 添加光照
      const ambient = new THREE.AmbientLight(0xffffff, 0.55)
      this._scene.add(ambient)
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9)
      dirLight.position.set(100, 200, 100)
      this._scene.add(dirLight)
      const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4)
      this._scene.add(hemiLight)

      // Camera（透视）
      this._camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100000)
      this._camera.position.set(0, 50, 100)

      // Renderer
      this._renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      this._renderer.setSize(w, h)
      this._renderer.shadowMap.enabled = false

      // Controls
      this._controls = new OrbitControls(this._camera, canvas)
      this._controls.enableDamping  = true
      this._controls.dampingFactor  = 0.08
      this._controls.screenSpacePanning = true
      this._controls.minDistance    = 0.5
      this._controls.maxDistance    = 50000

      // 自动适应容器大小
      this._resizeObserver = new ResizeObserver(() => this._onResize())
      this._resizeObserver.observe(container)

      // 开始渲染循环
      this._animate()
    },

    _animate() {
      this._animId = requestAnimationFrame(() => this._animate())
      this._controls.update()
      this._renderer.render(this._scene, this._camera)
    },

    _onResize() {
      const container = this.$refs.containerRef
      if (!container || !this._renderer) return
      const w = container.clientWidth
      const h = container.clientHeight
      this._camera.aspect = w / h
      this._camera.updateProjectionMatrix()
      this._renderer.setSize(w, h)
    },

    // ────────────────────────────────────────────────────────────
    //  IFC 模型加载
    // ────────────────────────────────────────────────────────────
    async loadModel(url) {
      if (!url) return
      if (!this._scene) return
      this.loading    = true
      this.loadingText = '加载模型…'
      this.errorMsg   = ''
      this.modelLoaded = false

      try {
        // 初始化加载器（如果尚未 init）
        if (!this._loader) {
          this._loader = new IfcModelLoader({
            wasmPath: '/wasm',
            onlyStructural: true,
          })
        }

        // 移除旧模型
        this._removeCurrentModel()

        this.loadingText = '解析 IFC…'
        const group = await this._loader.loadFromURL(url)

        this.loadingText = '构建渲染…'
        this._ifcGroup   = group
        this._scene.add(group)

        // 收集构件列表
        this._buildElementList()

        // 更新状态
        this.meshCount   = this.elementList.length
        this.modelLoaded = true
        this.loading     = false

        // 自动适应视角
        this.$nextTick(() => this.fitAll())

        this.$emit('model-loaded', { elementCount: this.meshCount })

      } catch (err) {
        console.error('[IfcNativeViewer] loadModel error:', err)
        this.loading  = false
        this.errorMsg = err.message || '模型加载失败'
      }
    },

    retryLoad() {
      this.errorMsg = ''
      if (this.ifcUrl) this.loadModel(this.ifcUrl)
    },

    // ────────────────────────────────────────────────────────────
    //  构件列表构建
    // ────────────────────────────────────────────────────────────
    _buildElementList() {
      if (!this._ifcGroup) return
      const seen = new Set()
      const list = []

      this._ifcGroup.traverse(child => {
        if (!child.isMesh) return
        const eid = child.userData.expressID
        if (eid == null || seen.has(eid)) return
        seen.add(eid)

        // 尝试从 userData / geometry 获取属性
        const typeID  = child.userData.typeID || 0
        const props   = this._loader ? this._loader.getElementProperties(eid) : null
        const name    = props ? (props.Name && props.Name.value) || props.Name || '' : ''
        list.push({
          expressID: eid,
          name:      String(name),
          typeID,
          typeName:  getTypeName(typeID),
        })
      })

      // 按 expressID 排序（稳定顺序）
      list.sort((a, b) => a.expressID - b.expressID)
      this.elementList = list
    },

    // ────────────────────────────────────────────────────────────
    //  鼠标拾取
    // ────────────────────────────────────────────────────────────
    _addEventListeners() {
      const canvas = this.$refs.canvasRef
      if (!canvas) return
      canvas.addEventListener('click',       this._onClick)
      canvas.addEventListener('dblclick',    this._onDblClick)
      canvas.addEventListener('mousemove',   this._onMouseMove)
    },

    _removeEventListeners() {
      const canvas = this.$refs.canvasRef
      if (!canvas) return
      canvas.removeEventListener('click',      this._onClick)
      canvas.removeEventListener('dblclick',   this._onDblClick)
      canvas.removeEventListener('mousemove',  this._onMouseMove)
    },

    _updateMouse(event) {
      const canvas = this.$refs.canvasRef
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      this._mouse.x =  ((event.clientX - rect.left)  / rect.width)  * 2 - 1
      this._mouse.y = -((event.clientY - rect.top)   / rect.height) * 2 + 1
    },

    _raycast() {
      if (!this.enablePick || !this._ifcGroup) return null
      this._raycaster.setFromCamera(this._mouse, this._camera)
      const hits = this._raycaster.intersectObject(this._ifcGroup, true)
      if (!hits.length) return null

      const hit = hits[0]
      const mesh = hit.object

      // 优先从 per-vertex expressID 属性取
      let eid = null
      if (mesh.geometry && mesh.geometry.getAttribute) {
        const attr = mesh.geometry.getAttribute('expressID')
        if (attr && attr.array && attr.array.length > 0) {
          eid = attr.array[0]
        }
      }
      if (eid == null) eid = mesh.userData.expressID

      const el = this.elementList.find(x => x.expressID === eid) || {
        expressID: eid,
        name:      '',
        typeID:    mesh.userData.typeID || 0,
        typeName:  getTypeName(mesh.userData.typeID || 0),
      }

      return { hit, mesh, expressID: eid, element: el }
    },

    _onClick(event) {
      if (!this.enablePick) return
      this._updateMouse(event)
      const result = this._raycast()
      if (!result) {
        this._clearSelection()
        return
      }

      const { expressID, element } = result

      if (this.multiSelectMode) {
        this._toggleMultiSelect(expressID)
      } else {
        this._setSelection(expressID)
      }

      this.$emit('element-click', element)
    },

    _onDblClick(event) {
      if (!this.enablePick) return
      this._updateMouse(event)
      const result = this._raycast()
      if (!result) return
      const { expressID, element } = result

      // 高亮选中构件
      this._setSelection(expressID)

      this.$emit('element-dblclick', element)
    },

    _onMouseMove(event) {
      if (!this.enablePick) return
      this._updateMouse(event)
      const result = this._raycast()
      if (!result) {
        this.hoveredElement = null
        this._renderer.domElement.style.cursor = 'default'
        return
      }
      this.hoveredElement = result.element
      this._renderer.domElement.style.cursor = 'pointer'
    },

    // ────────────────────────────────────────────────────────────
    //  高亮 / 选中
    // ────────────────────────────────────────────────────────────
    _setSelection(expressID) {
      // 取消之前选中
      this._clearSelection()

      const mesh = this._findMeshByExpressID(expressID)
      if (!mesh) return

      // 保存原始材质
      this._originMaterials.set(expressID, mesh.material)

      // 高亮材质
      mesh.material = new THREE.MeshPhongMaterial({
        color:     this.highlightColor,
        emissive:  new THREE.Color(this.highlightColor).multiplyScalar(0.35),
        transparent: true,
        opacity:   0.85,
        depthTest: true,
      })

      this.selectedId = expressID
    },

    _clearSelection() {
      if (this.selectedId != null) {
        this._restoreMaterial(this.selectedId)
        this.selectedId = null
      }
    },

    _toggleMultiSelect(expressID) {
      const isSelected = this.selectedId === expressID
      if (isSelected) {
        this._restoreMaterial(expressID)
        this.selectedId = null
      } else {
        this._setSelection(expressID)
      }
    },

    _restoreMaterial(expressID) {
      const original = this._originMaterials.get(expressID)
      const mesh    = this._findMeshByExpressID(expressID)
      if (mesh && original) {
        mesh.material = original
        this._originMaterials.delete(expressID)
      }
    },

    _findMeshByExpressID(expressID) {
      if (!this._ifcGroup) return null
      let found = null
      this._ifcGroup.traverse(child => {
        if (found) return
        if (child.isMesh && child.userData.expressID === expressID) {
          found = child
        }
      })
      return found
    },

    // ────────────────────────────────────────────────────────────
    //  外部调用兼容 API（供 ComponentManager 等调用）
    // ────────────────────────────────────────────────────────────

    /**
     * 高亮指定 expressID 的构件（兼容 AdvancedIfcViewer API）
     * @param {number} expressID
     */
    highlightElement(expressID) {
      this._clearSelection()
      this._setSelection(Number(expressID))
    },

    /**
     * 重新加载当前 IFC（兼容 AdvancedIfcViewer API）
     */
    reload() {
      if (this.ifcUrl) this.loadModel(this.ifcUrl)
    },

    // ────────────────────────────────────────────────────────────
    //  构件列表点击
    // ────────────────────────────────────────────────────────────
    onElementClick(el) {
      this._setSelection(el.expressID)
      this.$emit('element-click', el)
    },

    onElementDblClick(el) {
      this._setSelection(el.expressID)
      this.$emit('element-dblclick', el)
    },

    // ────────────────────────────────────────────────────────────
    //  工具栏操作
    // ────────────────────────────────────────────────────────────
    resetCamera() {
      this._camera.position.set(0, 50, 100)
      this._camera.lookAt(0, 0, 0)
      this._controls.target.set(0, 0, 0)
      this._controls.update()
    },

    fitAll() {
      if (!this._ifcGroup) return
      const box    = new THREE.Box3().setFromObject(this._ifcGroup)
      const center = new THREE.Vector3()
      const size   = new THREE.Vector3()
      box.getCenter(center)
      box.getSize(size)
      this._scene.remove(this._ifcGroup) // 临时移除以免干扰计算
      const newBox = new THREE.Box3().setFromObject(this._ifcGroup)
      newBox.getCenter(center)
      newBox.getSize(size)
      this._scene.add(this._ifcGroup)
      const maxDim = Math.max(size.x, size.y, size.z)
      const dist   = maxDim * 1.8
      this._camera.position.set(center.x + dist * 0.5, center.y + dist * 0.4, center.z + dist)
      this._controls.target.copy(center)
      this._controls.update()
    },

    toggleWireframe() {
      this.wireframe = !this.wireframe
      if (!this._ifcGroup) return
      this._ifcGroup.traverse(child => {
        if (child.isMesh && child.material && !child.material.isLineBasicMaterial) {
          child.material.wireframe = this.wireframe
        }
      })
    },

    // ────────────────────────────────────────────────────────────
    //  清理
    // ────────────────────────────────────────────────────────────
    _removeCurrentModel() {
      if (this._ifcGroup && this._scene) {
        this._scene.remove(this._ifcGroup)
        this._ifcGroup.traverse(child => {
          if (child.isMesh) {
            child.geometry && child.geometry.dispose()
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
              else child.material.dispose()
            }
          }
        })
        this._ifcGroup = null
      }
      this.selectedId     = null
      this.hoveredElement = null
      this.elementList   = []
      this.meshCount     = 0
      this.modelLoaded   = false
      this._originMaterials.clear()
    },

    _cleanup() {
      if (this._animId)          cancelAnimationFrame(this._animId)
      if (this._resizeObserver)  this._resizeObserver.disconnect()
      this._removeEventListeners()
      this._removeCurrentModel()
      if (this._loader) { this._loader.destroy(); this._loader = null }
      if (this._renderer)       { this._renderer.dispose(); this._renderer = null }
      if (this._controls)       { this._controls.dispose(); this._controls = null }
    },
  },
}
</script>

<style lang="scss" scoped>
.ifc-native-viewer {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  user-select: none;
}

.ifc-native-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* 加载 / 错误遮罩 */
.ifc-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(5, 16, 32, 0.82);
  gap: 16px;
  z-index: 10;
}
.ifc-error-overlay {
  background: rgba(5, 16, 32, 0.90);
}
.ifc-spinner {
  width: 42px;
  height: 42px;
  border: 3px solid rgba(0, 212, 255, 0.25);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: ifc-spin 0.85s linear infinite;
}
@keyframes ifc-spin {
  to { transform: rotate(360deg); }
}
.ifc-overlay-text {
  color: rgba(0, 212, 255, 0.85);
  font-size: 14px;
  font-family: 'Microsoft YaHei', sans-serif;
  margin: 0;
}
.ifc-error-text {
  color: #ff6b6b;
  font-size: 14px;
  font-family: 'Microsoft YaHei', sans-serif;
  margin: 0 0 12px;
}
.ifc-retry-btn {
  padding: 8px 20px;
  border: 1px solid #00d4ff;
  background: transparent;
  color: #00d4ff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Microsoft YaHei', sans-serif;
  &:hover { background: rgba(0, 212, 255, 0.12); }
}

/* 底部工具栏 */
.ifc-toolbar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(5, 16, 32, 0.88);
  border: 1px solid rgba(0, 212, 255, 0.25);
  border-radius: 22px;
  backdrop-filter: blur(6px);
  z-index: 5;
}
.ifc-tool-btn {
  padding: 5px 12px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.80);
  font-size: 12px;
  font-family: 'Microsoft YaHei', sans-serif;
  cursor: pointer;
  border-radius: 14px;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(0, 212, 255, 0.18); color: #00d4ff; }
  &.active { background: rgba(0, 212, 255, 0.25); color: #00d4ff; }
}
.ifc-tool-sep {
  width: 1px;
  height: 16px;
  background: rgba(255,255,255,0.15);
  margin: 0 4px;
}
.ifc-tool-info {
  font-size: 12px;
  color: rgba(0, 212, 255, 0.65);
  font-family: 'Microsoft YaHei', sans-serif;
  padding: 0 4px;
}

/* 构件列表面板 */
.ifc-element-panel {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: rgba(5, 16, 32, 0.95);
  border-right: 1px solid rgba(0, 212, 255, 0.20);
  display: flex;
  flex-direction: column;
  z-index: 6;
  backdrop-filter: blur(8px);
}
.ifc-panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.15);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  font-family: 'Microsoft YaHei', sans-serif;
}
.ifc-panel-count {
  margin-left: auto;
  background: rgba(0, 212, 255, 0.18);
  color: #00d4ff;
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 11px;
}
.ifc-panel-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  &:hover { color: #fff; }
}
.ifc-panel-search {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.10);
}
.ifc-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  border: 1px solid rgba(0, 212, 255, 0.25);
  border-radius: 4px;
  background: rgba(0, 212, 255, 0.07);
  color: #fff;
  font-size: 12px;
  font-family: 'Microsoft YaHei', sans-serif;
  outline: none;
  &::placeholder { color: rgba(255,255,255,0.35); }
  &:focus { border-color: rgba(0, 212, 255, 0.5); }
}
.ifc-panel-list {
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0, 212, 255, 0.3); border-radius: 2px; }
}
.ifc-element-item {
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.12s;
  &:hover { background: rgba(0, 212, 255, 0.10); }
  &.selected { background: rgba(0, 212, 255, 0.18); }
}
.ifc-el-type {
  font-size: 11px;
  color: rgba(0, 212, 255, 0.70);
  font-family: 'Microsoft YaHei', sans-serif;
}
.ifc-el-name {
  font-size: 12px;
  color: rgba(255,255,255,0.85);
  font-family: 'Microsoft YaHei', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ifc-el-id {
  font-size: 10px;
  color: rgba(255,255,255,0.30);
  font-family: 'Courier New', monospace;
}

/* 列表展开按钮 */
.ifc-list-toggle {
  position: absolute;
  left: 12px;
  top: 12px;
  padding: 6px 12px;
  border: 1px solid rgba(0, 212, 255, 0.30);
  background: rgba(5, 16, 32, 0.85);
  color: #00d4ff;
  font-size: 12px;
  border-radius: 16px;
  cursor: pointer;
  font-family: 'Microsoft YaHei', sans-serif;
  backdrop-filter: blur(4px);
  z-index: 5;
  &:hover { background: rgba(0, 212, 255, 0.15); }
}

/* 信息浮层 */
.ifc-tooltip {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 8px 12px;
  background: rgba(5, 16, 32, 0.92);
  border: 1px solid rgba(0, 212, 255, 0.30);
  border-radius: 6px;
  z-index: 8;
  backdrop-filter: blur(6px);
  pointer-events: none;
}
.ifc-tooltip-type {
  font-size: 11px;
  color: rgba(0, 212, 255, 0.75);
  font-family: 'Microsoft YaHei', sans-serif;
}
.ifc-tooltip-id {
  font-size: 12px;
  color: rgba(255,255,255,0.70);
  font-family: 'Courier New', monospace;
}
.ifc-tooltip-name {
  font-size: 12px;
  color: #fff;
  font-family: 'Microsoft YaHei', sans-serif;
  margin-top: 2px;
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.slide-left-enter-active, .slide-left-leave-active { transition: transform 0.25s ease; }
.slide-left-enter-from                          { transform: translateX(-100%); }
.slide-left-leave-to                            { transform: translateX(-100%); }
</style>

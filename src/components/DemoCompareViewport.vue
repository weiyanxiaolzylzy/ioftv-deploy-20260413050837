<template>
  <div class="demo-compare">
    <div ref="canvasHost" class="demo-canvas"></div>
    <div v-if="loading" class="demo-overlay">正在提取 IFC 尺寸...</div>
    <div v-else-if="error" class="demo-overlay demo-overlay--error">{{ error }}</div>
    <div class="demo-stats">
      <div class="stats-card stats-card--ifc">
        <div class="stats-title">绿色 IFC</div>
        <div class="stats-size">{{ formatSize(ifcSize) }}</div>
      </div>
      <div class="stats-card stats-card--point">
        <div class="stats-title">红色 点云模拟</div>
        <div class="stats-size">{{ formatSize(pointCloudSize) }}</div>
      </div>
      <div class="stats-card stats-card--delta">
        <div class="stats-title">XYZ 偏差</div>
        <div class="stats-size">{{ formatDelta(deltaSize) }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const POINT_CLOUD_SIZE = Object.freeze({
  x: 1569,
  y: 313,
  z: 3065
})

export default {
  name: 'DemoCompareViewport',
  data() {
    return {
      loading: true,
      error: '',
      ifcSize: null,
      pointCloudSize: POINT_CLOUD_SIZE,
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      frameId: 0,
      resizeObserver: null,
      ifcMesh: null,
      pointMesh: null
    }
  },
  computed: {
    deltaSize() {
      if (!this.ifcSize) return null
      return {
        x: Number((this.pointCloudSize.x - this.ifcSize.x).toFixed(1)),
        y: Number((this.pointCloudSize.y - this.ifcSize.y).toFixed(1)),
        z: Number((this.pointCloudSize.z - this.ifcSize.z).toFixed(1))
      }
    }
  },
  mounted() {
    this.initScene()
    this.fetchIfcBounds()
  },
  beforeDestroy() {
    this.disposeScene()
  },
  methods: {
    async fetchIfcBounds() {
      this.loading = true
      this.error = ''
      try {
        const res = await axios.get('/api/demo/ifc-bounds')
        const payload = res && res.data ? res.data : res
        if (!payload || !payload.success || !payload.data || !payload.data.size) {
          throw new Error('演示 IFC 尺寸返回无效')
        }
        this.ifcSize = payload.data.size
        this.buildCompareMeshes()
      } catch (error) {
        console.error('[DemoCompareViewport] load failed:', error)
        this.error = '演示模型尺寸读取失败'
      } finally {
        this.loading = false
      }
    },
    initScene() {
      const host = this.$refs.canvasHost
      if (!host) return

      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0x08182c)

      const width = Math.max(host.clientWidth, 320)
      const height = Math.max(host.clientHeight, 240)
      this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100000)
      this.camera.position.set(2600, 1700, 3200)

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      this.renderer.setSize(width, height)
      host.appendChild(this.renderer.domElement)

      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.08
      this.controls.target.set(0, 900, 0)

      const ambient = new THREE.AmbientLight(0xffffff, 0.8)
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.1)
      keyLight.position.set(2200, 2800, 1800)
      const fillLight = new THREE.DirectionalLight(0x7dd8ff, 0.45)
      fillLight.position.set(-1800, 900, -1200)
      this.scene.add(ambient, keyLight, fillLight)

      const axes = new THREE.AxesHelper(2200)
      this.scene.add(axes)

      const grid = new THREE.GridHelper(5000, 20, 0x255d91, 0x14314f)
      grid.position.y = -10
      this.scene.add(grid)

      this.resizeObserver = new ResizeObserver(() => this.handleResize())
      this.resizeObserver.observe(host)

      this.animate()
    },
    buildCompareMeshes() {
      if (!this.scene || !this.ifcSize) return

      if (this.ifcMesh) {
        this.scene.remove(this.ifcMesh)
        this.ifcMesh.geometry.dispose()
        this.ifcMesh.material.dispose()
        this.ifcMesh = null
      }
      if (this.pointMesh) {
        this.scene.remove(this.pointMesh)
        this.pointMesh.geometry.dispose()
        this.pointMesh.material.dispose()
        this.pointMesh = null
      }

      const ifcGeometry = new THREE.BoxGeometry(this.ifcSize.x, this.ifcSize.y, this.ifcSize.z)
      const ifcMaterial = new THREE.MeshPhongMaterial({
        color: 0x32ff9c,
        transparent: true,
        opacity: 0.35,
        emissive: 0x0d4f34,
        side: THREE.DoubleSide
      })
      this.ifcMesh = new THREE.Mesh(ifcGeometry, ifcMaterial)
      this.ifcMesh.position.set(0, this.ifcSize.y / 2, 0)
      this.scene.add(this.ifcMesh)

      const pointGeometry = new THREE.BoxGeometry(this.pointCloudSize.x, this.pointCloudSize.y, this.pointCloudSize.z)
      const pointMaterial = new THREE.MeshPhongMaterial({
        color: 0xff5a5a,
        transparent: true,
        opacity: 0.26,
        emissive: 0x5a1717,
        side: THREE.DoubleSide
      })
      this.pointMesh = new THREE.Mesh(pointGeometry, pointMaterial)
      this.pointMesh.position.set(0, this.pointCloudSize.y / 2, 0)
      this.scene.add(this.pointMesh)

      const largest = Math.max(
        this.ifcSize.x, this.ifcSize.y, this.ifcSize.z,
        this.pointCloudSize.x, this.pointCloudSize.y, this.pointCloudSize.z
      )
      const distance = largest * 1.6
      this.camera.position.set(distance * 0.95, distance * 0.62, distance * 1.08)
      this.controls.target.set(0, Math.max(this.ifcSize.y, this.pointCloudSize.y) / 2, 0)
      this.controls.update()
    },
    animate() {
      this.frameId = requestAnimationFrame(this.animate)
      if (this.controls) this.controls.update()
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera)
      }
    },
    handleResize() {
      const host = this.$refs.canvasHost
      if (!host || !this.camera || !this.renderer) return
      const width = Math.max(host.clientWidth, 320)
      const height = Math.max(host.clientHeight, 240)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(width, height)
    },
    disposeScene() {
      cancelAnimationFrame(this.frameId)
      if (this.resizeObserver && this.$refs.canvasHost) {
        this.resizeObserver.unobserve(this.$refs.canvasHost)
      }
      if (this.controls) {
        this.controls.dispose()
        this.controls = null
      }
      if (this.renderer) {
        this.renderer.dispose()
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
        }
        this.renderer = null
      }
      this.scene = null
      this.camera = null
    },
    formatSize(size) {
      if (!size) return '—'
      return `X ${Math.round(size.x)} / Y ${Math.round(size.y)} / Z ${Math.round(size.z)}`
    },
    formatDelta(size) {
      if (!size) return '—'
      const format = (value) => (value >= 0 ? `+${value}` : `${value}`)
      return `X ${format(size.x)} / Y ${format(size.y)} / Z ${format(size.z)}`
    }
  }
}
</script>

<style lang="scss" scoped>
.demo-compare {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  background:
    radial-gradient(circle at top, rgba(0, 190, 255, 0.12), transparent 42%),
    linear-gradient(180deg, rgba(8, 24, 44, 0.96), rgba(6, 18, 32, 0.98));
}

.demo-canvas {
  width: 100%;
  height: 100%;
}

.demo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: rgba(230, 246, 255, 0.9);
  background: rgba(7, 18, 34, 0.66);
  backdrop-filter: blur(4px);
}

.demo-overlay--error {
  color: #ff8f8f;
}

.demo-stats {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  pointer-events: none;
}

.stats-card {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(5, 14, 28, 0.78);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.26);
}

.stats-card--ifc {
  border-color: rgba(50, 255, 156, 0.35);
}

.stats-card--point {
  border-color: rgba(255, 90, 90, 0.35);
}

.stats-card--delta {
  border-color: rgba(0, 190, 255, 0.28);
}

.stats-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(185, 220, 255, 0.82);
  margin-bottom: 6px;
}

.stats-size {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.4px;
}
</style>

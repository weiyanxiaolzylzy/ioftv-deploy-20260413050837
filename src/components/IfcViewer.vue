<template>
  <div ref="ifcContainer" class="ifc-container">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
import { IFCLoader } from "web-ifc-three/IFCLoader";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default {
  name: 'IfcViewer',
  props: {
    ifcUrl: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      scene: null,
      camera: null,
      renderer: null,
      ifcLoader: null,
      controls: null,
      model: null,
      renderHandler: null,
      resizeObserver: null
    };
  },
  mounted() {
    this.initThree();
    this.loadIfc();
  },
  beforeDestroy() {
    this.dispose();
  },
  watch: {
    ifcUrl(newUrl) {
      if (newUrl) {
        this.clearScene();
        this.loadIfc();
      }
    }
  },
  methods: {
    initThree() {
      const container = this.$refs.ifcContainer;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xa0a0a0);
      this.scene.fog = new THREE.Fog(0xa0a0a0, 10, 500);

      // Camera
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.set(0, 10, 20);
      this.camera.lookAt(0, 0, 0);

      // Lights
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
      hemiLight.position.set(0, 20, 0);
      this.scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xffffff);
      dirLight.position.set(3, 10, 10);
      this.scene.add(dirLight);

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
      container.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = false;
      this.controls.enablePan = true;
      this.renderHandler = () => this.renderFrame();
      this.controls.addEventListener('change', this.renderHandler);

      // Grid
      const grid = new THREE.GridHelper(50, 50);
      this.scene.add(grid);
      
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
        this.resizeObserver.observe(container);
      } else {
        window.addEventListener('resize', this.onWindowResize);
      }

      this.renderFrame();
    },

    async loadIfc() {
      this.loading = true;
      this.error = null;
      
      try {
        if (!this.ifcLoader) {
          this.ifcLoader = new IFCLoader();
          await this.ifcLoader.ifcManager.setWasmPath("../../../wasm/");
        }

        this.clearScene();
        const model = await this.ifcLoader.loadAsync(this.ifcUrl);
        this.model = model;
        this.scene.add(model);
        this.loading = false;
        this.fitView(model);
        this.renderFrame();
      } catch (err) {
        console.error("Error loading IFC:", err);
        this.error = "加载 IFC 文件失败: " + err.message;
        this.loading = false;
      }
    },

    clearScene() {
      if (this.model && this.scene) {
        this.scene.remove(this.model);
        this.disposeObject(this.model);
      }
      this.model = null;
    },

    renderFrame() {
      if (!this.renderer || !this.scene || !this.camera) return;
      this.renderer.render(this.scene, this.camera);
    },

    onWindowResize() {
      if (!this.camera || !this.renderer) return;
      const container = this.$refs.ifcContainer;
      if (!container) return;
      
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderFrame();
    },

    dispose() {
      this.clearScene();
      if (this.controls && this.renderHandler) {
        this.controls.removeEventListener('change', this.renderHandler);
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      } else {
        window.removeEventListener('resize', this.onWindowResize);
      }
      if (this.renderer) {
        this.renderer.dispose();
      }
      if (this.controls) {
        this.controls.dispose();
      }
      this.renderHandler = null;
      this.controls = null;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
    },

    disposeObject(root) {
      if (!root) return;
      root.traverse((obj) => {
        if (obj && obj.geometry && typeof obj.geometry.dispose === 'function') obj.geometry.dispose();
        if (obj && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m && typeof m.dispose === 'function') m.dispose();
          });
        }
      });
    },

    fitView(model) {
      if (!model || !this.camera || !this.controls) return;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fov = (this.camera.fov * Math.PI) / 180;
      const dist = (maxDim / 2) / Math.tan(fov / 2);
      this.camera.near = Math.max(dist / 100, 0.01);
      this.camera.far = dist * 100;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(center.x + dist, center.y + dist * 0.6, center.z + dist);
      this.controls.target.copy(center);
      this.controls.update();
    }
  }
};
</script>

<style scoped>
.ifc-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.loading, .error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  background: rgba(0,0,0,0.7);
  padding: 10px 20px;
  border-radius: 4px;
}
.error {
  background: rgba(255,0,0,0.7);
}
</style>
